import { Activity, Gauge, History, RadioTower, Settings2, X } from 'lucide-react';

const navigation = [
  { label: 'Overview', icon: Gauge },
  { label: 'Monitored APIs', icon: RadioTower },
  { label: 'Check History', icon: History },
  { label: 'Settings', icon: Settings2 },
];

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><Activity size={19} strokeWidth={2.4} /></span>;
}

export default function Sidebar({ page, onNavigate, mobileOpen, onClose }) {
  return (
    <>
      {mobileOpen ? <button className="mobile-scrim" type="button" aria-label="Close navigation" onClick={onClose} /> : null}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation">
        <div className="brand-lockup"><BrandMark /><span>Api<span>Pulse</span></span><button className="icon-button mobile-close" type="button" aria-label="Close navigation" onClick={onClose}><X size={18} /></button></div>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="side-nav">
          {navigation.map(({ label, icon: Icon }) => (
            <button key={label} type="button" className={`nav-item ${page === label ? 'nav-item-active' : ''}`} onClick={() => { onNavigate(label); onClose(); }} aria-current={page === label ? 'page' : undefined}>
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>{label === 'Monitored APIs' ? <span className="nav-live-dot" aria-hidden="true" /> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="signal-card"><span className="signal-icon"><Activity size={15} /></span><div><strong>Monitoring active</strong><small>Checks run by your backend</small></div><span className="signal-pip" /></div>
          <div className="sidebar-version"><span className="online-dot" />ApiPulse <span>•</span> workspace</div>
        </div>
      </aside>
    </>
  );
}
