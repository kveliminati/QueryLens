import React from 'react';
import { X, Database, Table, Hash, List } from 'lucide-react';

export default function SchemaModal({ isOpen, onClose, schemaData }) {
  if (!isOpen) return null;

  const columns = schemaData?.columns || [];
  const metrics = schemaData?.metrics || {};

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database color="var(--accent-blue)" size={22} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
              Metadata Repository: Table Schema & Domain Dictionary
            </h2>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Table size={16} /> Table: online_retail ({schemaData?.totalRecords?.toLocaleString() || '541,910'} records)
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '0.6rem 0.85rem', textAlign: 'left', color: 'var(--accent-cyan)' }}>Column Name</th>
                    <th style={{ padding: '0.6rem 0.85rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Data Type</th>
                    <th style={{ padding: '0.6rem 0.85rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Description & Entity Mapping</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '0.6rem 0.85rem', color: '#fff', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>{col.name}</td>
                      <td style={{ padding: '0.6rem 0.85rem', color: 'var(--accent-purple)', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>{col.type}</td>
                      <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-secondary)' }}>{col.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-green)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Hash size={16} /> Domain Metrics Formulas
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {Object.entries(metrics).map(([mKey, mVal]) => (
                <div key={mKey} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>{mKey}</div>
                  <div style={{ fontSize: '0.8rem', color: '#60a5fa', fontFamily: 'JetBrains Mono', marginTop: '0.2rem' }}>{mVal}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
