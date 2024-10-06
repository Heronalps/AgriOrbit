from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv
import uvicorn

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai_api_key = os.getenv("OPENAI_API_KEY")

class Message(BaseModel):
    text: str

@app.options("/chat")
async def options_chat():
    return {"message": "OK"}

@app.post("/chat")
async def chat(message: Message):
    if not openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key is not set.")

    # Prepare the OpenAI API request
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-3.5-turbo",  # or the model you're using
                    "messages": [{"role": "user", "content": message.text}],
                },
            )
            response.raise_for_status()  # Raise an error for bad responses

        openai_response = response.json()
        reply_text = openai_response['choices'][0]['message']['content']
        return {"response": reply_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def main():
    """Run the FastAPI app."""
    uvicorn.run("main:app", host="127.0.0.1", port=8157, reload=True)

if __name__ == "__main__":
    main()