from typing import Optional, Any
from pydantic import BaseModel


class SearchRequest(BaseModel):
    query:         str
    top_k:         int   = 10
    fts_weight:    float = 0.5
    vector_weight: float = 0.5
    lang:          str   = "de"


class SearchResult(BaseModel):
    id:    str
    score: float

    model_config = {"extra": "allow"}
