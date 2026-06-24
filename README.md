# 🌿 GuideAI – Intelligent Career Assistant

> An AI-powered career assistant that analyzes CVs and provides actionable feedback using Groq's ultra-fast LLM.

![GuideAI Demo](screenshots/demo.png)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Chat** | Ask career questions, get instant advice |
| 📄 **CV Upload** | Securely upload PDF CVs (5MB max) |
| 🔍 **Auto-Analyze** | AI reads your CV and gives structured feedback |
| 📋 **CV Management** | View and manage uploaded CVs |
| 🎨 **Fresh Green UI** | Clean, modern, and accessible design |
| 🔒 **Security** | Rate limiting, input validation, file sanitization |

---

## 🛠️ Tech Stack

### Backend
- **Python 3.10+** – Core language
- **FastAPI** – High-performance API framework
- **Groq API** – Ultra-fast LLM inference (Llama 3.3 70B)
- **PyPDF2** – PDF text extraction
- **SlowAPI** – Rate limiting (15 requests/minute)
- **Uvicorn** – ASGI server

### Frontend
- **HTML5 / CSS3** – Structure & styling
- **JavaScript (ES6)** – Interactivity & API calls
- **Outfit Font** – Modern typography

### Security
- **CORS** – Restricted origins
- **Environment Variables** – API keys protected
- **Input Validation** – Pydantic models
- **File Sanitization** – Hash-based filenames
