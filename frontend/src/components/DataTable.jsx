import React, { useState } from 'react';
import { Download, Search, ChevronLeft, ChevronRight, Table } from 'lucide-react';

export default function DataTable({ queryResult }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const columns = queryResult?.columns || [];
  const rows = queryResult?.data || [];

  // Filter rows by search term
  const filteredRows = rows.filter(r => {
    if (!searchTerm) return true;
    return Object.values(r).some(val => 
      String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportCSV = () => {
    if (rows.length === 0) return;
    const headerStr = columns.join(',');
    const rowStrs = rows.map(r => columns.map(c => `"${String(r[c] || '').replace(/"/g, '""')}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headerStr, ...rowStrs].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'querylens_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <Table size={18} color="var(--accent-blue)" /> Executed Result Set ({filteredRows.length} Rows)
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search results..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '0.4rem 0.6rem 0.4rem 2rem', color: '#fff', fontSize: '0.8rem', outline: 'none' }}
            />
          </div>

          <button className="btn-secondary" onClick={handleExportCSV} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {columns.map((col, idx) => (
                <th key={idx} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.length > 0 ? (
              pagedRows.map((row, rIdx) => (
                <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.15s' }}>
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} style={{ padding: '0.75rem 1rem', color: cIdx === 1 ? '#34d399' : 'var(--text-primary)', fontWeight: cIdx === 1 ? 600 : 400 }}>
                      {typeof row[col] === 'number' ? row[col].toLocaleString() : String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={Math.max(1, columns.length)} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No result records match current query or filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <div>
          Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredRows.length} total rows)
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn-secondary" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            style={{ padding: '0.3rem 0.6rem', opacity: currentPage === 1 ? 0.5 : 1 }}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <button 
            className="btn-secondary" 
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            style={{ padding: '0.3rem 0.6rem', opacity: currentPage >= totalPages ? 0.5 : 1 }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
