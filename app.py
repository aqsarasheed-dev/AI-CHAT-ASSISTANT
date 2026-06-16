# backend/app.py - Using Groq (Fast & Free)

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq  # <-- NEW: Import the Groq library
import traceback

load_dotenv()

app = FastAPI(title="AI Chat Assistant - Groq")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Initialize the Groq Client
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("⚠️  WARNING: GROQ_API_KEY not found in .env file")
    print("   Please create .env with: GROQ_API_KEY=your_key_here")

# Create the Groq client
client = Groq(api_key=GROQ_API_KEY)

# 2. Define Request/Response Models
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

# 3. The /chat Endpoint
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    user_msg = request.message.strip()
    
    # Security: input validation
    if len(user_msg) > 500:
        raise HTTPException(status_code=400, detail="Message too long (max 500 chars)")
    
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured on server")

    try:
        print(f"📤 Sending to Groq: {user_msg[:50]}...")
        
        # 4. Call the Groq API
        # Choose a fast, free model. "llama-3.3-70b-versatile" is a great choice.
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful, friendly AI assistant. Keep responses concise (under 100 words)."
                },
                {
                    "role": "user",
                    "content": user_msg,
                }
            ],
            model="llama-3.3-70b-versatile",  # <-- One of Groq's fastest models
            temperature=0.7,
            max_tokens=200,
        )
        
        # 5. Extract the reply
        reply = chat_completion.choices[0].message.content.strip()
        print(f"📥 Groq Reply: {reply[:50]}...")
        
        return ChatResponse(reply=reply)
        
    except Exception as e:
        print(f"❌ Groq Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Groq error: {str(e)}")

# 6. Health Check Endpoint
@app.get("/")
def root():
    return {"message": "AI Chat Assistant API is running with Groq"}

@app.get("/health")
def health():
    return {"status": "ok", "api_key_set": bool(GROQ_API_KEY)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)