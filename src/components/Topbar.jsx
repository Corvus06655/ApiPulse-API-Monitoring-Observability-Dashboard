import { useState } from 'react';
import { Activity, Menu, RefreshCw } from 'lucide-react';

const descriptions = {
  Overview: 'Operational signal across your monitored services',
  'Monitored APIs': 'Endpoints connected to your monitoring workspace',
  'Check History': 'Recorded checks returned by the backend',
  Settings: 'Frontend and backend connection settings',
};

export default function Topbar({ page, onRefresh, refreshing, backendError, onMenu }) {
  const [showStatus, setShowStatus] = useState(false);
  return (
    <header className="topbar">
      <div className="topbar-left"><button className="icon-button menu-trigger" type="button" onClick={onMenu} aria-label="Open navigation"><Menu size={19} /></button><div><span className="topbar-context">ApiPulse <span>/</span> {page}</span><p>{descriptions[page]}</p></div></div>
      <div className="topbar-actions">
        <button className={`connection-pill ${backendError ? 'connection-offline' : ''}`} type="button" onClick={() => setShowStatus((value) => !value)} aria-expanded={showStatus} title="Backend connection status"><span className="online-dot" />{backendError ? 'Connection issue' : 'Backend configured'}<Activity size={13} /></button>
        <button className="icon-button refresh-button" type="button" onClick={onRefresh} disabled={refreshing} aria-label="Refresh dashboard data" title="Refresh"><RefreshCw size={16} className={refreshing ? 'spin-once' : ''} /></button>
      </div>
      {showStatus ? <div className={`connection-popover ${backendError ? 'popover-error' : ''}`} role="status">{backendError ? backendError : 'API base URL is configured. Use Settings to test the live backend connection.'}</div> : null}
    </header>
  );
}
