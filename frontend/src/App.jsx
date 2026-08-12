import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import AmbiguityCard from './components/AmbiguityCard';
import SQLExplorer from './components/SQLExplorer';
import ResultsVisualizer from './components/ResultsVisualizer';
import DataTable from './components/DataTable';
import ArchitectureModal from './components/ArchitectureModal';
import SchemaModal from './components/SchemaModal';
import { Send, Zap, Play, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const BENCHMARK_PRESETS = [
  { text: "Show me top sales", category: "Vague Metric & Scope" },
  { text: "Which customers bought the most?", category: "Entity Aggregation" },
  { text: "Total revenue in 2011 by country", category: "Country Breakdown" },
  { text: "Top 5 best selling products", category: "Volume vs Revenue" },
  { text: "Cancelled orders summary", category: "Cancellation Scope" },
  { text: "Monthly revenue trend", category: "Time Series" }
];

export default function App() {
  const [prompt, setPrompt] = useState('Show me top sales');
  const [wsConnected, setWsConnected] = useState(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);

  // Engine state
  const [ambiguityData, setAmbiguityData] = useState(null);
  const [selections, setSelections] = useState({
    metric: 'revenue',
    groupBy: 'description',
    timeframe: 'ALL',
    filterCancel: 'EXCLUDE',
    limit: 10
  });
  const [refinedIntent, setRefinedIntent] = useState(null);
  const [sqlData, setSqlData] = useState(null);
  const [queryResult, setQueryResult] = useState(null);
  const [schemaData, setSchemaData] = useState(null);

  const wsRef = useRef(null);

  // Initialize WebSocket connection & load schema
  useEffect(() => {
    fetchSchema();
    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.hostname}:8000/ws/clarify`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
        console.log('[WebSocket] Connected to QueryLens FastAPI WS');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'AMBIGUITY_DETECTED') {
            setAmbiguityData(data.data);
            if (data.data?.defaultSuggestions) {
              setSelections(data.data.defaultSuggestions);
            }
          } else if (data.type === 'PIPELINE_COMPLETE') {
            setRefinedIntent(data.refinedIntent);
            setSqlData(data.sqlData);
            setQueryResult(data.execution);
          }
        } catch (err) {
          console.error('[WebSocket] Parsing error:', err);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        console.log('[WebSocket] Disconnected, using REST API fallback');
      };

      ws.onerror = () => {
        setWsConnected(false);
      };

      wsRef.current = ws;
    } catch (e) {
      setWsConnected(false);
    }
  };

  const fetchSchema = async () => {
    try {
      const res = await axios.get('/api/schema');
      setSchemaData(res.data);
    } catch (e) {
      // Fallback schema data
      setSchemaData({
        tableName: 'online_retail',
        totalRecords: 541910,
        columns: [
          { name: 'InvoiceNo', type: 'VARCHAR(20)', description: 'Invoice number' },
          { name: 'StockCode', type: 'VARCHAR(20)', description: 'Product code' },
          { name: 'Description', type: 'VARCHAR(255)', description: 'Product description' },
          { name: 'Quantity', type: 'INTEGER', description: 'Quantity of items' },
          { name: 'InvoiceDate', type: 'TIMESTAMP', description: 'Transaction date' },
          { name: 'UnitPrice', type: 'NUMERIC(10,2)', description: 'Unit price in GBP' },
          { name: 'CustomerID', type: 'VARCHAR(20)', description: 'Customer ID' },
          { name: 'Country', type: 'VARCHAR(100)', description: 'Customer location' }
        ],
        metrics: {
          revenue: 'SUM(Quantity * UnitPrice)',
          quantity: 'SUM(Quantity)',
          orders: 'COUNT(DISTINCT InvoiceNo)',
          avgOrderValue: 'SUM(Quantity * UnitPrice) / COUNT(DISTINCT InvoiceNo)'
        }
      });
    }
  };

  // Execute NL2SQL pipeline
  const runPipeline = async (targetPrompt = prompt, customSelections = selections) => {
    if (wsConnected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Stream via WebSocket
      wsRef.current.send(JSON.stringify({
        action: 'CLARIFY_SELECTIONS',
        prompt: targetPrompt,
        selections: customSelections
      }));
    } else {
      // REST API fallback
      try {
        const res = await axios.post('/api/pipeline', {
          prompt: targetPrompt,
          selections: customSelections
        });
        setAmbiguityData(res.data.ambiguity);
        setRefinedIntent(res.data.refinedIntent);
        setSqlData(res.data.sqlData);
        setQueryResult(res.data.execution);
      } catch (err) {
        console.error('REST Pipeline error:', err);
      }
    }
  };

  // Initial load auto-trigger
  useEffect(() => {
    runPipeline('Show me top sales', selections);
  }, []);

  const handleSelectionChange = (key, value) => {
    const updated = { ...selections, [key]: value };
    setSelections(updated);
    runPipeline(prompt, updated);
  };

  const handlePresetClick = (presetText) => {
    setPrompt(presetText);
    let defaultSel = { ...selections };
    if (presetText.includes('customers')) defaultSel.groupBy = 'customerID';
    else if (presetText.includes('country')) defaultSel.groupBy = 'country';
    else if (presetText.includes('products')) defaultSel.groupBy = 'description';
    else if (presetText.includes('Monthly')) defaultSel.groupBy = 'yearMonth';

    if (presetText.includes('2011')) defaultSel.timeframe = '2011';
    else if (presetText.includes('2010')) defaultSel.timeframe = '2010';

    if (presetText.includes('Cancelled')) defaultSel.filterCancel = 'ONLY';

    setSelections(defaultSel);
    runPipeline(presetText, defaultSel);
  };

  return (
    <div className="app-root">
      <Header 
        wsConnected={wsConnected} 
        onOpenArchModal={() => setIsArchModalOpen(true)}
        onOpenSchemaModal={() => setIsSchemaModalOpen(true)}
      />

      <main className="main-container">
        {/* Stage 1: User Ambiguous Question Input Gateway */}
        <section className="glass-panel prompt-section">
          <div className="section-title">
            <span className="section-num">Stage 1</span>
            User Ambiguous Question (Input Gateway & API Endpoint)
          </div>

          <div className="prompt-input-wrapper">
            <input 
              type="text" 
              className="prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runPipeline(prompt, selections)}
              placeholder="Ask a natural language query e.g., 'Show me top sales'..."
            />
            <button className="btn-primary" onClick={() => runPipeline(prompt, selections)}>
              <Send size={16} /> Analyze Query
            </button>
          </div>

          <div className="presets-grid">
            {BENCHMARK_PRESETS.map((item, idx) => (
              <div 
                key={idx} 
                className="preset-chip"
                onClick={() => handlePresetClick(item.text)}
              >
                ⚡ {item.text}
              </div>
            ))}
          </div>
        </section>

        {/* Stage 2 & 3: Clarification Engine Core & SQL Generation Grid */}
        <section className="pipeline-grid">
          <AmbiguityCard 
            ambiguityData={ambiguityData}
            selections={selections}
            onSelectionChange={handleSelectionChange}
            refinedIntent={refinedIntent}
          />

          <SQLExplorer 
            sqlData={sqlData}
            latencyMs={queryResult?.latencyMs}
          />
        </section>

        {/* Stage 4: Results Processor & Visualizer */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <ResultsVisualizer 
            kpis={queryResult?.kpis}
            queryResult={queryResult}
          />

          <DataTable 
            queryResult={queryResult}
          />
        </section>
      </main>

      {/* Modals */}
      <ArchitectureModal 
        isOpen={isArchModalOpen} 
        onClose={() => setIsArchModalOpen(false)} 
      />

      <SchemaModal 
        isOpen={isSchemaModalOpen} 
        onClose={() => setIsSchemaModalOpen(false)}
        schemaData={schemaData}
      />
    </div>
  );
}
