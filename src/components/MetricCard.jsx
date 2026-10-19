export default function MetricCard({ label, value, detail, icon: Icon, tone = 'lime', loading = false }) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-topline">
        <span className="metric-label">{label}</span>
        <span className="metric-icon" aria-hidden="true"><Icon size={17} strokeWidth={1.8} /></span>
      </div>
      {loading ? <span className="metric-value skeleton-block" aria-label="Loading" /> : <strong className="metric-value">{value}</strong>}
      <span className="metric-detail">{detail}</span>
    </article>
  );
}
