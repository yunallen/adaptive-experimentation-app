from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import experiments

app = FastAPI(title="Adaptive Experimentation API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(experiments.router, prefix="/api", tags=["experiments"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Adaptive Experimentation API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)