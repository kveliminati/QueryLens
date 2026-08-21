export default function ClarificationPrompt({
  question,
  options,
  onSelect,
  isLoading,
}) {
  return (
    <div className="clarification-container animate-in">
      <div className="clarification-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      <h3 className="clarification-title">Clarification Needed</h3>
      <p className="clarification-question">{question}</p>

      <div className="clarification-options">
        {options?.map((option, index) => (
          <button
            key={index}
            className="clarification-option-btn"
            onClick={() => onSelect(option)}
            disabled={isLoading}
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <span className="option-number">{index + 1}</span>
            <span className="option-text">{option}</span>
            <svg className="option-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
