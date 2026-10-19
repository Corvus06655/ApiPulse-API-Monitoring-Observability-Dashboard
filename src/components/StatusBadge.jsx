import { Check, CircleHelp, X } from 'lucide-react';

export default function StatusBadge({ check, compact = false }) {
  if (!check || typeof check.is_healthy !== 'boolean') {
    return (
      <span className={`status-badge status-unknown ${compact ? 'status-compact' : ''}`}>
        <CircleHelp size={13} aria-hidden="true" />
        <span>No check yet</span>
      </span>
    );
  }

  const healthy = check.is_healthy;
  return (
    <span className={`status-badge ${healthy ? 'status-up' : 'status-down'} ${compact ? 'status-compact' : ''}`}>
      {healthy ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />}
      <span>{healthy ? 'Healthy' : 'Down'}</span>
    </span>
  );
}
