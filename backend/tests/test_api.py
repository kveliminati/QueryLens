"""
QueryLens Backend Unit Tests
Validates FastAPI REST endpoints, Ambiguity Detection, SQL Generation, and Database Engine
"""

import sys
import os
import pytest
from fastapi.testclient import TestClient

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "techStack" in data

def test_schema_metadata():
    response = client.get("/api/schema")
    assert response.status_code == 200
    data = response.json()
    assert data["tableName"] == "online_retail"
    assert len(data["columns"]) == 8

def test_ambiguity_detection():
    response = client.post("/api/detect-ambiguity", json={"prompt": "Show me top sales"})
    assert response.status_code == 200
    data = response.json()
    assert data["hasAmbiguity"] is True
    assert data["ambiguityCount"] >= 1

def test_full_pipeline():
    payload = {
        "prompt": "Show me top sales",
        "selections": {
            "metric": "revenue",
            "groupBy": "description",
            "timeframe": "2011",
            "filterCancel": "EXCLUDE",
            "limit": 5
        }
    }
    response = client.post("/api/pipeline", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert "sqlData" in res
    assert "execution" in res
    assert res["execution"]["success"] is True
    assert len(res["execution"]["data"]) > 0
