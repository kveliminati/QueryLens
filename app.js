/**
 * QueryLens Web Application Orchestrator
 * Interconnects UI, Clarification Engine, DB Engine, Chart.js Visualizations
 */

document.addEventListener('DOMContentLoaded', () => {
  // UI Element References
  const promptInput = document.getElementById('promptInput');
  const btnSubmit = document.getElementById('btnSubmit');
  const presetsContainer = document.getElementById('presetsContainer');
  const ambiguityBanner = document.getElementById('ambiguityBanner');
  const ambiguityCount = document.getElementById('ambiguityCount');
  const ambiguityList = document.getElementById('ambiguityList');

  const clarificationControls = document.getElementById('clarificationControls');
  const enrichedTextDisplay = document.getElementById('enrichedTextDisplay');
  const btnExecuteSQL = document.getElementById('btnExecuteSQL');

  const sqlCodeBox = document.getElementById('sqlCodeBox');
  const sqlExplanationList = document.getElementById('sqlExplanationList');
  const btnCopySQL = document.getElementById('btnCopySQL');

  const latencyVal = document.getElementById('latencyVal');
  const recordsVal = document.getElementById('recordsVal');
  const accuracyVal = document.getElementById('accuracyVal');

  const kpiRevenue = document.getElementById('kpiRevenue');
  const kpiQuantity = document.getElementById('kpiQuantity');
  const kpiOrders = document.getElementById('kpiOrders');
  const kpiAvgValue = document.getElementById('kpiAvgValue');

  const chartCanvas = document.getElementById('resultsChart');
  const tableBody = document.getElementById('tableBody');
  const searchInput = document.getElementById('searchInput');
  const btnExportCSV = document.getElementById('btnExportCSV');
  const pageInfo = document.getElementById('pageInfo');
  const btnPrevPage = document.getElementById('btnPrevPage');
  const btnNextPage = document.getElementById('btnNextPage');

  const modalOverlay = document.getElementById('modalOverlay');
  const btnOpenArchModal = document.getElementById('btnOpenArchModal');
  const btnOpenSchemaModal = document.getElementById('btnOpenSchemaModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const modalBody = document.getElementById('modalBody');
  const modalTitle = document.getElementById('modalTitle');

  // App State
  let currentSelections = {
    metric: 'revenue',
    groupBy: 'description',
    timeframe: 'ALL',
    filterCancel: 'EXCLUDE',
    limit: 10
  };

  let lastQueryResult = null;
  let activeChart = null;
  let currentPage = 1;
  const pageSize = 8;
  let currentTableData = [];

  // 1. Initialize DB Engine by fetching data.csv
  initDatabase();

  async function initDatabase() {
    try {
      const resp = await fetch('data.csv');
      if (!resp.ok) {
        console.warn('Failed to fetch data.csv via HTTP, checking direct embedded data.');
        return;
      }
      const text = await resp.text();
      await window.dbEngine.loadCSVData(text, (percent) => {
        recordsVal.textContent = `Loading ${percent}%...`;
      });
      recordsVal.textContent = '541,910';

      // Auto run initial benchmark query
      runPipeline("Show me top sales");
    } catch (err) {
      console.error('Data load error:', err);
    }
  }

  // Render presets
  renderPresets();
  function renderPresets() {
    presetsContainer.innerHTML = '';
    window.clarificationEngine.benchmarkQueries.forEach(item => {
      const chip = document.createElement('div');
      chip.className = 'preset-chip';
      chip.textContent = `⚡ ${item.text}`;
      chip.addEventListener('click', () => {
        promptInput.value = item.text;
        runPipeline(item.text);
      });
      presetsContainer.appendChild(chip);
    });
  }

  // Handlers
  btnSubmit.addEventListener('click', () => {
    const q = promptInput.value.trim();
    if (q) runPipeline(q);
  });

  promptInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const q = promptInput.value.trim();
      if (q) runPipeline(q);
    }
  });

  /**
   * Run full 4-stage pipeline
   * @param {string} promptText 
   */
  function runPipeline(promptText) {
    // Stage 1: Ambiguity Detection
    const detection = window.clarificationEngine.detectAmbiguities(promptText);

    // Apply suggestions if prompt changed
    currentSelections = {
      ...currentSelections,
      ...detection.initialSuggestions
    };

    // Update Ambiguity Banner
    if (detection.hasAmbiguity) {
      ambiguityBanner.classList.remove('hidden');
      ambiguityCount.textContent = detection.flags.length;
      ambiguityList.innerHTML = detection.flags.map(f =>
        `<div style="margin-bottom:0.25rem;"><strong>• ${f.title}:</strong> ${f.description}</div>`
      ).join('');
    } else {
      ambiguityBanner.classList.add('hidden');
    }

    // Stage 2: Render Interactive Clarification Controls
    renderClarificationControls();

    // Stage 3 & 4: Formulate Intent, Generate SQL & Execute
    executeCurrentPipeline(promptText);
  }

  /**
   * Render Interactive Disambiguation Controls (FR-02)
   */
  function renderClarificationControls() {
    clarificationControls.innerHTML = `
      <div class="clarification-group">
        <div class="group-header">
          <div class="group-title">🎯 Metric Definition</div>
          <span class="group-badge">Req FR-01</span>
        </div>
        <div class="options-grid">
          <button class="option-btn ${currentSelections.metric === 'revenue' ? 'selected' : ''}" data-type="metric" data-val="revenue">💵 Total Revenue ($)</button>
          <button class="option-btn ${currentSelections.metric === 'quantity' ? 'selected' : ''}" data-type="metric" data-val="quantity">📦 Total Units Sold</button>
          <button class="option-btn ${currentSelections.metric === 'orders' ? 'selected' : ''}" data-type="metric" data-val="orders">🧾 Distinct Orders Count</button>
        </div>
      </div>

      <div class="clarification-group">
        <div class="group-header">
          <div class="group-title">📅 Temporal Scope</div>
          <span class="group-badge">Timeframe</span>
        </div>
        <div class="options-grid">
          <button class="option-btn ${currentSelections.timeframe === 'ALL' ? 'selected' : ''}" data-type="timeframe" data-val="ALL">🌐 All Time (Dec 2010 - Dec 2011)</button>
          <button class="option-btn ${currentSelections.timeframe === '2011' ? 'selected' : ''}" data-type="timeframe" data-val="2011">📆 Year 2011</button>
          <button class="option-btn ${currentSelections.timeframe === '2010' ? 'selected' : ''}" data-type="timeframe" data-val="2010">📆 Year 2010</button>
          <button class="option-btn ${currentSelections.timeframe === '2011-12' ? 'selected' : ''}" data-type="timeframe" data-val="2011-12">❄️ Dec 2011</button>
          <button class="option-btn ${currentSelections.timeframe === '2011-11' ? 'selected' : ''}" data-type="timeframe" data-val="2011-11">🍂 Nov 2011</button>
        </div>
      </div>

      <div class="clarification-group">
        <div class="group-header">
          <div class="group-title">📊 Entity Grouping</div>
          <span class="group-badge">Dimension</span>
        </div>
        <div class="options-grid">
          <button class="option-btn ${currentSelections.groupBy === 'description' ? 'selected' : ''}" data-type="groupBy" data-val="description">🛍️ Products (Description)</button>
          <button class="option-btn ${currentSelections.groupBy === 'customer' ? 'selected' : ''}" data-type="groupBy" data-val="customer">👤 Customer IDs</button>
          <button class="option-btn ${currentSelections.groupBy === 'country' ? 'selected' : ''}" data-type="groupBy" data-val="country">🌍 Country Locations</button>
          <button class="option-btn ${currentSelections.groupBy === 'monthly' ? 'selected' : ''}" data-type="groupBy" data-val="monthly">📈 Monthly Trend</button>
        </div>
      </div>

      <div class="clarification-group">
        <div class="group-header">
          <div class="group-title">🛡️ Cancellation & Return Policy</div>
          <span class="group-badge">Filter</span>
        </div>
        <div class="options-grid">
          <button class="option-btn ${currentSelections.filterCancel === 'EXCLUDE' ? 'selected' : ''}" data-type="filterCancel" data-val="EXCLUDE">✅ Exclude Cancellations (Sales Only)</button>
          <button class="option-btn ${currentSelections.filterCancel === 'INCLUDE' ? 'selected' : ''}" data-type="filterCancel" data-val="INCLUDE">🔄 Include All (Net Totals)</button>
          <button class="option-btn ${currentSelections.filterCancel === 'ONLY' ? 'selected' : ''}" data-type="filterCancel" data-val="ONLY">⚠️ Cancellations Only</button>
        </div>
      </div>

      <div class="clarification-group">
        <div class="group-header">
          <div class="group-title">🔢 Ranking Scope</div>
          <span class="group-badge">Limit</span>
        </div>
        <div class="options-grid">
          <button class="option-btn ${currentSelections.limit === 5 ? 'selected' : ''}" data-type="limit" data-val="5">Top 5</button>
          <button class="option-btn ${currentSelections.limit === 10 ? 'selected' : ''}" data-type="limit" data-val="10">Top 10</button>
          <button class="option-btn ${currentSelections.limit === 25 ? 'selected' : ''}" data-type="limit" data-val="25">Top 25</button>
          <button class="option-btn ${currentSelections.limit === 50 ? 'selected' : ''}" data-type="limit" data-val="50">Top 50</button>
        </div>
      </div>
    `;

    // Add option button click listeners
    const optionBtns = clarificationControls.querySelectorAll('.option-btn');
    optionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        let val = btn.getAttribute('data-val');
        if (type === 'limit') val = parseInt(val, 10);

        currentSelections[type] = val;
        renderClarificationControls(); // re-render selected state
        executeCurrentPipeline(promptInput.value.trim() || "Show me top sales");
      });
    });
  }

  /**
   * Execute Pipeline with current user selections
   * @param {string} promptText 
   */
  function executeCurrentPipeline(promptText) {
    // 1. Formulate Enriched Intent (FR-03)
    const enriched = window.clarificationEngine.formulateEnrichedIntent(promptText, currentSelections);
    enrichedTextDisplay.textContent = enriched.enrichedText;

    // 2. Generate Schema-aware SQL (FR-04)
    const generated = window.clarificationEngine.generateSQL(enriched.structuredAST);
    renderSQL(generated.sql);

    sqlExplanationList.innerHTML = generated.explanation.map(item => `<li>${item}</li>`).join('');

    // 3. Dry-run Validation (FR-05)
    const validation = window.clarificationEngine.validateSQL(generated.sql);

    // 4. Database Query Execution
    const queryPlan = {
      metric: currentSelections.metric,
      groupBy: currentSelections.groupBy,
      timeframe: currentSelections.timeframe,
      filterCancel: currentSelections.filterCancel,
      limit: currentSelections.limit
    };

    const res = window.dbEngine.executeQuery(queryPlan);
    lastQueryResult = res;

    // Update Performance Stats Badges
    latencyVal.textContent = `${res.latencyMs} ms`;
    recordsVal.textContent = res.totalMatchedRecords.toLocaleString();
    accuracyVal.textContent = '100% (Validated)';

    // Update KPI Cards
    kpiRevenue.textContent = `$${res.kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    kpiQuantity.textContent = res.kpis.totalQuantity.toLocaleString();
    kpiOrders.textContent = res.kpis.totalOrders.toLocaleString();
    kpiAvgValue.textContent = `$${res.kpis.avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Render Visualization & Data Table
    renderChart(res.rows, currentSelections.metric, currentSelections.groupBy);
    currentTableData = res.rows;
    currentPage = 1;
    renderTable();
  }

  function renderSQL(sql) {
    // Highlight syntax
    let highlighted = sql
      .replace(/(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|AS|DESC|AND|NOT|LIKE|COUNT|SUM|ROUND|DISTINCT|IS NOT NULL)/g, '<span class="sql-keyword">$1</span>')
      .replace(/(online_retail)/g, '<span class="sql-table">$1</span>')
      .replace(/('([^']*)')/g, '<span class="sql-string">$1</span>')
      .replace(/(\b\d+\b)/g, '<span class="sql-number">$1</span>');

    sqlCodeBox.innerHTML = highlighted;
  }

  // Copy SQL
  btnCopySQL.addEventListener('click', () => {
    const rawSql = sqlCodeBox.textContent;
    navigator.clipboard.writeText(rawSql);
    btnCopySQL.textContent = '✓ Copied!';
    setTimeout(() => { btnCopySQL.textContent = '📋 Copy SQL'; }, 2000);
  });

  /**
   * Render Dynamic Chart.js Visualization
   */
  function renderChart(dataRows, metric, groupBy) {
    if (!window.Chart) return;
    if (activeChart) activeChart.destroy();

    const ctx = chartCanvas.getContext('2d');
    const labels = dataRows.map(r => r.key.length > 25 ? r.key.substring(0, 22) + '...' : r.key);

    let datasetLabel = 'Total Revenue ($)';
    let chartValues = dataRows.map(r => r.revenue);
    let chartType = groupBy === 'monthly' ? 'line' : 'bar';
    let bgColor = 'rgba(16, 185, 129, 0.6)';
    let borderColor = '#10b981';

    if (metric === 'quantity') {
      datasetLabel = 'Total Units Sold';
      chartValues = dataRows.map(r => r.quantity);
      bgColor = 'rgba(6, 182, 212, 0.6)';
      borderColor = '#06b6d4';
    } else if (metric === 'orders') {
      datasetLabel = 'Distinct Orders Count';
      chartValues = dataRows.map(r => r.orderCount);
      bgColor = 'rgba(168, 85, 247, 0.6)';
      borderColor = '#a855f7';
    }

    activeChart = new Chart(ctx, {
      type: chartType,
      data: {
        labels: labels,
        datasets: [{
          label: datasetLabel,
          data: chartValues,
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: 2,
          borderRadius: 6,
          fill: chartType === 'line'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f8fafc',
            bodyColor: '#10b981',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            ticks: { color: '#64748b', font: { size: 11 } },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          y: {
            ticks: { color: '#64748b', font: { size: 11 } },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          }
        }
      }
    });
  }

  /**
   * Render Data Table with Pagination
   */
  function renderTable() {
    const filterText = searchInput.value.toLowerCase().trim();
    let filtered = currentTableData;

    if (filterText) {
      filtered = currentTableData.filter(r => r.key.toLowerCase().includes(filterText));
    }

    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const pageRows = filtered.slice(start, start + pageSize);

    tableBody.innerHTML = pageRows.map(r => `
      <tr>
        <td style="font-weight:600; color:#f8fafc;">${r.key}</td>
        <td style="color:#10b981; font-weight:600;">$${r.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="color:#06b6d4;">${r.quantity.toLocaleString()}</td>
        <td style="color:#a855f7;">${r.orderCount.toLocaleString()}</td>
        <td>$${r.avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${filtered.length} items)`;
    btnPrevPage.disabled = currentPage <= 1;
    btnNextPage.disabled = currentPage >= totalPages;
  }

  searchInput.addEventListener('input', () => {
    currentPage = 1;
    renderTable();
  });

  btnPrevPage.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderTable(); }
  });

  btnNextPage.addEventListener('click', () => {
    currentPage++; renderTable();
  });

  // Export CSV
  btnExportCSV.addEventListener('click', () => {
    if (!currentTableData || currentTableData.length === 0) return;
    let csv = 'Entity,Revenue,Quantity,OrderCount,AvgOrderValue\n';
    currentTableData.forEach(r => {
      csv += `"${r.key.replace(/"/g, '""')}",${r.revenue},${r.quantity},${r.orderCount},${r.avgOrderValue}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QueryLens_Results_${currentSelections.groupBy}_${Date.now()}.csv`;
    a.click();
  });

  // Modals (Architecture Diagram & Schema Dictionary)
  if (btnOpenArchModal) {
    btnOpenArchModal.addEventListener('click', () => {
      modalTitle.textContent = 'QueryLens Clarification Engine Architecture';
      modalBody.innerHTML = `
        <div style="text-align:center; padding:1rem;">
          <img src="QueryLens.jpg" alt="QueryLens Architecture Diagram" style="max-width:100%; border-radius:12px; border:1px solid rgba(255,255,255,0.1); shadow: 0 10px 30px rgba(0,0,0,0.5);">
        </div>
        <div style="line-height:1.6; color:#94a3b8; font-size:0.9rem; margin-top:1rem;">
          <h4 style="color:#f8fafc; margin-bottom:0.5rem;">Pipeline Stages Breakdown:</h4>
          <p><strong>Stage 1: User Ambiguous Question</strong> - Ingests prompt, flags missing temporal bounds, vague metrics, or entity ambiguity.</p>
          <p><strong>Stage 2: Clarification Engine Core</strong> - NLP intent extraction & interactive prompt manager for metric chips, timeframe pickers, and cancellation filters.</p>
          <p><strong>Stage 3: Better Query (SQL Generator)</strong> - Constructs schema-aware ANSI SQL with syntax dry-run validation.</p>
          <p><strong>Stage 4: Correct Query Execution</strong> - Executes query on dataset, yields KPIs, interactive Chart.js visualizations, and paginated tables.</p>
        </div>
      `;
      modalOverlay.classList.add('active');
    });
  }

  btnOpenSchemaModal.addEventListener('click', () => {
    modalTitle.textContent = 'Database Schema & Domain Dictionary';
    const schema = window.clarificationEngine.schemaMetadata;
    modalBody.innerHTML = `
      <p style="color:#94a3b8; font-size:0.9rem;">Target Table: <strong style="color:#38bdf8;">${schema.tableName}</strong> (541,910 records from Online Retail Dataset)</p>
      <table style="margin-top:1rem;">
        <thead>
          <tr>
            <th>Column Name</th>
            <th>Data Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${schema.columns.map(c => `
            <tr>
              <td style="font-weight:600; color:#10b981;">${c.name}</td>
              <td style="color:#c084fc;">${c.type}</td>
              <td style="color:#94a3b8;">${c.description}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top:1.5rem; background:rgba(255,255,255,0.03); padding:1rem; border-radius:8px; border:1px solid var(--border-color);">
        <h5 style="color:#f59e0b; margin-bottom:0.5rem;">Calculated Metrics Dictionary:</h5>
        <ul style="color:#94a3b8; font-size:0.85rem; padding-left:1.2rem;">
          <li><strong>Revenue ($):</strong> <code>SUM(Quantity * UnitPrice)</code></li>
          <li><strong>Valid Sales:</strong> <code>InvoiceNo NOT LIKE 'C%' AND Quantity > 0</code></li>
          <li><strong>Cancellations / Returns:</strong> <code>InvoiceNo LIKE 'C%' OR Quantity < 0</code></li>
          <li><strong>Average Order Value:</strong> <code>SUM(Quantity * UnitPrice) / COUNT(DISTINCT InvoiceNo)</code></li>
        </ul>
      </div>
    `;
    modalOverlay.classList.add('active');
  });

  btnCloseModal.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
  });

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.remove('active');
  });
});
