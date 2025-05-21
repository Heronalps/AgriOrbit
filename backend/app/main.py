"""Main FastAPI application for AgriBot, providing chat and API functionalities."""

import json
import logging
import os
from pathlib import Path

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file in config folder
env_path = Path(__file__).parents[2] / "config" / ".env"
load_dotenv(dotenv_path=env_path)
logger.info("Loaded environment from %s", env_path)

# Get allowed origins from environment variable, defaulting to localhost for development
ALLOWED_ORIGINS_STR = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_STR.split(",")]

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Use the configurable list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openrouter_api_key = os.getenv("OPENROUTER_API_KEY")

# Get the application URL from environment variable for the referer header
APP_URL = os.getenv("APP_URL", "http://localhost:3000")  # Default for local dev

if not openrouter_api_key:
    logger.warning(
        "OPENROUTER_API_KEY environment variable is not set. Chat functionality will "
        "not work."
    )

# Default model settings
DEFAULT_MODEL = "opengvlab/internvl3-2b:free"  # Efficient model for most queries
ADVANCED_MODEL = (
    "google/gemini-2.0-flash-exp:free"  # Higher capacity model for complex queries
)
FALLBACK_MODEL = (
    "meta-llama/llama-3.2-3b-instruct:free"  # Fallback model if others fail
)
MAX_TOKENS = 1800  # Slightly reduced to avoid cutoffs at edge cases
TOKEN_SAFETY_MARGIN = 200  # Buffer to prevent hitting limits


class Message(BaseModel):
    """Represents a chat message from the user."""

    text: str
    context_type: str = "general"  # Can be "general", "farm_selected", or "data_loaded"
    use_streaming: bool = True  # Whether to use streaming responses


@app.options("/chat")
async def options_chat():
    """Handle OPTIONS requests for the /chat endpoint, typically for CORS preflight."""
    return {"message": "OK"}


async def generate_streaming_response(client, url, headers, json_data):
    """Generate a streaming response from OpenRouter."""
    async with client.stream(
        "POST", url, headers=headers, json=json_data, timeout=90.0
    ) as response:
        response.raise_for_status()

        # Buffer for accumulating partial chunks
        buffer = ""

        async for chunk in response.aiter_bytes():
            if chunk.strip():
                try:
                    # Parse the SSE format
                    chunk_str = chunk.decode("utf-8")

                    # Add to buffer and process complete lines
                    buffer += chunk_str
                    lines = buffer.split("\n")

                    # Keep the last line which might be incomplete
                    buffer = lines[-1]
                    complete_lines = lines[:-1]

                    for line in complete_lines:
                        if line.startswith("data:") and line.strip() != "data: [DONE]":
                            try:
                                json_str = line[5:].strip()  # Remove 'data: ' prefix
                                if json_str:
                                    chunk_data = json.loads(json_str)
                                    content = (
                                        chunk_data.get("choices", [{}])[0]
                                        .get("delta", {})
                                        .get("content", "")
                                    )
                                    if content:
                                        data_to_yield = {"content": content}
                                        json_string = json.dumps(data_to_yield)
                                        yield f"data: {json_string}\n\n"
                            except json.JSONDecodeError as e:
                                logger.warning(
                                    "Incomplete JSON chunk received: %s. Error: %s",
                                    line,
                                    e,
                                )
                                # Don't yield malformed data
                        elif line.strip() == "data: [DONE]":
                            yield "data: [DONE]\n\n"
                except (ValueError, UnicodeDecodeError) as e:
                    logger.error("Error processing chunk: %s", str(e))
                    continue

        # Clean up any remaining buffer and try to process it
        if buffer.strip():
            try:
                if buffer.startswith("data:") and buffer.strip() != "data: [DONE]":
                    json_str = buffer[5:].strip()
                    if json_str and json_str != "[DONE]":
                        try:
                            chunk_data = json.loads(json_str)
                            content = (
                                chunk_data.get("choices", [{}])[0]
                                .get("delta", {})
                                .get("content", "")
                            )
                            if content:
                                yield f"data: {json.dumps({'content': content})}\n\n"
                        except json.JSONDecodeError:
                            # Skip malformed JSON in final buffer
                            pass
                elif buffer.strip() == "data: [DONE]":
                    yield "data: [DONE]\n\n"
            except (ValueError, UnicodeDecodeError) as e:
                logger.error("Error processing final buffer: %s", str(e))

        if not buffer.strip().endswith("[DONE]"):
            yield "data: [DONE]\n\n"


def select_model(text: str, context_type: str) -> str:
    """
    Select an appropriate LLM model based on the query complexity and context type.

    Args:
        text: The user's input text.
        context_type: The context of the conversation (e.g., "general",
                      "farm_selected", "data_loaded").

    Returns:
        The string identifier of the selected model.
    """
    text_length = len(text)

    # Use advanced model for data analysis or longer queries
    if context_type == "data_loaded" or text_length > 200:
        return ADVANCED_MODEL

    # Use default model for simpler queries
    return DEFAULT_MODEL


@app.post("/chat")
async def chat(message: Message):
    """Handle chat requests and interact with OpenRouter."""
    if not openrouter_api_key:
        error_message = (
            "OpenRouter API key is not set. "
            "Please add OPENROUTER_API_KEY to your .env file."
        )
        logger.error(error_message)
        raise HTTPException(status_code=500, detail=error_message)

    # Set system prompt based on context type
    base_system_prompt = (
        "You are AgriBot, a helpful assistant specialized in agricultural advice and "
        "data interpretation. Provide insightful and actionable farming "
        "recommendations based on location data, soil conditions, and "
        "agricultural metrics."
    )

    if message.context_type == "farm_selected":
        system_prompt = (
            f"{base_system_prompt} The user has selected a farm location. Analyze this "
            "geographical context to provide location-specific agricultural insights "
            "such as suitable crops, regional climate patterns, and local best "
            "practices. When specific values are provided (like NDVI, soil moisture, "
            "etc.), interpret them in practical terms for the farmer."
        )
    elif message.context_type == "data_loaded":
        system_prompt = (
            f"{base_system_prompt} The user has loaded farm data. Analyze the provided "
            "metrics and offer meaningful interpretations. For example, explain what "
            "the values mean for crop health, soil conditions, or irrigation needs. "
            "Translate technical data into practical farming advice. If coordinates "
            "are provided, consider regional agricultural patterns for that location."
        )
    else:
        system_prompt = (
            f"{base_system_prompt} Provide general farming information and encourage "
            "the user to select a farm location on the map for more tailored advice. "
            "Explain the benefits of location-specific agricultural insights."
        )

    # Select appropriate model based on the query
    selected_model = select_model(message.text, message.context_type)
    logger.info(
        "Selected model: %s for context type: %s", selected_model, message.context_type
    )

    headers = {
        "Authorization": f"Bearer {openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": APP_URL,  # Use the configurable APP_URL
        "X-Title": "AgriOrbit",
    }

    # Setup model fallbacks
    models_to_try = [selected_model, FALLBACK_MODEL]

    # Add models parameter for OpenRouter to enable auto-fallbacks
    json_data = {
        "model": selected_model,
        "models": models_to_try,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message.text},
        ],
        "max_tokens": MAX_TOKENS,
        "temperature": 0.7,
    }

    try:
        if message.use_streaming:
            # Handle streaming response
            logger.info(
                "Sending streaming request to OpenRouter with models: %s", models_to_try
            )

            async def stream_response():
                async with httpx.AsyncClient() as client:
                    async for chunk in generate_streaming_response(
                        client,
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers=headers,
                        json_data={**json_data, "stream": True},
                    ):
                        yield chunk

            return StreamingResponse(stream_response(), media_type="text/event-stream")
        else:
            # Handle non-streaming response
            logger.info(
                "Sending non-streaming request to OpenRouter with models: %s",
                models_to_try,
            )

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=json_data,
                    timeout=90.0,
                )
                response.raise_for_status()

                logger.info("Received response from OpenRouter")
                openrouter_response = response.json()

                # Handle error responses
                if "error" in openrouter_response:
                    error_msg = openrouter_response["error"].get(
                        "message", "Unknown error"
                    )
                    logger.error("OpenRouter error: %s", error_msg)
                    raise HTTPException(status_code=400, detail=error_msg)

                # Check for valid response format
                if (
                    "choices" not in openrouter_response
                    or len(openrouter_response["choices"]) == 0
                ):
                    logger.error("Unexpected response format: %s", openrouter_response)
                    raise ValueError("Invalid response format from OpenRouter")

                # Log which model was actually used
                used_model = openrouter_response.get("model", selected_model)
                if used_model != selected_model:
                    logger.info("Fallback model used: %s", used_model)

                reply_text = openrouter_response["choices"][0]["message"]["content"]
                logger.info("Response length: %s characters", len(reply_text))

                return {"response": reply_text}
    except httpx.HTTPStatusError as e:
        logger.error("HTTP error: %s - %s", e.response.status_code, e.response.text)
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"OpenRouter API error: {e.response.text}",
        ) from e
    except httpx.RequestError as e:
        logger.error("Request error: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Network error: {str(e)}") from e
    except ValueError as e:
        logger.exception("Unexpected error in chat endpoint (ValueError): %s", str(e))
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        logger.exception("Unexpected critical error in chat endpoint: %s", str(e))
        raise HTTPException(
            status_code=500, detail=f"An unexpected error occurred: {str(e)}"
        ) from e


def main():
    """Run the FastAPI app."""
    logger.info("Starting API server")
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8157, reload=True)


if __name__ == "__main__":
    main()
