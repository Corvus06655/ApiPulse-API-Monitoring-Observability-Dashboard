import { useMemo, useState } from 'react';
import { Activity, ExternalLink, Globe2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import { formatDate, formatLatency, getHost } from '../lib/format';

export default function MonitoredApis({ targets, loading, unavailable = false, onRefresh, onAdd, onOpen, onEdit, onDelete, onCheck, checkingId }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const filtered = useMemo(() => targets.filter((target) => {
    const term = search.trim().toLowerCase();
    const matchesText = !term || `${target.name} ${target.url}`.toLowerCase().includes(term);
    const status = target.latestCheck?.is_healthy === true ? 'healthy' : target.latestCheck?.is_healthy === false ? 'down' : 'unknown';
    return matchesText && (filter === 'all' || status === filter);
  }), [targets, search, filter]);

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div><div className="eyebrow page-eyebrow">YOUR MONITORING INVENTORY</div><h1>Monitored APIs</h1><p>Manage endpoints and trigger a live check against the configured backend.</p></div>
        <button className="button button-primary add-api-button" type="button" onClick={onAdd}><Plus size={16} />Add API</button>
      </section>
      <section className="panel inventory-panel">
        <div className="inventory-toolbar">
          <div className="search-wrap"><Search size={16} aria-hidden="true" /><label className="visually-hidden" htmlFor="api-search">Search endpoints</label><input id="api-search" className="search-input" type="search" placeholder="Search endpoints…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <label className="filter-wrap"><span>Status</span><select className="select-input" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All statuses</option><option value="healthy">Healthy</option><option value="down">Down</option><option value="unknown">No check yet</option></select></label>
          <span className="inventory-count">{unavailable ? '—' : filtered.length} <span>of {unavailable ? '—' : targets.length}</span></span>
        </div>
        {loading ? <div className="inventory-loading" aria-busy="true"><span className="skeleton-line full" /><span className="skeleton-line full" /><span className="skeleton-line full" /></div> : null}
        {!loading && !targets.length && unavailable ? <EmptyState icon={Globe2} title="Endpoint data unavailable" description="The backend could not return your monitored APIs. Retry after the FastAPI service is reachable." action={<button className="button button-secondary" type="button" onClick={onRefresh}>Try again</button>} className="table-empty" /> : null}
        {!loading && !targets.length && !unavailable ? <EmptyState icon={Globe2} title="No endpoints yet" description="Add the APIs you want this service to monitor. Adding a target does not assume it is healthy." action={<button className="button button-primary" type="button" onClick={onAdd}><Plus size={15} />Add API</button>} className="table-empty" /> : null}
        {!loading && targets.length > 0 && !filtered.length ? <EmptyState icon={Search} title="No matching endpoints" description="Try a different name, URL, or health-status filter." className="table-empty" /> : null}
        {!loading && filtered.length > 0 ? (
          <div className="api-list">
            {filtered.map((target) => (
              <article className="api-row" key={target.id}>
                <button className="api-main" type="button" onClick={() => onOpen(target.id)}>
                  <span className="api-avatar"><Globe2 size={18} aria-hidden="true" /></span>
                  <span className="api-copy"><strong>{target.name}</strong><span className="api-url">{getHost(target.url)}<ExternalLink size={12} aria-hidden="true" /></span></span>
                </button>
                <div className="api-last-check"><StatusBadge check={target.latestCheck} compact /><span>{target.latestCheck ? `${formatLatency(target.latestCheck.response_time_ms)} · ${formatDate(target.latestCheck.checked_at)}` : 'Awaiting first check'}</span></div>
                <div className="api-stats"><span>Uptime</span><strong>{target.stats?.total_checks ? `${Number(target.stats.uptime_percentage).toFixed(1)}%` : '—'}</strong></div>
                <div className="api-stats api-avg"><span>Avg response</span><strong>{target.stats?.total_checks ? formatLatency(target.stats.average_response_time_ms) : '—'}</strong></div>
                <div className="api-actions">
                  <button className="icon-button" type="button" onClick={() => onCheck(target.id)} disabled={String(checkingId) === String(target.id)} aria-label={`Run check for ${target.name}`} title="Run check">{String(checkingId) === String(target.id) ? <span className="button-spinner" /> : <Activity size={16} />}</button>
                  <button className="icon-button" type="button" onClick={() => onEdit(target)} aria-label={`Edit ${target.name}`} title="Edit"><Pencil size={15} /></button>
                  <button className="icon-button danger-icon" type="button" onClick={() => onDelete(target)} aria-label={`Delete ${target.name}`} title="Delete"><Trash2 size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
      <p className="page-note">Health is based on the latest available check record, not on whether a target exists.</p>
    </div>
  );
}
