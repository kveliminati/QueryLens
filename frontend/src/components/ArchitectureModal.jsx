import React from 'react';
import { X, Layers, Cpu, Database, Server, Terminal } from 'lucide-react';

export default function ArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers color="var(--accent-cyan)" size={22} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
              NL2SQL Clarification Engine: Deep Architecture Diagram
            </h2>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: '#000', borderRadius: '12px', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <img 
              src="/QueryLens.jpg" 
              alt="QueryLens Architecture Diagram" 
              style={{ maxWidth: '100%', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} 
              onError={(e) => { e.target.onerror = null; e.target.src = '/QueryLens.jpg'; }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Server size={14} /> 1. Frontend & APIs
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                React single-page application communicating via Python FastAPI REST Gateway & real-time WebSockets full-duplex streaming for interactive disambiguation prompts.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-green)', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Cpu size={14} /> 2. Core Engine (LLM & Processing)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                NLP & Intent Extraction using OpenAI GPT-4 API & LangChain framework. Hugging Face Transformers vector search for domain entity dictionary resolution.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-purple)', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Database size={14} /> 3. Data & Metadata
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                H2 target database engine, Elasticsearch for entity mapping, and Redis for high-speed session state caching.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-amber)', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Terminal size={14} /> 4. Development & DevOps
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Containerized with Docker & Docker Compose, deployed on Kubernetes (k8s), monitored via Prometheus metrics & Grafana dashboards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
