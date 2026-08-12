"""
QueryLens FastAPI Main Application Server
Provides REST Gateway, WebSockets Endpoint, Prometheus Metrics, and Clarification Engine Services.
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
import os

from app.db_engine import db_engine
from app.llm_engine import clarification_engine
from app.entity_search import entity_search_engine
from app.redis_client import redis_cache
from app.elasticsearch_client import es_manager
from app.websocket import router as ws_router

# Prometheus Metrics Instrumentation
try:
    from prometheus_fastapi_instrumentator import Instrumentator
    HAS_PROMETHEUS = True
except ImportError:
    HAS_PROMETHEUS = False

app = FastAPI(
    title="QueryLens NL2SQL Clarification Engine API",
    description="Python FastAPI REST & WebSockets Service implementing the Clarification Engine Deep Architecture",
    version="2.0.0"
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach WebSocket Router
app.include_router(ws_router)

# Attach Prometheus Instrumentation (/metrics)
if HAS_PROMETHEUS:
    Instrumentator().instrument(app).expose(app)


# Pydantic Request Models
class AmbiguityDetectRequest(BaseModel):
    prompt: str

class ClarifyRequest(BaseModel):
    prompt: str
    selections: Dict[str, Any]

class SQLGenerateRequest(BaseModel):
    refinedIntent: Dict[str, Any]

class SQLExecuteRequest(BaseModel):
    sql: str


@app.get("/api/health")
def get_health():
    """Returns System Health and Tech Stack Component Status"""
    return {
        "status": "HEALTHY",
        "service": "QueryLens Clarification Engine",
        "techStack": {
            "apiFramework": "Python FastAPI",
            "llmCore": "OpenAI GPT-4 & LangChain",
            "entitySearch": "Hugging Face Transformers",
            "database": "PostgreSQL Engine (DuckDB SQL)",
            "cache": "Redis Cache",
            "search": "Elasticsearch Repository",
            "metrics": "Prometheus & Grafana"
        },
        "databaseLoaded": db_engine.is_loaded,
        "totalRecords": db_engine.total_records
    }

@app.get("/api/schema")
def get_schema():
    """Metadata Repository Endpoint: Returns table schema, column definitions, domain dictionary"""
    return db_engine.get_schema_metadata()

@app.post("/api/detect-ambiguity")
def detect_ambiguity(req: AmbiguityDetectRequest):
    """FR-01: Ambiguity Detection Endpoint"""
    if not req.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    return clarification_engine.detect_ambiguities(req.prompt)

@app.post("/api/clarify")
def clarify_intent(req: ClarifyRequest):
    """FR-03: Context Enrichment & Refined Intermediate Representation"""
    return clarification_engine.generate_refined_intent(req.prompt, req.selections)

@app.post("/api/generate-sql")
def generate_sql(req: SQLGenerateRequest):
    """FR-04: Schema-aware SQL Generation"""
    return clarification_engine.generate_sql(req.refinedIntent)

@app.post("/api/execute-sql")
def execute_sql(req: SQLExecuteRequest):
    """FR-05: Dry Run Syntax Check & Database Execution"""
    return db_engine.execute_query(req.sql)

@app.post("/api/pipeline")
def full_pipeline(req: ClarifyRequest):
    """Combined End-to-End NL2SQL Clarification Pipeline"""
    ambiguity = clarification_engine.detect_ambiguities(req.prompt)
    selections = req.selections or ambiguity["defaultSuggestions"]
    refined = clarification_engine.generate_refined_intent(req.prompt, selections)
    sql_data = clarification_engine.generate_sql(refined)
    exec_result = db_engine.execute_query(sql_data["sql"])

    return {
        "ambiguity": ambiguity,
        "refinedIntent": refined,
        "sqlData": sql_data,
        "execution": exec_result
    }


# Static assets serving for frontend build fallback
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="static")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
