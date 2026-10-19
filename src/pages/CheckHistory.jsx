import { useMemo, useState } from 'react';
import { AlertTriangle, History as HistoryIcon } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import HistoryTable from '../components/HistoryTable';

export default function CheckHistory({ targets, history, loading, historyUnavailable = false, onOpenTarget, onRefresh }) {
  const [targetFilter, setTargetFilter] = useState('all');
  const rows = useMemo(() => targetFilter === 'all' ? history : history.filter((record) => String(record.target_id) === targetFilter), [history, targetFilter]);

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div><div className="eyebrow page-eyebrow">RECORDED HEALTH CHECKS</div><h1>Check history</h1><p>Only records returned by the FastAPI history endpoint are shown.</p></div>
        <label className="filter-wrap history-filter"><span>Endpoint</span><select className="select-input" value={targetFilter} onChange={(event) => setTargetFilter(event.target.value)}><option value="all">All endpoints</option>{targets.map((target) => <option key={target.id} value={String(target.id)}>{target.name}</option>)}</select></label>
      </section>

      <div className="inline-alert alert-warning history-warning" role="note"><AlertTriangle size={17} /><div><strong>History endpoint limitation</strong><span>The supplied backend exposes history as POST and filters rows by check ID instead of target ID. This frontend calls the method that actually exists and excludes records explicitly belonging to a different target; the timeline may therefore be incomplete until the backend query is corrected.</span></div></div>
      {historyUnavailable ? <div className="inline-alert alert-error" role="alert"><AlertTriangle size={16} /><span>The backend did not return complete check history. Any rows shown may be partial.</span><button className="text-link" type="button" onClick={onRefresh}>Try again</button></div> : null}

      <section className="panel history-panel">
        <div className="panel-heading">
          <div><div className="eyebrow">AVAILABLE RECORDS</div><h2>Check log</h2></div>
          <span className="history-count">{loading ? 'Loading…' : historyUnavailable && !rows.length ? 'Unavailable' : `${rows.length} ${rows.length === 1 ? 'record' : 'records'}`}</span>
        </div>
        {loading ? <div className="inventory-loading" aria-busy="true"><span className="skeleton-line full" /><span className="skeleton-line full" /><span className="skeleton-line full" /></div> : null}
        {!loading && rows.length ? <HistoryTable rows={rows} onOpenTarget={onOpenTarget} /> : null}
        {!loading && !rows.length ? <EmptyState icon={HistoryIcon} title={historyUnavailable ? 'History unavailable' : 'No history records available'} description={historyUnavailable ? 'No records were loaded from the backend. The page does not infer history from target existence.' : targetFilter === 'all' ? 'Run a manual check or wait for the scheduler. If the backend history filter is incorrect, older records may not appear here.' : 'No usable history was returned for this endpoint.'} action={historyUnavailable ? <button className="button button-secondary" type="button" onClick={onRefresh}>Try again</button> : null} className="table-empty" /> : null}
      </section>
    </div>
  );
}
