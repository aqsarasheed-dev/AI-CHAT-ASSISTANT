# backend/app.py – Full version with fixed analyze

import os
import time
import asyncio
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from groq import Groq
import aiofiles
import hashlib
import PyPDF2

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in .env file")

# Rate limiting
limiter = Limiter(key_func=get_remote_address, default_limits=["15/minute"])
app = FastAPI(title="GuideAI")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class ChatRequest(BaseModel):
    message: str
    @validator('message')
    def validate_message(cls, v):
        if len(v) > 500:
            raise ValueError("Message too long")
        if not v.strip():
            raise ValueError("Empty message")
        return v.strip()

class ChatResponse(BaseModel):
    reply: str
    timestamp: str

# Groq client
client = Groq(api_key=GROQ_API_KEY)

# Endpoints
@app.get("/")
async def root():
    return {"message": "GuideAI API is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/chat")
@limiter.limit("15/minute")
async def chat(request: Request, chat_request: ChatRequest):
    try:
        async with asyncio.timeout(30):
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are GuideAI, a helpful career assistant."},
                    {"role": "user", "content": chat_request.message}
                ],
                temperature=0.7,
                max_tokens=300,
            )
        reply = response.choices[0].message.content.strip()
        return ChatResponse(reply=reply, timestamp=time.strftime("%I:%M %p"))
    except asyncio.TimeoutError:
        raise HTTPException(504, "Timeout")
    except Exception as e:
        raise HTTPException(500, str(e))

# Upload directory
UPLOAD_DIR = "frontend/cv"
os.makedirs(UPLOAD_DIR, exist_ok=True)
LATEST_CV_FILE = os.path.join(UPLOAD_DIR, "latest.txt")

@app.post("/upload-cv")
@limiter.limit("5/minute")
async def upload_cv(request: Request, file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(400, "Only PDF allowed")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "File too large")
    safe_filename = hashlib.md5(file.filename.encode()).hexdigest() + ".pdf"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    async with aiofiles.open(LATEST_CV_FILE, 'w') as f:
        await f.write(safe_filename)
    return {"message": "Uploaded", "filename": safe_filename}

# ✅ FIXED analyze-cv
@app.post("/analyze-cv")
@limiter.limit("5/minute")
async def analyze_cv(request: Request):
    print("📥 Analyze CV request received")
    
    # 1. Try latest.txt
    filename = None
    if os.path.exists(LATEST_CV_FILE):
        async with aiofiles.open(LATEST_CV_FILE, 'r') as f:
            filename = await f.read()
            print(f"📄 Found latest.txt: {filename}")
    
    # 2. If not, find most recent PDF
    if not filename or not os.path.exists(os.path.join(UPLOAD_DIR, filename)):
        print("🔍 Searching for most recent PDF...")
        pdf_files = []
        for f in os.listdir(UPLOAD_DIR):
            if f.endswith('.pdf'):
                filepath = os.path.join(UPLOAD_DIR, f)
                mtime = os.path.getmtime(filepath)
                pdf_files.append((mtime, f))
        if not pdf_files:
            print("❌ No PDF files found")
            raise HTTPException(404, "No CV uploaded yet. Please upload a PDF first.")
        pdf_files.sort(reverse=True)
        filename = pdf_files[0][1]
        print(f"✅ Found most recent PDF: {filename}")
        # Update latest.txt
        async with aiofiles.open(LATEST_CV_FILE, 'w') as f:
            await f.write(filename)
    
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "CV file not found")
    
    # Extract text
    try:
        with open(filepath, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            cv_text = ""
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    cv_text += text + "\n"
            if not cv_text or len(cv_text) < 50:
                raise HTTPException(400, "Could not extract text from PDF.")
    except Exception as e:
        raise HTTPException(500, f"Error reading PDF: {str(e)}")
    
    # Truncate if needed
    if len(cv_text) > 8000:
        cv_text = cv_text[:8000] + "\n[truncated]"
    
    prompt = f"""You are an expert career coach. Analyze this CV and provide structured feedback:

--- CV ---
{cv_text}
--- END ---

Format:
**1. OVERALL ASSESSMENT**
**2. STRENGTHS**
**3. AREAS FOR IMPROVEMENT**
**4. ATS OPTIMIZATION**
**5. ACTIONABLE RECOMMENDATIONS** (5 items)
Keep it constructive and specific."""
    
    try:
        async with asyncio.timeout(45):
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are an expert career coach."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=800,
            )
        analysis = response.choices[0].message.content.strip()
        return {"reply": analysis, "timestamp": time.strftime("%I:%M %p")}
    except asyncio.TimeoutError:
        raise HTTPException(504, "Analysis timed out.")
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/cv-list")
async def get_cv_list():
    files = []
    for f in os.listdir(UPLOAD_DIR):
        if f.endswith('.pdf'):
            path = os.path.join(UPLOAD_DIR, f)
            size = os.path.getsize(path)
            files.append({"filename": f, "size_kb": round(size/1024,1)})
    return {"files": files}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)