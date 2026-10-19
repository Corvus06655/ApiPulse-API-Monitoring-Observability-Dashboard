import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import EmptyState from './EmptyState';
import { formatDate } from '../lib/format';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <span>{point.target_name}</span>
      <strong>{Number(point.response_time_ms).toFixed(1)} ms</strong>
      <small>{formatDate(point.checked_at, { year: 'numeric' })}</small>
    </div>
  );
}

export default function ResponseTimeChart({ records = [], unavailable = false }) {
  const points = [...records]
    .filter((record) => Number.isFinite(Number(record.response_time_ms)) && record.checked_at)
    .sort((a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime())
    .map((record, index) => ({
      ...record,
      chartKey: `${record.target_id}-${record.id ?? index}`,
      timeLabel: formatDate(record.checked_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    }));

  return (
    <section className="chart-panel panel">
      <div className="panel-heading chart-heading">
        <div>
          <div className="eyebrow">LATENCY TELEMETRY</div>
          <h2>Response time</h2>
        </div>
        {points.length > 0 ? <span className="chart-count">{points.length} recorded checks</span> : null}
      </div>
      {points.length < 2 ? (
        <EmptyState
          title={unavailable ? 'History unavailable' : 'Not enough history to chart'}
          description={unavailable ? 'The backend did not return usable check history. No response-time trend is inferred.' : 'A response-time trend appears when at least two timestamped checks are available. No sample points are generated.'}
          className="chart-empty"
        />
      ) : (
        <div className="chart-wrap" role="img" aria-label={`Response-time trend based on ${points.length} recorded checks`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 12, right: 12, bottom: 2, left: -18 }}>
              <CartesianGrid stroke="#242a29" strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="timeLabel" tick={{ fill: '#707a75', fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={34} />
              <YAxis tick={{ fill: '#707a75', fontSize: 10 }} tickLine={false} axisLine={false} width={48} tickFormatter={(value) => `${value} ms`} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#38433d', strokeDasharray: '3 4' }} />
              <Line type="monotone" dataKey="response_time_ms" stroke="#b8ff64" strokeWidth={2} dot={{ r: 2.8, fill: '#b8ff64', stroke: '#111415', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#36dcc8', stroke: '#0b0d0e', strokeWidth: 2 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
