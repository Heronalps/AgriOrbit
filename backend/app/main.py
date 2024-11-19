from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv
import uvicorn
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables from .env file in config folder
env_path = Path(__file__).parents[2] / 'config' / '.env'
load_dotenv(dotenv_path=env_path)
logger.info(f"Loaded environment from {env_path}")

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai_api_key = os.getenv("OPENAI_API_KEY")
openrouter_api_key = os.getenv("OPENROUTER_API_KEY")

if not openrouter_api_key:
    logger.warning("OPENROUTER_API_KEY environment variable is not set. Chat functionality will not work.")

class Message(BaseModel):
    text: str
    context_type: str = "general"  # Can be "general", "farm_selected", or "data_loaded"

@app.options("/chat")
async def options_chat():
    return {"message": "OK"}

@app.post("/chat")
async def chat(message: Message):
    if not openrouter_api_key:
        error_message = "OpenRouter API key is not set. Please add OPENROUTER_API_KEY to your .env file."
        logger.error(error_message)
        raise HTTPException(status_code=500, detail=error_message)

    # Set system prompt based on context type
    system_prompt = "You are AgriBot, a helpful assistant for farmers."
    
    if message.context_type == "farm_selected":
        system_prompt += " The user has selected a farm location. Provide specific agricultural advice for their location."
    elif message.context_type == "data_loaded":
        system_prompt += " The user has loaded farm data. Analyze this data and provide insights."
    else:
        system_prompt += " Provide general farming information and encourage the user to select a farm location or upload data for more specific advice."

    try:
        logger.info(f"Sending request to OpenRouter with context type: {message.context_type}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "AgriOrbit"
                },
                json={
                    "model": "google/gemini-2.5-pro-preview-03-25",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": message.text}
                    ],
                    "max_tokens": 1000,  # Limit response length
                    "temperature": 0.7
                },
                timeout=60.0
            )
            response.raise_for_status()
            
            # Debug output with sensitive data redacted
            logger.info("Received response from OpenRouter")

            openrouter_response = response.json()
            
            # Handle error responses
            if "error" in openrouter_response:
                error_msg = openrouter_response["error"].get("message", "Unknown error")
                logger.error(f"OpenRouter error: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            # Check for valid response format
            if 'choices' not in openrouter_response or len(openrouter_response['choices']) == 0:
                logger.error(f"Unexpected response format: {openrouter_response}")
                raise ValueError("Invalid response format from OpenRouter")
                
            reply_text = openrouter_response['choices'][0]['message']['content']
            return {"response": reply_text}
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"OpenRouter API error: {e.response.text}") from e
    except httpx.RequestError as e:
        logger.error(f"Request error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Network error: {str(e)}") from e
    except Exception as e:
        logger.exception("Unexpected error in chat endpoint")
        raise HTTPException(status_code=500, detail=str(e)) from e

def main():
    """Run the FastAPI app."""
    logger.info("Starting API server")
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8157, reload=True)

if __name__ == "__main__":
    main()