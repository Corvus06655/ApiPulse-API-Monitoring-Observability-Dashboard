export function MetricSkeletons() {
  return (
    <div className="metric-grid" aria-label="Loading dashboard metrics" aria-busy="true">
      {[0, 1, 2, 3].map((item) => <div className="metric-card skeleton-card" key={item}><span className="skeleton-line short" /><span className="skeleton-line large" /><span className="skeleton-line medium" /></div>)}
    </div>
  );
}

export function PanelSkeleton({ rows = 4 }) {
  return (
    <div className="panel panel-skeleton" aria-label="Loading data" aria-busy="true">
      <span className="skeleton-line medium" />
      {Array.from({ length: rows }, (_, index) => <span className="skeleton-line full" key={index} />)}
    </div>
  );
}
