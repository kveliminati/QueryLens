"""
QueryLens Redis Session Cache Manager
Stores active user session context, clarification progress, and query result cache.
Includes robust in-memory fallback if Redis server is unavailable.
"""

import os
import json
from typing import Dict, Any, Optional

try:
    import redis
    HAS_REDIS = True
except ImportError:
    HAS_REDIS = False

class RedisSessionCache:
    def __init__(self):
        self.redis_host = os.getenv("REDIS_HOST", "localhost")
        self.redis_port = int(os.getenv("REDIS_PORT", 6379))
        self.client = None
        self.in_memory_store: Dict[str, Any] = {}

        if HAS_REDIS:
            try:
                self.client = redis.Redis(
                    host=self.redis_host, 
                    port=self.redis_port, 
                    db=0, 
                    socket_connect_timeout=1,
                    decode_responses=True
                )
                self.client.ping()
                print(f"[RedisSessionCache] Connected to Redis at {self.redis_host}:{self.redis_port}")
            except Exception as e:
                print(f"[RedisSessionCache] Redis offline ({e}), using in-memory session store fallback.")
                self.client = None

    def set_session(self, session_id: str, data: Dict[str, Any], ttl: int = 3600):
        if self.client:
            try:
                self.client.setex(f"session:{session_id}", ttl, json.dumps(data))
                return
            except Exception:
                pass
        self.in_memory_store[session_id] = data

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        if self.client:
            try:
                val = self.client.get(f"session:{session_id}")
                if val:
                    return json.loads(val)
            except Exception:
                pass
        return self.in_memory_store.get(session_id)

redis_cache = RedisSessionCache()
