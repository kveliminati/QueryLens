import { useState } from "react";

export default function SqlDisclosure({ sql, explanation }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sql) return null;

  return (
    <div className="sql-disclosure animate-in">
      {isOpen && (
        <div className="sql-content">
          {explanation && (
            <div className="sql-explanation">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p>{explanation}</p>
            </div>
          )}
          <pre className="sql-code">
            <code>{sql}</code>
          </pre>
          <button
            className="copy-btn"
            onClick={() => navigator.clipboard.writeText(sql)}
            title="Copy SQL to clipboard"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy
          </button>
        </div>
      )}
    </div>
  );
}
