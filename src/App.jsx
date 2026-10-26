import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Check, X } from 'lucide-react';
import ConfirmDialog from './components/ConfirmDialog';
import Sidebar from './components/Sidebar';
import TargetDetailsDrawer from './components/TargetDetailsDrawer';
import TargetFormDialog from './components/TargetFormDialog';
import Topbar from './components/Topbar';
import { PanelSkeleton } from './components/LoadingSkeleton';
import AuthPage from './pages/AuthPage.jsx';
import { api, getAccessToken, clearAccessToken } from './lib/api';
import { useDashboardData } from './lib/useDashboardData';

const CheckHistory = lazy(() => import('./pages/CheckHistory.jsx'));
const MonitoredApis = lazy(() => import('./pages/MonitoredApis.jsx'));
const Overview = lazy(() => import('./pages/Overview.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
      <span className="toast-icon">{toast.type === 'error' ? <X size={15} /> : <Check size={15} />}</span>
      <span>{toast.message}</span>
      <button type="button" className="icon-button" onClick={onDismiss} aria-label="Dismiss notification"><X size={15} /></button>
    </div>
  );
}

export default function App() {
  const data = useDashboardData();
  const [authUser, setAuthUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [page, setPage] = useState('Overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formTarget, setFormTarget] = useState(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [checkingId, setCheckingId] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, type = 'success') => setToast({ message, type, nonce: Date.now() }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    let active = true;
    if (!getAccessToken()) {
      setAuthChecking(false);
      return () => { active = false; };
    }
    api.getCurrentUser()
      .then((user) => { if (active) setAuthUser(user); })
      .catch(() => { clearAccessToken(); })
      .finally(() => { if (active) setAuthChecking(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      clearAccessToken();
      data.reset();
      setAuthUser(null);
    }
    window.addEventListener('apipulse:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('apipulse:unauthorized', handleUnauthorized);
  }, [data.reset]);

  useEffect(() => {
    if (authUser) void data.refresh();
    else data.reset();
  }, [authUser, data.refresh, data.reset]);

  useEffect(() => {
    if (!authUser) return undefined;
    const timer = window.setInterval(() => { void data.refresh(); }, 60_000);
    return () => window.clearInterval(timer);
  }, [authUser, data.refresh]);

  const selectedTarget = useMemo(
    () => data.targets.find((target) => String(target.id) === String(selectedTargetId)) || null,
    [data.targets, selectedTargetId],
  );
  const historyUnavailable = Boolean(data.error && !data.updatedAt)
    || data.partialErrors.some((message) => message.includes('check history unavailable'));

  function openCreate() {
    setFormTarget(null);
    setFormOpen(true);
  }

  function openEdit(target) {
    setSelectedTargetId(null);
    setFormTarget(target);
    setFormOpen(true);
  }

  async function saveTarget(payload) {
    setSaveBusy(true);
    try {
      if (formTarget) {
        await api.updateTarget(formTarget.id, payload);
        notify('Endpoint changes saved.');
      } else {
        await api.createTarget(payload);
        notify('API added to your monitoring list.');
      }
      setFormOpen(false);
      setFormTarget(null);
      await data.refresh();
    } finally {
      setSaveBusy(false);
    }
  }

  async function runCheck(targetId) {
    setCheckingId(String(targetId));
    try {
      const result = await api.checkTarget(targetId);
      data.rememberManualCheck(result);
      if (result?.is_healthy === true) {
        notify(`${result.target_name || 'Endpoint'} responded successfully${result.status_code ? ` · HTTP ${result.status_code}` : ''}.`);
      } else {
        notify(`${result?.target_name || 'Endpoint'} check completed and reported a failure${result?.status_code ? ` · HTTP ${result.status_code}` : ''}.`, 'error');
      }
      await data.refresh();
      return result;
    } catch (error) {
      notify(error.message || 'The health check could not be completed.', 'error');
      throw error;
    } finally {
      setCheckingId(null);
    }
  }

  async function deleteSelectedTarget() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api.deleteTarget(deleteTarget.id);
      notify(`${deleteTarget.name} was removed.`);
      setDeleteTarget(null);
      setSelectedTargetId(null);
      await data.refresh();
    } catch (error) {
      notify(error.message || 'Could not delete this endpoint.', 'error');
    } finally {
      setDeleteBusy(false);
    }
  }

  async function testConnection() {
    setTestingConnection(true);
    try {
      const health = await api.getHealth();
      return health;
    } finally {
      setTestingConnection(false);
    }
  }

  function askDelete(target) {
    setSelectedTargetId(null);
    setDeleteTarget(target);
  }

  function handleAuthenticated(user) {
    data.reset();
    setAuthUser(user);
  }

  function handleLogout() {
    clearAccessToken();
    data.reset();
    setAuthUser(null);
    setPage('Overview');
  }

  let content;
  if (page === 'Monitored APIs') {
    content = <MonitoredApis targets={data.targets} loading={data.loading} unavailable={Boolean(data.error && !data.updatedAt)} onRefresh={data.refresh} onAdd={openCreate} onOpen={setSelectedTargetId} onEdit={openEdit} onDelete={askDelete} onCheck={runCheck} checkingId={checkingId} />;
  } else if (page === 'Check History') {
    content = <CheckHistory targets={data.targets} history={data.history} loading={data.loading} historyUnavailable={historyUnavailable} onOpenTarget={setSelectedTargetId} onRefresh={data.refresh} />;
  } else if (page === 'Settings') {
    content = <Settings onTest={testConnection} testing={testingConnection} onRefresh={data.refresh} refreshing={data.refreshing} partialErrors={data.partialErrors} toast={notify} />;
  } else {
    content = <Overview data={data} onAdd={openCreate} onOpenTarget={setSelectedTargetId} onCheckTarget={runCheck} checkingId={checkingId} onNavigate={setPage} onRefresh={data.refresh} />;
  }

  if (authChecking) {
    return <main className="auth-loading"><span className="auth-brand-mark"><Activity size={19} /></span><strong>ApiPulse</strong><span className="button-spinner" /><small>Checking your secure session…</small></main>;
  }
  if (!authUser) return <AuthPage onAuthenticated={handleAuthenticated} />;

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={setPage} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="main-column">
        <Topbar page={page} onRefresh={data.refresh} refreshing={data.refreshing} backendError={data.error} onMenu={() => setMobileOpen(true)} userEmail={authUser.email} onLogout={handleLogout} />
        <main className="page-content" id="main-content">
          {data.error && page !== 'Overview' ? <div className="global-error" role="alert"><Activity size={15} /><span>{data.updatedAt ? 'Backend refresh failed. Showing the last successfully loaded data.' : 'Could not load monitoring data. Check that FastAPI is reachable from this browser.'}</span><button type="button" className="text-link" onClick={data.refresh}>Retry</button></div> : null}
          <Suspense fallback={<div className="page-stack route-loading"><span className="skeleton-line medium" /><PanelSkeleton rows={5} /></div>}>
            {content}
          </Suspense>
        </main>
        <footer className="app-footer"><span>ApiPulse <span className="footer-separator">/</span> API monitoring</span><span>Health status reflects recorded backend checks only.</span></footer>
      </div>

      <TargetFormDialog open={formOpen} target={formTarget} busy={saveBusy} onSave={saveTarget} onClose={() => { if (!saveBusy) setFormOpen(false); }} />
      <ConfirmDialog open={Boolean(deleteTarget)} title="Delete this endpoint?" description={deleteTarget ? `${deleteTarget.name} will be removed from monitoring. This action cannot be undone.` : ''} confirmLabel="Delete endpoint" busy={deleteBusy} onConfirm={deleteSelectedTarget} onClose={() => { if (!deleteBusy) setDeleteTarget(null); }} />
      <TargetDetailsDrawer target={selectedTarget} checking={String(checkingId) === String(selectedTarget?.id)} onClose={() => setSelectedTargetId(null)} onCheck={() => selectedTarget && runCheck(selectedTarget.id)} onEdit={() => selectedTarget && openEdit(selectedTarget)} onDelete={() => selectedTarget && askDelete(selectedTarget)} />
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
