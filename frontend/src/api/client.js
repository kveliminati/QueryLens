/**
 * QueryLens API Client
 *
 * Centralized API functions for communicating with the FastAPI backend.
 */

const API_BASE = "http://localhost:8000/api";

/**
 * Submit a natural language query for ambiguity detection and potential execution.
 * @param {string} query - The user's natural language question
 * @returns {Promise<object>} QueryResponse
 */
export async function submitQuery(query) {
  const response = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Submit a clarification choice for an ambiguous query.
 * @param {string} sessionId - Session ID from the initial query
 * @param {string} originalQuery - The original natural language query
 * @param {string} clarification - The user's chosen clarification
 * @returns {Promise<object>} QueryResponse with results
 */
export async function submitClarification(sessionId, originalQuery, clarification) {
  const response = await fetch(`${API_BASE}/clarify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      original_query: originalQuery,
      clarification,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch the database schema metadata.
 * @returns {Promise<object>} SchemaResponse
 */
export async function getSchema() {
  const response = await fetch(`${API_BASE}/schema`);
  if (!response.ok) throw new Error(`Schema fetch failed: ${response.status}`);
  return response.json();
}

/**
 * Check the API health status.
 * @returns {Promise<object>} HealthResponse
 */
export async function healthCheck() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
  return response.json();
}
