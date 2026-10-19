import { Activity } from 'lucide-react';

export default function EmptyState({ icon: Icon = Activity, title, description, action, className = '' }) {
  return (
    <div className={`empty-state ${className}`}>
      <span className="empty-icon"><Icon size={20} strokeWidth={1.7} aria-hidden="true" /></span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        {action ? <div className="empty-action">{action}</div> : null}
      </div>
    </div>
  );
}
