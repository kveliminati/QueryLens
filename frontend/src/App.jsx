import { useState } from "react";
import QueryInput from "./components/QueryInput";
import ClarificationPrompt from "./components/ClarificationPrompt";
import ResultsTable from "./components/ResultsTable";
import ResultsChart from "./components/ResultsChart";
import SqlDisclosure from "./components/SqlDisclosure";
import ErrorBoundary from "./components/ErrorBoundary";
import { submitQuery, submitClarification } from "./api/client";
import "./App.css";

// Application states
const STATE = {
  IDLE: "idle",
  LOADING: "loading",
  CLARIFICATION: "clarification",
  RESULTS: "results",
  ERROR: "error",
};

export default function App() {
  const [appState, setAppState] = useState(STATE.IDLE);
  const [currentQuery, setCurrentQuery] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleQuerySubmit = async (query) => {
    setCurrentQuery(query);
    setAppState(STATE.LOADING);
    setError(null);
    setResult(null);

    try {
      const response = await submitQuery(query);

      if (response.status === "clarification_needed") {
        setResult(response);
        setAppState(STATE.CLARIFICATION);
      } else if (response.status === "ok") {
        setResult(response);
        setAppState(STATE.RESULTS);
      } else if (response.status === "error") {
        setError(response.error_message || "An error occurred");
        setAppState(STATE.ERROR);
      }
    } catch (err) {
      setError(err.message || "Failed to connect to the server");
      setAppState(STATE.ERROR);
    }
  };

  const handleClarification = async (choice) => {
    setAppState(STATE.LOADING);
    setError(null);

    try {
      const response = await submitClarification(
        result.session_id,
        currentQuery,
        choice
      );

      if (response.status === "ok") {
        setResult(response);
        setAppState(STATE.RESULTS);
      } else if (response.status === "error") {
        setError(response.error_message || "An error occurred");
        setAppState(STATE.ERROR);
      }
    } catch (err) {
      setError(err.message || "Failed to connect to the server");
      setAppState(STATE.ERROR);
    }
  };

  const handleReset = () => {
    setAppState(STATE.IDLE);
    setCurrentQuery("");
    setResult(null);
    setError(null);
  };

  return (
    <div className="app">
      {/* Animated background */}
      <div className="bg-grid" />
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />
      <div className="bg-glow bg-glow-3" />

      <div className="app-content">
        {/* Header */}
        <header className="app-header">
          <div className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="url(#logo-grad)" />
                <path
                  d="M8 12h16M8 16h12M8 20h8"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="24" cy="20" r="4" stroke="white" strokeWidth="2" />
                <defs>
                  <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#8B5CF6" />
                    <stop offset="1" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="logo-text">
              <h1>QueryLens</h1>
              <span className="logo-subtitle">Natural Language to SQL</span>
            </div>
          </div>

          {(appState === STATE.RESULTS ||
            appState === STATE.CLARIFICATION ||
            appState === STATE.ERROR) && (
            <button className="new-query-btn" onClick={handleReset}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              New Query
            </button>
          )}
        </header>

        {/* Main content area */}
        <main className="main-area">
          {/* Query input — always visible */}
          <QueryInput
            onSubmit={handleQuerySubmit}
            isLoading={appState === STATE.LOADING}
          />

          {/* Loading state */}
          {appState === STATE.LOADING && (
            <div className="loading-container animate-in">
              <div className="loading-pulse">
                <div className="pulse-ring" />
                <div className="pulse-ring" style={{ animationDelay: "0.3s" }} />
                <div className="pulse-ring" style={{ animationDelay: "0.6s" }} />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="loading-icon">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p className="loading-text">Analyzing your query...</p>
              <p className="loading-subtext">Detecting ambiguity and generating SQL</p>
            </div>
          )}

          {/* Clarification prompt */}
          {appState === STATE.CLARIFICATION && result && (
            <ClarificationPrompt
              question={result.clarifying_question}
              options={result.options}
              onSelect={handleClarification}
              isLoading={false}
            />
          )}

          {/* Results */}
          {appState === STATE.RESULTS && result && (
            <ErrorBoundary onReset={handleReset}>
              <div className="results-area">
                <ResultsChart
                  chartSuggestion={result.chart_suggestion}
                  columns={result.columns}
                  rows={result.rows}
                  xColumn={result.x_column}
                  yColumns={result.y_columns}
                />

                <ResultsTable
                  columns={result.columns}
                  rows={result.rows}
                />

                <SqlDisclosure
                  sql={result.sql}
                  explanation={result.explanation}
                />
              </div>
            </ErrorBoundary>
          )}

          {/* Error state */}
          {appState === STATE.ERROR && (
            <div className="error-container animate-in">
              <div className="error-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h3>Something went wrong</h3>
              <p>{error}</p>
              <button className="retry-btn" onClick={() => handleQuerySubmit(currentQuery)}>
                Try Again
              </button>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <p>QueryLens v1.0 — Powered by Claude AI &amp; PostgreSQL</p>
        </footer>
      </div>
    </div>
  );
}
