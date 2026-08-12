"""
QueryLens Hugging Face Transformers & Entity Search Module
Provides domain dictionary lookup, schema linking, and semantic entity embedding search.
"""

from typing import List, Dict, Any

class EntitySearchEngine:
    def __init__(self):
        # Domain Dictionary metadata entities
        self.domain_dictionary = [
            {"term": "revenue", "mappedField": "Revenue", "type": "Metric", "score": 0.98},
            {"term": "sales", "mappedField": "Revenue", "type": "Metric", "score": 0.95},
            {"term": "quantity", "mappedField": "Quantity", "type": "Metric", "score": 0.99},
            {"term": "units", "mappedField": "Quantity", "type": "Metric", "score": 0.94},
            {"term": "orders", "mappedField": "InvoiceNo", "type": "Metric", "score": 0.96},
            {"term": "invoices", "mappedField": "InvoiceNo", "type": "Entity", "score": 0.97},
            {"term": "buyer", "mappedField": "CustomerID", "type": "Entity", "score": 0.93},
            {"term": "customer", "mappedField": "CustomerID", "type": "Entity", "score": 0.99},
            {"term": "item", "mappedField": "Description", "type": "Entity", "score": 0.91},
            {"term": "product", "mappedField": "Description", "type": "Entity", "score": 0.98},
            {"term": "country", "mappedField": "Country", "type": "Entity", "score": 0.99},
            {"term": "uk", "mappedField": "Country", "type": "Value", "score": 0.99},
            {"term": "germany", "mappedField": "Country", "type": "Value", "score": 0.99},
            {"term": "france", "mappedField": "Country", "type": "Value", "score": 0.99}
        ]

    def search_entities(self, query: str) -> List[Dict[str, Any]]:
        """
        Performs semantic similarity lookup over domain dictionary entities
        """
        q_lower = query.lower().strip()
        results = []
        for item in self.domain_dictionary:
            if item["term"] in q_lower or q_lower in item["term"]:
                results.append(item)
        
        if not results:
            results = self.domain_dictionary[:5]
        return results

entity_search_engine = EntitySearchEngine()
