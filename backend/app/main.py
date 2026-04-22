from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from .routes import auth, documents, chat, excel, stats, quota, user, two_factor

app = FastAPI(title="Invoicelytics AI", version="2.0.0")

import os

# CORS Setup
# CORS Setup
# CORS Setup
# CORS Setup
origins_env = os.getenv("CORS_ORIGINS", "")
if origins_env == "*":
    allow_origins = ["*"]
elif origins_env:
    allow_origins = [origin.strip().rstrip("/") for origin in origins_env.split(",")]
else:
    allow_origins = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:8001",
        "http://127.0.0.1:8001"
    ]

print(f"CORS: Allowed Origins configured as: {allow_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False, # Set to False to allow "*" wildcard for origins
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Logging Middleware with Origin detection
@app.middleware("http")
async def log_requests(request, call_next):
    origin = request.headers.get("origin")
    print(f"DEBUG: Incoming {request.method} {request.url.path} | Origin: {origin}")
    response = await call_next(request)
    return response

# Include Routers
# Add a catch-all options handler if needed (usually handled by CORSMiddleware)
app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(excel.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(quota.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(two_factor.router, prefix="/api")

@app.get("/api/ping")
async def ping():
    return {"status": "ok", "version": "2.0.0"}

if __name__ == "__main__":
    import uvicorn
    # Use the PORT environment variable provided by Render
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
