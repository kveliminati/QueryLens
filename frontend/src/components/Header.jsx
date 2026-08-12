import React from 'react';
import { Bot, Layers, Database, Cpu, Activity, Zap } from 'lucide-react';

export default function Header({ wsConnected, onOpenArchModal, onOpenSchemaModal }) {
  return (
    <header className="app-header">
      <div className="logo-container">
        <div className="logo-icon">
          <Bot size={24} color="#ffffff" />
        </div>
        <div>
          <div className="logo-title">QueryLens</div>
          <div className="logo-subtitle">NL2SQL Clarification Engine</div>
        </div>
      </div>

      <div className="header-badges">
        <div className={`badge ${wsConnected ? 'badge-ws-online' : 'badge-ws-offline'}`}>
          <Zap size={12} />
          {wsConnected ? 'WebSocket Live' : 'REST API Mode'}
        </div>

        <div className="badge" style={{ borderColor: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' }}>
          <Cpu size={12} />
          FastAPI + LangChain
        </div>

        <button className="btn-secondary" onClick={onOpenSchemaModal}>
          <Database size={16} />
          Schema Metadata
        </button>

        <button className="btn-secondary" onClick={onOpenArchModal}>
          <Layers size={16} />
          Architecture Diagram
        </button>
      </div>
    </header>
  );
}
