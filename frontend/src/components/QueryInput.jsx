import { useState } from "react";

const EXAMPLE_QUERIES = [
  "Get me total sales",
  "How many unique customers do we have?",
  "Show me top products by revenue",
  "What is the sales breakdown by country?",
  "Monthly revenue trend",
];

export default function QueryInput({ onSubmit, isLoading }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
    }
  };

  const handleExample = (example) => {
    setQuery(example);
    onSubmit(example);
  };

  return (
    <div className="query-input-container">
      <form onSubmit={handleSubmit} className="query-form">
        <div className="input-wrapper">
          <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="query-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your data..."
            className="query-text-input"
            disabled={isLoading}
            autoFocus
          />
          <button
            type="submit"
            className="query-submit-btn"
            disabled={!query.trim() || isLoading}
          >
            {isLoading ? (
              <div className="spinner" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </button>
        </div>
      </form>

      <div className="example-queries">
        <span className="example-label">Try:</span>
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example}
            className="example-chip"
            onClick={() => handleExample(example)}
            disabled={isLoading}
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
