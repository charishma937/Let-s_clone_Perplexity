import os
import io
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from pypdf import PdfReader

# --- Configuration ---
API_KEY = "AIzaSyBPjI4YJVpiOPZL8c3gk2ot5bruNNLtIJA"
MODEL_NAME = "gemini-2.5-flash"

# Configure Google Generative AI
genai.configure(api_key=API_KEY)

# Initial System Instruction
SYSTEM_INSTRUCTION = "You are Perplexity, a helpful AI assistant. Answer the user based on the provided history and knowledge context if available."

# --- Global Context (Simple In-Memory RAG) ---
document_text = ""

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Models ---
class ChatMessage(BaseModel):
    role: str
    parts: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"message": "Perplexity AI Backend with RAG is running!"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    global document_text
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        pdf_content = await file.read()
        reader = PdfReader(io.BytesIO(pdf_content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        # Simple RAG strategy: Store text to be used in every following prompt
        # In a real app, you would use a Vector DB here to fetch only relevant chunks.
        document_text = text[:10000] # Limit context size for simple example
        
        return {"status": "success", "message": f"Extracted {len(text)} characters from {file.filename}."}
    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_with_perplexity(request: ChatRequest):
    global document_text
    try:
        history_formatted = []
        if request.history:
            for msg in request.history:
                history_formatted.append({"role": msg.role, "parts": [msg.parts]})
        
        # Update system instruction with RAG context
        current_instruction = SYSTEM_INSTRUCTION
        if document_text:
            current_instruction += f"\n\nCONTEXT FROM UPLOADED DOCUMENT:\n{document_text}"

        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            system_instruction=current_instruction
        )
        
        chat_session = model.start_chat(history=history_formatted)
        response = chat_session.send_message(request.message)
        
        return {
            "response": response.text,
            "status": "success"
        }
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8888)
