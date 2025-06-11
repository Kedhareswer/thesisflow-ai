from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from scholarly_service import ScholarlyService
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchQuery(BaseModel):
    query: str
    limit: Optional[int] = 10

class AuthorQuery(BaseModel):
    name: str

@app.post("/api/scholarly/search")
async def search_papers(query: SearchQuery):
    try:
        results = ScholarlyService.search_papers(query.query, query.limit)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scholarly/author")
async def get_author(query: AuthorQuery):
    try:
        author_info = ScholarlyService.get_author_info(query.name)
        return {"author": author_info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
