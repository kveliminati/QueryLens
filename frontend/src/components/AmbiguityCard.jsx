import React from 'react';
import { AlertTriangle, CheckCircle, Sliders } from 'lucide-react';

export default function AmbiguityCard({ ambiguityData, selections, onSelectionChange, refinedIntent }) {
  const flags = ambiguityData?.flags || [];
  const hasAmbiguity = ambiguityData?.hasAmbiguity;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <div className="section-title">
        <span className="section-num">Stage 2</span>
        Clarification Engine Core (ML & Processing)
      </div>

      {hasAmbiguity ? (
        <div className="ambiguity-banner">
          <AlertTriangle className="ambiguity-icon" size={20} />
          <div>
            <div className="ambiguity-title">
              Ambiguity Detected ({flags.length} Flag{flags.length > 1 ? 's' : ''})
            </div>
            <div className="ambiguity-desc">
              The Clarification Engine requires resolution for vague parameters before generating exact SQL.
            </div>
          </div>
        </div>
      ) : (
        <div className="ambiguity-banner" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <CheckCircle size={20} color="#10b981" />
          <div>
            <div className="ambiguity-title" style={{ color: '#10b981' }}>
              Query Intent Explicit & Clear
            </div>
            <div className="ambiguity-desc">
              All essential parameters resolved cleanly with high confidence.
            </div>
          </div>
        </div>
      )}

      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Sliders size={14} /> Interactive Parameter Disambiguation
      </div>

      <div className="controls-grid">
        <div className="form-group">
          <label className="form-label">Metric Definition</label>
          <select 
            className="form-select" 
            value={selections.metric} 
            onChange={(e) => onSelectionChange('metric', e.target.value)}
          >
            <option value="revenue">Total Revenue ($)</option>
            <option value="quantity">Total Quantity (Units)</option>
            <option value="orders">Invoice Order Count</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Target Entity Grouping</label>
          <select 
            className="form-select" 
            value={selections.groupBy} 
            onChange={(e) => onSelectionChange('groupBy', e.target.value)}
          >
            <option value="description">Product Description</option>
            <option value="customerID">Customer ID</option>
            <option value="country">Country Location</option>
            <option value="yearMonth">Monthly Trend (YYYY-MM)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Temporal Scope</label>
          <select 
            className="form-select" 
            value={selections.timeframe} 
            onChange={(e) => onSelectionChange('timeframe', e.target.value)}
          >
            <option value="ALL">All Time (2010 - 2011)</option>
            <option value="2011">Year 2011</option>
            <option value="2010">Year 2010</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Cancellation Scope</label>
          <select 
            className="form-select" 
            value={selections.filterCancel} 
            onChange={(e) => onSelectionChange('filterCancel', e.target.value)}
          >
            <option value="EXCLUDE">Exclude Cancellations</option>
            <option value="ONLY">Only Cancellations ('C')</option>
            <option value="INCLUDE">Include All Transactions</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Limit Rows</label>
          <input 
            type="number" 
            className="form-input" 
            value={selections.limit} 
            min={1} 
            max={100}
            onChange={(e) => onSelectionChange('limit', parseInt(e.target.value, 10) || 10)}
          />
        </div>
      </div>

      {refinedIntent && (
        <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', borderLeft: '3px solid var(--accent-cyan)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
            Refined Intermediate Representation (Better Query)
          </div>
          <div style={{ fontSize: '0.9rem', color: '#fff', marginTop: '0.2rem', fontStyle: 'italic' }}>
            "{refinedIntent.refinedPrompt}"
          </div>
        </div>
      )}
    </div>
  );
}
