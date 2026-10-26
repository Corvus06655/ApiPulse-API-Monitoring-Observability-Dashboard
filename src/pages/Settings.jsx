import { useState } from 'react';
import { Activity, Check, Clipboard, ExternalLink, Globe2, Server, TriangleAlert } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';

export default function Settings({ onTest, testing, onRefresh, refreshing, partialErrors, toast }) {
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState('');

  async function testConnection() {
    setHealth(null);
    setHealthError('');
    try {
      const result = await onTest();
      setHealth(result);
    } catch (error) {
      setHealthError(error.message || 'Could not connect to the backend.');
    }
  }

  async function copyBaseUrl() {
    try {
      await navigator.clipboard.writeText(API_BASE_URL);
      toast('Backend URL copied to clipboard.', 'success');
    } catch {
      toast('Clipboard access is unavailable in this browser.', 'error');
    }
  }

  return (
    <div className="page-stack">
      <section className="welcome-row"><div><div className="eyebrow page-eyebrow">CONNECTION & STATUS</div><h1>Settings</h1><p>Frontend connection details and backend readiness.</p></div><button className="button button-secondary" type="button" onClick={onRefresh} disabled={refreshing}><Activity size={15} />{refreshing ? 'Refreshing…' : 'Refresh data'}</button></section>

      <section className="panel settings-panel">
        <div className="settings-section-title"><span className="settings-icon"><Server size={17} aria-hidden="true" /></span><div><div className="eyebrow">API CONNECTION</div><h2>FastAPI backend</h2></div></div>
        <p className="settings-copy">The dashboard reads and writes monitoring data through the configured FastAPI service. Set `VITE_API_BASE_URL` before building the frontend; production deployments need a browser-reachable HTTPS origin.</p>
        <div className="connection-row"><div><span className="setting-label">Base URL</span><code>{API_BASE_URL || 'Not configured'}</code></div><button className="button button-secondary copy-button" type="button" onClick={copyBaseUrl} disabled={!API_BASE_URL}><Clipboard size={14} />Copy</button></div>
        <div className="connection-row"><div><span className="setting-label">Health endpoint</span><code>{API_BASE_URL ? `${API_BASE_URL}/health` : 'Not configured'}</code></div><button className="button button-primary" type="button" onClick={testConnection} disabled={testing}>{testing ? <span className="button-spinner" /> : <Globe2 size={14} />}{testing ? 'Checking…' : 'Test connection'}</button></div>
        {health ? <div className="inline-alert alert-success" role="status"><Check size={16} /><span>Backend responded: {health.status || 'reachable'}{health.message ? ` — ${health.message}` : ''}</span></div> : null}
        {healthError ? <div className="inline-alert alert-error" role="alert"><TriangleAlert size={16} /><span>{healthError}</span></div> : null}
      </section>

      <section className="panel settings-panel">
        <div className="settings-section-title"><span className="settings-icon settings-icon-teal"><Activity size={17} aria-hidden="true" /></span><div><div className="eyebrow">INTEGRATION NOTES</div><h2>Data behavior</h2></div></div>
        <div className="settings-facts">
          <div><span className="fact-marker" /><p><strong>Health is evidence-based.</strong> A target without a returned check record remains “No check yet”; it is never counted as healthy just because it exists.</p></div>
          <div><span className="fact-marker fact-teal" /><p><strong>History route differs from the requested contract.</strong> Check history is read through GET `/target/:id/history` and filtered by target ID. Statistics and history use recorded check results only.</p></div>
          <div><span className="fact-marker fact-lime" /><p><strong>Local development requires CORS.</strong> Allow the Vite origin `http://localhost:5173` in FastAPI and set the API base URL to `http://127.0.0.1:8000`.</p></div>
          <div><span className="fact-marker fact-violet" /><p><strong>Partial responses stay visible.</strong> {partialErrors.length ? `${partialErrors.length} statistics/history requests failed during the latest refresh.` : 'Missing stats or history are not replaced with sample values.'}</p></div>
        </div>
        <a className="text-link settings-doc-link" href="/backend-integration.md" target="_blank" rel="noreferrer">Open backend integration notes <ExternalLink size={13} aria-hidden="true" /></a>
      </section>
    </div>
  );
}
