import { useEffect } from 'react';
import { Activity, ArrowUpRight, Clock3, Pencil, Trash2, X } from 'lucide-react';
import { formatDate, formatFullDate, formatLatency, formatPercent } from '../lib/format';
import StatusBadge from './StatusBadge';

export default function TargetDetailsDrawer({ target, onClose, onCheck, onEdit, onDelete, checking = false }) {
  useEffect(() => {
    if (!target) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [target, onClose]);

  if (!target) return null;
  const stats = target.stats;

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="details-drawer" role="dialog" aria-modal="true" aria-labelledby="details-title">
        <header className="drawer-header">
          <div className="drawer-icon"><Activity size={19} aria-hidden="true" /></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close target details"><X size={19} /></button>
        </header>
        <div className="drawer-body">
          <div className="eyebrow">MONITORED ENDPOINT</div>
          <h2 id="details-title">{target.name}</h2>
          <a className="drawer-url" href={target.url} target="_blank" rel="noreferrer">{target.url}<ArrowUpRight size={13} aria-hidden="true" /></a>
          <div className="drawer-status"><StatusBadge check={target.latestCheck} /><span>Created {formatDate(target.created_at, { year: 'numeric' })}</span></div>
          <div className="drawer-actions">
            <button type="button" className="button button-primary" onClick={onCheck} disabled={checking}>{checking ? <span className="button-spinner" aria-hidden="true" /> : <Activity size={15} />}{checking ? 'Checking…' : 'Run check'}</button>
            <button type="button" className="button button-secondary" onClick={onEdit}><Pencil size={14} />Edit</button>
            <button type="button" className="icon-button danger-icon" onClick={onDelete} aria-label={`Delete ${target.name}`}><Trash2 size={16} /></button>
          </div>

          <section className="drawer-section">
            <div className="section-heading-row"><div><div className="eyebrow">LIFETIME TELEMETRY</div><h3>Statistics</h3></div><Clock3 size={16} className="muted-icon" aria-hidden="true" /></div>
            {stats ? (
              <div className="detail-stat-grid">
                <div><span>Total checks</span><strong>{stats.total_checks}</strong></div>
                <div><span>Uptime</span><strong>{formatPercent(stats.uptime_percentage)}</strong></div>
                <div><span>Successful</span><strong className="text-lime">{stats.successful_checks}</strong></div>
                <div><span>Failed</span><strong className="text-red">{stats.failed_checks}</strong></div>
                <div className="detail-stat-wide"><span>Average response</span><strong>{stats.total_checks ? formatLatency(stats.average_response_time_ms) : '—'}</strong></div>
              </div>
            ) : <p className="muted-copy">Statistics could not be loaded.</p>}
          </section>

          <section className="drawer-section">
            <div className="section-heading-row"><div><div className="eyebrow">LATEST AVAILABLE</div><h3>Check history</h3></div><span className="history-count">{target.history?.length || 0}</span></div>
            {target.latestCheck ? (
              <div className="latest-check-card">
                <div className="latest-check-top"><StatusBadge check={target.latestCheck} compact /><span>{formatDate(target.latestCheck.checked_at)}</span></div>
                <div className="latest-check-values"><div><span>HTTP status</span><strong>{target.latestCheck.status_code ?? '—'}</strong></div><div><span>Response time</span><strong>{formatLatency(target.latestCheck.response_time_ms)}</strong></div></div>
                {target.latestCheck.error ? <p className="latest-error">{target.latestCheck.error}</p> : null}
                <time className="visually-hidden" dateTime={target.latestCheck.checked_at || undefined}>{formatFullDate(target.latestCheck.checked_at)}</time>
              </div>
            ) : <p className="muted-copy">No usable check record is available yet. Run a check to establish a baseline.</p>}
          </section>
          <p className="drawer-footnote">History details reflect records returned by the configured FastAPI service.</p>
        </div>
      </aside>
    </div>
  );
}
