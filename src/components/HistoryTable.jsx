import { ArrowUpRight, Minus } from 'lucide-react';
import { formatDate, formatLatency } from '../lib/format';
import StatusBadge from './StatusBadge';

export default function HistoryTable({ rows = [], compact = false, onOpenTarget }) {
  if (!rows.length) return null;

  return (
    <div className={`table-scroll ${compact ? 'table-compact' : ''}`}>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Endpoint</th>
            <th scope="col">Result</th>
            <th scope="col">HTTP</th>
            <th scope="col">Response</th>
            <th scope="col">Checked</th>
            {!compact ? <th scope="col">Details</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((record, index) => (
            <tr key={`${record.target_id}-${record.id ?? record.check_id ?? record.checked_at ?? index}`}>
              <td>
                <div className="endpoint-cell">
                  {onOpenTarget ? (
                    <button className="text-link endpoint-name" type="button" onClick={() => onOpenTarget(record.target_id)}>
                      {record.target_name || `Target ${record.target_id}`}<ArrowUpRight size={13} aria-hidden="true" />
                    </button>
                  ) : <span className="endpoint-name">{record.target_name || `Target ${record.target_id}`}</span>}
                  <span className="endpoint-url">{record.target_url || ''}</span>
                </div>
              </td>
              <td><StatusBadge check={record} compact /></td>
              <td><span className={`http-code ${record.status_code ? '' : 'http-missing'}`}>{record.status_code ?? <Minus size={13} aria-label="No HTTP status" />}</span></td>
              <td className="mono-cell">{formatLatency(record.response_time_ms)}</td>
              <td className="date-cell">{formatDate(record.checked_at)}</td>
              {!compact ? <td className="error-cell" title={record.error || ''}>{record.error || '—'}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
