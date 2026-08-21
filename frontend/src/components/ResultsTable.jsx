import { useState, useMemo } from "react";

function formatCellValue(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  }
  return String(value);
}

function formatColumnHeader(col) {
  return String(col)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ResultsTable({ columns = [], rows = [] }) {
  const [sortColIndex, setSortColIndex] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc"); // "asc" | "desc"
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const safeColumns = useMemo(() => (Array.isArray(columns) ? columns : []), [columns]);
  const safeRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  // Sorting handler
  const handleSort = (index) => {
    if (sortColIndex === index) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColIndex(null);
        setSortDirection("asc");
      }
    } else {
      setSortColIndex(index);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Sorted rows
  const sortedRows = useMemo(() => {
    if (sortColIndex === null || sortColIndex >= safeColumns.length) {
      return safeRows;
    }

    const rowsCopy = [...safeRows];
    rowsCopy.sort((a, b) => {
      const valA = a?.[sortColIndex];
      const valB = b?.[sortColIndex];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      if (strA < strB) return sortDirection === "asc" ? -1 : 1;
      if (strA > strB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return rowsCopy;
  }, [safeRows, sortColIndex, sortDirection, safeColumns.length]);

  // Paginated rows
  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  if (safeColumns.length === 0) {
    return null;
  }

  return (
    <div className="results-table-container animate-in">
      <div className="table-header-bar">
        <h3 className="table-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
          Data Results
        </h3>
        <span className="row-count">
          {safeRows.length} row{safeRows.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="table-scroll-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {safeColumns.map((col, index) => {
                const isSorted = sortColIndex === index;
                return (
                  <th
                    key={col || index}
                    onClick={() => handleSort(index)}
                    className={isSorted ? "sorted" : ""}
                  >
                    <div className="th-content">
                      <span>{formatColumnHeader(col)}</span>
                      <span className="sort-indicator">
                        {isSorted ? (sortDirection === "asc" ? " ↑" : " ↓") : " ↕"}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={safeColumns.length} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                  No data available
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {safeColumns.map((col, cIdx) => (
                    <td key={cIdx}>{formatCellValue(row?.[cIdx])}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sortedRows.length > 50 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderTop: "1px solid var(--border-subtle)", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedRows.length)} of {sortedRows.length}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              style={{ padding: "4px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "var(--text-primary)", cursor: currentPage > 1 ? "pointer" : "not-allowed", opacity: currentPage > 1 ? 1 : 0.4 }}
            >
              Previous
            </button>
            <span style={{ padding: "4px 8px" }}>
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              style={{ padding: "4px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "var(--text-primary)", cursor: currentPage < totalPages ? "pointer" : "not-allowed", opacity: currentPage < totalPages ? 1 : 0.4 }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
