"""
QueryLens WebSocket Communication Manager
Provides real-time full-duplex session disambiguation & interactive clarification prompting endpoint.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Any
import json
import asyncio
from app.llm_engine import clarification_engine
from app.db_engine import db_engine
from app.redis_client import redis_cache

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_json(self, data: Dict[str, Any], websocket: WebSocket):
        await websocket.send_json(data)

ws_manager = ConnectionManager()

@router.websocket("/ws/clarify")
async def websocket_clarification_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    session_id = f"ws_{id(websocket)}"
    
    # Send initial welcome payload
    await ws_manager.send_json({
        "type": "CONNECTION_ESTABLISHED",
        "sessionId": session_id,
        "message": "Connected to QueryLens Clarification Engine WebSocket Service"
    }, websocket)

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                msg = json.loads(raw_text)
            except Exception:
                msg = {"action": "ANALYZE_PROMPT", "prompt": raw_text}

            action = msg.get("action", "ANALYZE_PROMPT")

            if action == "ANALYZE_PROMPT":
                prompt = msg.get("prompt", "Show me top sales")
                
                # 1. Ambiguity Detection
                ambiguity = clarification_engine.detect_ambiguities(prompt)
                
                # Store in Redis
                redis_cache.set_session(session_id, {"prompt": prompt, "ambiguity": ambiguity})

                # Send Ambiguity Report
                await ws_manager.send_json({
                    "type": "AMBIGUITY_DETECTED",
                    "sessionId": session_id,
                    "data": ambiguity
                }, websocket)

                # 2. Automatically generate initial intent & SQL
                selections = ambiguity["defaultSuggestions"]
                refined = clarification_engine.generate_refined_intent(prompt, selections)
                sql_data = clarification_engine.generate_sql(refined)
                exec_result = db_engine.execute_query(sql_data["sql"])

                await ws_manager.send_json({
                    "type": "PIPELINE_COMPLETE",
                    "sessionId": session_id,
                    "refinedIntent": refined,
                    "sqlData": sql_data,
                    "execution": exec_result
                }, websocket)

            elif action == "CLARIFY_SELECTIONS":
                prompt = msg.get("prompt", "Show me top sales")
                selections = msg.get("selections", {})

                refined = clarification_engine.generate_refined_intent(prompt, selections)
                sql_data = clarification_engine.generate_sql(refined)
                exec_result = db_engine.execute_query(sql_data["sql"])

                redis_cache.set_session(session_id, {"prompt": prompt, "selections": selections, "refined": refined})

                await ws_manager.send_json({
                    "type": "PIPELINE_COMPLETE",
                    "sessionId": session_id,
                    "refinedIntent": refined,
                    "sqlData": sql_data,
                    "execution": exec_result
                }, websocket)

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        ws_manager.disconnect(websocket)
