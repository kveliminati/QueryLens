import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Premium color palette
const COLORS = [
  "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#6366F1", "#14B8A6",
  "#F97316", "#84CC16", "#A855F7", "#22D3EE",
];

const TOOLTIP_STYLE = {
  backgroundColor: "rgba(15, 15, 30, 0.95)",
  border: "1px solid rgba(139, 92, 246, 0.3)",
  borderRadius: "12px",
  color: "#E2E8F0",
  fontSize: "13px",
  padding: "10px 14px",
};

function formatNumber(value) {
  if (typeof value !== "number") return value;
  if (Math.abs(value) >= 1_000_000)
    return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000)
    return `${(value / 1_000).toFixed(1)}K`;
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
}

function tooltipFormatter(value) {
  if (typeof value !== "number") return value;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function buildChartData(columns, rows) {
  return rows.map((row) => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

function NumberCard({ columns, rows }) {
  return (
    <div className="number-cards">
      {columns.map((col, i) => {
        const value = rows[0]?.[i];
        return (
          <div key={col} className="number-card animate-in">
            <div className="number-card-label">
              {col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </div>
            <div className="number-card-value">
              {typeof value === "number"
                ? value.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })
                : value ?? "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ResultsChart({
  chartSuggestion,
  columns,
  rows,
  xColumn,
  yColumns,
}) {
  if (!chartSuggestion || chartSuggestion === "table" || !rows?.length)
    return null;

  if (chartSuggestion === "number_card") {
    return <NumberCard columns={columns} rows={rows} />;
  }

  const data = buildChartData(columns, rows);
  const xKey = xColumn || columns[0];
  const yKeys = yColumns || columns.filter((c) => c !== xKey);

  return (
    <div className="chart-container animate-in">
      <div className="chart-header">
        <h3 className="chart-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Visualization
        </h3>
        <span className="chart-type-badge">{chartSuggestion.replace(/_/g, " ")}</span>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={380}>
          {chartSuggestion === "bar" || chartSuggestion === "grouped_bar" ? (
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis
                dataKey={xKey}
                stroke="#94A3B8"
                tick={{ fill: "#94A3B8", fontSize: 12 }}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={70}
              />
              <YAxis
                stroke="#94A3B8"
                tick={{ fill: "#94A3B8", fontSize: 12 }}
                tickFormatter={formatNumber}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={tooltipFormatter}
              />
              <Legend wrapperStyle={{ color: "#94A3B8", paddingTop: "10px" }} />
              {yKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={COLORS[i % COLORS.length]}
                  radius={[6, 6, 0, 0]}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              ))}
            </BarChart>
          ) : chartSuggestion === "line" || chartSuggestion === "multi_line" ? (
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis
                dataKey={xKey}
                stroke="#94A3B8"
                tick={{ fill: "#94A3B8", fontSize: 12 }}
              />
              <YAxis
                stroke="#94A3B8"
                tick={{ fill: "#94A3B8", fontSize: 12 }}
                tickFormatter={formatNumber}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={tooltipFormatter}
              />
              <Legend wrapperStyle={{ color: "#94A3B8" }} />
              {yKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={3}
                  dot={{ fill: COLORS[i % COLORS.length], r: 5, strokeWidth: 2 }}
                  activeDot={{ r: 7, strokeWidth: 2 }}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              ))}
            </LineChart>
          ) : chartSuggestion === "pie" ? (
            <PieChart>
              <Pie
                data={data}
                dataKey={yKeys[0]}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius={140}
                innerRadius={70}
                paddingAngle={3}
                animationDuration={1000}
                animationEasing="ease-out"
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(1)}%`
                }
                labelLine={{ stroke: "#94A3B8" }}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="rgba(15, 15, 30, 0.5)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={tooltipFormatter}
              />
              <Legend wrapperStyle={{ color: "#94A3B8" }} />
            </PieChart>
          ) : null}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
