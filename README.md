# Smart Document Analyzer with Chat Assistant

A full-stack AI application for intelligent document processing, data extraction, and conversational analysis.

## 🎯 Features

1. **Document Upload** - Drag & drop or click to upload PDF, PNG, JPG files
2. **OCR Processing** - Extract text from documents (includes mock-fallback for missing engines)
3. **AI Data Extraction** - Use GPT-4o to extract structured data:
   - Invoice Number
   - Date
   - Total Amount
   - Vendor Name
   - Customer Name
4. **Chat Assistant** - Ask questions about uploaded documents with conversation memory

## 🏗️ Tech Stack

### Backend
- **FastAPI** - REST API framework
- **Python 3.12** - Core language
- **OpenAI GPT-4o** - AI-powered data extraction and chat
- **MongoDB Atlas** - Cloud document and chat history storage

### Frontend
- **React 19** - UI framework
- **Tailwind CSS** - Styling
- **lucide-react** - Icons

## 🚀 Setup & Run Instructions

### 1. Prerequisites
- Python 3.12
- Node.js 22
- MongoDB Atlas account (Cloud)

### 2. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
# Run the server on port 8001
uvicorn server:app --host 0.0.0.0 --port 8001
```

### 3. Frontend Setup
```bash
cd frontend
npm install --legacy-peer-deps
# Run the development server
npm start
```

## 📡 API Endpoints

- `GET /api/` - Health check
- `POST /api/upload` - Upload document
- `POST /api/extract` - Extract structured data
- `POST /api/chat` - Chat with document
nd`

## 📝 License

This project is a standalone document analysis application.

## 🤝 Contributing

This is a demonstration project showing AI-powered document analysis capabilities.

---

unning your server command (e.g., uvicorn server:app --reload or python server.py) inside your backend directory.

.\venv\Scripts\python.exe server.py
npm run start
npm install
npm install --legacy-peer-deps