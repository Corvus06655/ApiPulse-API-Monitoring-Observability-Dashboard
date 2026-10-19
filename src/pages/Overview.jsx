import { Activity, Boxes, Plus, Timer, TriangleAlert } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import HistoryTable from '../components/HistoryTable';
import MetricCard from '../components/MetricCard';
import ResponseTimeChart from '../components/ResponseTimeChart';
import { MetricSkeletons, PanelSkeleton } from '../components/LoadingSkeleton';
import StatusBadge from '../components/StatusBadge';
import { formatDate, formatLatency } from '../lib/format';

export default function Overview({ data, onAdd, onOpenTarget, onCheckTarget, checkingId, onNavigate, onRefresh }) {
  if (data.loading) {
    return <div className="page-stack"><MetricSkeletons /><div className="overview-grid"><PanelSkeleton rows={5} /><PanelSkeleton rows={4} /></div></div>;
  }

  const healthy = data.targets.filter((target) => target.latestCheck?.is_healthy === true).length;
  const down = data.targets.filter((target) => target.latestCheck?.is_healthy === false).length;
  const unknown = data.targets.length - healthy - down;
  const backendUnavailable = Boolean(data.error && !data.updatedAt);
  const historyUnavailable = backendUnavailable || data.partialErrors.some((message) => message.includes('check history unavailable'));

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div><div className="eyebrow page-eyebrow">MONITORING OVERVIEW</div><h1>Your endpoints, at a glance.</h1><p>Live health and latency from checks recorded by your ApiPulse backend.</p></div>
        <button className="button button-primary add-api-button" type="button" onClick={onAdd}><Plus size={16} strokeWidth={2.4} />Add API</button>
      </section>

      {data.error ? <div className="inline-alert alert-error" role="alert"><TriangleAlert size={16} /><span>{data.updatedAt ? `Refresh failed: ${data.error} Showing the last successful data.` : `Could not load monitoring data: ${data.error}`}</span><button className="text-link" type="button" onClick={onRefresh}>Try again</button></div> : null}
      {data.partialErrors.length ? <div className="inline-alert alert-warning" role="status"><TriangleAlert size={16} /><span>Some endpoint statistics or check history could not be loaded. Available records remain visible; missing data is not estimated.</span></div> : null}

      {data.targets.length === 0 && !data.error ? (
        <EmptyState icon={Boxes} title="No APIs monitored yet" description="Add an endpoint to start collecting health and response-time data from your FastAPI service." action={<button type="button" className="button button-primary" onClick={onAdd}><Plus size={15} />Add your first API</button>} className="empty-panel" />
      ) : null}

      <div className="metric-grid">
        <MetricCard label="Monitored APIs" value={backendUnavailable ? '—' : data.targets.length} detail={backendUnavailable ? 'Unavailable until the backend responds' : 'Targets registered with backend'} icon={Boxes} tone="lime" />
        <MetricCard label="Healthy" value={backendUnavailable ? '—' : healthy} detail={backendUnavailable ? 'Latest health is unknown' : unknown ? `${unknown} without a known check` : 'Based on latest available checks'} icon={Activity} tone="teal" />
        <MetricCard label="Down" value={backendUnavailable ? '—' : down} detail={backendUnavailable ? 'Latest health is unknown' : 'Latest available check failed'} icon={TriangleAlert} tone="red" />
        <MetricCard label="Average response" value={backendUnavailable || data.summary.average_response_time_ms === null ? '—' : formatLatency(data.summary.average_response_time_ms)} detail={backendUnavailable ? 'Unavailable until the backend responds' : data.summary.total_checks ? `Across ${data.summary.total_checks} recorded checks` : 'No completed checks yet'} icon={Timer} tone="violet" />
      </div>

      <div className="overview-grid">
        <ResponseTimeChart records={data.history} unavailable={historyUnavailable} />
        <section className="panel status-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">CURRENT SIGNAL</div><h2>API status</h2></div>
            <button className="text-link" type="button" onClick={() => onNavigate('Monitored APIs')}>All endpoints <span aria-hidden="true">→</span></button>
          </div>
          {data.targets.length ? (
            <div className="status-list">
              {data.targets.slice(0, 5).map((target) => (
                <article className="status-item" key={target.id}>
                  <button type="button" className="status-target" onClick={() => onOpenTarget(target.id)}>
                    <span className={`status-indicator ${target.latestCheck?.is_healthy === true ? 'indicator-up' : target.latestCheck?.is_healthy === false ? 'indicator-down' : 'indicator-unknown'}`} aria-hidden="true" />
                    <span className="status-target-copy"><strong>{target.name}</strong><small>{target.latestCheck ? `Last checked ${formatDate(target.latestCheck.checked_at)}` : 'No check recorded yet'}</small></span>
                  </button>
                  <div className="status-item-end"><StatusBadge check={target.latestCheck} compact /><button type="button" className="quiet-action" onClick={() => onCheckTarget(target.id)} disabled={String(checkingId) === String(target.id)} aria-label={`Run health check for ${target.name}`}>{String(checkingId) === String(target.id) ? <span className="button-spinner" /> : <Activity size={15} />}</button></div>
                </article>
              ))}
            </div>
          ) : <EmptyState icon={Activity} title={backendUnavailable ? 'Backend unavailable' : 'Waiting for endpoints'} description={backendUnavailable ? 'Endpoint status is unknown until the backend returns its target records.' : 'Add an API to see its latest known status here.'} />}
        </section>
      </div>

      <section className="panel history-panel">
        <div className="panel-heading">
          <div><div className="eyebrow">LATEST TELEMETRY</div><h2>Recent checks</h2></div>
          <button className="text-link" type="button" onClick={() => onNavigate('Check History')}>Full history <span aria-hidden="true">→</span></button>
        </div>
        {data.history.length ? <HistoryTable rows={data.history.slice(0, 6)} compact onOpenTarget={onOpenTarget} /> : <EmptyState icon={Activity} title={historyUnavailable ? 'History unavailable' : 'No recorded checks'} description={historyUnavailable ? 'The backend did not provide check history, so no records or metrics are inferred.' : 'The dashboard will show real check results after your backend runs a manual or scheduled check.'} className="table-empty" />}
      </section>
      <p className="last-updated">{data.updatedAt ? `Data refreshed ${formatDate(data.updatedAt)}` : 'Waiting for backend data'}{data.refreshing ? <span className="refreshing-dot" aria-label="Refreshing" /> : null}</p>
    </div>
  );
}
