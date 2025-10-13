"""Main FastAPI application for AgriBot, providing chat and API functionalities."""

import json
import logging
import os
from pathlib import Path
from typing import Any, AsyncGenerator

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# region: Logging and Environment Configuration
# ==============================================================================
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file in the config folder
try:
    env_path = Path(__file__).resolve().parents[2] / "config" / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        logger.info("Successfully loaded environment variables from %s.", env_path)
    else:
        logger.info("No .env file found in config folder; using environment variables.")
except Exception as e:
    logger.warning(
        "Could not load .env file. "
        "Ensure you are in the correct working directory. Error: %s",
        e,
    )

# Get allowed origins from environment variable, defaulting to localhost for development
ALLOWED_ORIGINS_STR = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_STR.split(",")]
# endregion

# region: FastAPI Application Setup
# ==============================================================================
app = FastAPI(title="AgriBot API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# endregion

# region: OpenRouter API Configuration and Models
# ==============================================================================
openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
APP_URL = os.getenv("APP_URL", "http://localhost:3000")

if not openrouter_api_key:
    logger.warning(
        "OPENROUTER_API_KEY environment variable is not set. "
        "Chat functionality will not work."
    )

# Model settings
DEFAULT_MODEL = "opengvlab/internvl3-2b:free"
ADVANCED_MODEL = "google/gemini-2.0-flash-exp:free"
FALLBACK_MODEL = "meta-llama/llama-3.2-3b-instruct:free"
MAX_TOKENS = 1800
LONG_QUERY_THRESHOLD = 200
# endregion


# region: Pydantic Models
# ==============================================================================
class Message(BaseModel):
    """Represents a chat message from the user."""

    text: str
    context_type: str = "general"
    use_streaming: bool = True


# endregion


# region: OpenRouter Service Logic
# ==============================================================================
def select_model(text: str, context_type: str) -> str:
    """Selects an appropriate LLM model based on query complexity and context."""
    if context_type == "data_loaded" or len(text) > LONG_QUERY_THRESHOLD:
        return ADVANCED_MODEL
    return DEFAULT_MODEL


def get_system_prompt(context_type: str) -> str:
    """Gets the system prompt based on the conversation context."""
    base_prompt = (
        "You are AgriBot, a helpful assistant specialized in agricultural advice and "
        "data interpretation. Provide insightful and actionable farming "
        "recommendations based on location data, soil conditions, and "
        "agricultural metrics."
    )
    prompts = {
        "farm_selected": f"{base_prompt} The user has selected a farm location...",
        "data_loaded": f"{base_prompt} The user has loaded farm data...",
        "general": f"{base_prompt} Provide general farming information...",
    }
    prompt = prompts.get(context_type, prompts["general"])
    return f"{prompt} All responses must be in English."


def _prepare_request_payload(
    model: str, system_prompt: str, user_text: str, stream: bool
) -> dict[str, Any]:
    """Prepares the JSON payload for the OpenRouter API request."""
    return {
        "model": model,
        "models": [model, FALLBACK_MODEL],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text},
        ],
        "max_tokens": MAX_TOKENS,
        "temperature": 0.7,
        "stream": stream,
    }


def _prepare_headers() -> dict[str, str]:
    """Prepares the headers for the OpenRouter API request."""
    return {
        "Authorization": f"Bearer {openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": APP_URL,
        "X-Title": "AgriOrbit",
    }


async def _process_stream_chunk(chunk: str, buffer: str) -> tuple[str, str]:
    """Processes a single chunk from the streaming response."""
    buffer += chunk
    lines = buffer.split("\n")
    buffer = lines[-1]
    processed_data = ""
    for line in lines[:-1]:
        if line.startswith("data:") and line.strip() != "data: [DONE]":
            try:
                json_str = line[5:].strip()
                if json_str:
                    chunk_data = json.loads(json_str)
                    content = (
                        chunk_data.get("choices", [{}])[0]
                        .get("delta", {})
                        .get("content", "")
                    )
                    if content:
                        data_to_yield = {"content": content}
                        processed_data += f"data: {json.dumps(data_to_yield)}\n\n"
            except json.JSONDecodeError:
                logger.warning("Incomplete JSON chunk received: %s", line)
        elif line.strip() == "data: [DONE]":
            processed_data += "data: [DONE]\n\n"
            break
    return processed_data, buffer


async def generate_streaming_response(
    json_data: dict,
) -> AsyncGenerator[str, None]:
    """Generates a streaming response from OpenRouter."""
    url = "https://openrouter.ai/api/v1/chat/completions"
    try:
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST", url, headers=_prepare_headers(), json=json_data, timeout=90.0
            ) as response:
                response.raise_for_status()
                buffer = ""
                async for chunk in response.aiter_bytes():
                    if chunk.strip():
                        processed_data, buffer = await _process_stream_chunk(
                            chunk.decode("utf-8"), buffer
                        )
                        if processed_data:
                            yield processed_data
                if not buffer.strip().endswith("[DONE]"):
                    yield "data: [DONE]\n\n"
    except httpx.HTTPStatusError as e:
        error_detail = e.response.text or f"Status {e.response.status_code}"
        logger.error(
            "OpenRouter HTTPStatusError: %s - %s", e.response.status_code, error_detail
        )
        error_content = {
            "error": f"OpenRouter API error ({e.response.status_code}): {error_detail}"
        }
        yield f"data: {json.dumps(error_content)}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        logger.error("Unexpected error during streaming: %s", e, exc_info=True)
        error_content = {"error": f"Unexpected error: {e}"}
        yield f"data: {json.dumps(error_content)}\n\n"
        yield "data: [DONE]\n\n"


# endregion


# region: API Endpoints
# ==============================================================================
@app.options("/chat")
async def options_chat():
    """Handles OPTIONS requests for CORS preflight."""
    return {"message": "OK"}


@app.post("/chat")
async def chat(message: Message):
    """Handles chat requests and interacts with OpenRouter."""
    if not openrouter_api_key:
        raise HTTPException(
            status_code=500, detail="OpenRouter API key is not configured."
        )

    try:
        selected_model = select_model(message.text, message.context_type)
        system_prompt = get_system_prompt(message.context_type)
        json_data = _prepare_request_payload(
            selected_model, system_prompt, message.text, message.use_streaming
        )

        logger.info(
            "Sending request to OpenRouter with model: %s (streaming: %s)",
            selected_model,
            message.use_streaming,
        )

        if message.use_streaming:
            return StreamingResponse(
                generate_streaming_response(json_data),
                media_type="text/event-stream",
            )

        # Non-streaming logic
        headers = _prepare_headers()
        url = "https://openrouter.ai/api/v1/chat/completions"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, headers=headers, json=json_data, timeout=90.0
            )
            response.raise_for_status()
            return response.json()

    except httpx.HTTPStatusError as e:
        logger.error("HTTP error: %s - %s", e.response.status_code, e.response.text)
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"OpenRouter API error: {e.response.text}",
        )
    except Exception as e:
        logger.exception("Unexpected critical error in chat endpoint: %s", e)
        raise HTTPException(
            status_code=500, detail=f"An unexpected error occurred: {e}"
        )


# endregion


# region: Main Execution
# ==============================================================================
def main():
    """Runs the FastAPI app."""
    logger.info("Starting API server")
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8157, reload=True)


if __name__ == "__main__":
    main()
# endregion
