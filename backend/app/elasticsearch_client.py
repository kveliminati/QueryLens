"""
QueryLens Elasticsearch Repository Manager
Indexes domain dictionary entities, schema metadata, and performs BM25 entity search.
Includes robust in-memory fallback if Elasticsearch server is unavailable.
"""

import os
from typing import List, Dict, Any

try:
    from elasticsearch import Elasticsearch
    HAS_ELASTICSEARCH = True
except ImportError:
    HAS_ELASTICSEARCH = False

class ElasticsearchManager:
    def __init__(self):
        self.es_url = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
        self.client = None
        if HAS_ELASTICSEARCH:
            try:
                self.client = Elasticsearch([self.es_url], request_timeout=1)
                if self.client.ping():
                    print(f"[ElasticsearchManager] Connected to Elasticsearch at {self.es_url}")
                else:
                    self.client = None
            except Exception as e:
                print(f"[ElasticsearchManager] Elasticsearch offline ({e}), using in-memory entity search.")
                self.client = None

    def search_entities(self, query: str) -> List[Dict[str, Any]]:
        if self.client:
            try:
                res = self.client.search(
                    index="querylens_entities",
                    body={
                        "query": {
                            "multi_match": {
                                "query": query,
                                "fields": ["term^2", "mappedField", "description"]
                            }
                        }
                    }
                )
                hits = res.get("hits", {}).get("hits", [])
                return [h["_source"] for h in hits]
            except Exception:
                pass
        
        # Fallback search
        from app.entity_search import entity_search_engine
        return entity_search_engine.search_entities(query)

es_manager = ElasticsearchManager()
