import { useEffect, useState } from 'react';
import { Globe2, X } from 'lucide-react';

export default function TargetFormDialog({ open, target, busy = false, onSave, onClose }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(target?.name || '');
    setUrl(target?.url || '');
    setError('');
  }, [open, target]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  async function submit(event) {
    event.preventDefault();
    setError('');
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 100) {
      setError('Enter a name between 1 and 100 characters.');
      return;
    }
    let parsedUrl;
    try { parsedUrl = new URL(url.trim()); } catch { parsedUrl = null; }
    if (!parsedUrl || !['http:', 'https:'].includes(parsedUrl.protocol)) {
      setError('Enter a valid http:// or https:// URL.');
      return;
    }
    try {
      await onSave({ name: trimmedName, url: parsedUrl.toString() });
    } catch (saveError) {
      setError(saveError.message || 'Could not save this endpoint.');
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="dialog form-dialog" role="dialog" aria-modal="true" aria-labelledby="target-dialog-title">
        <header className="dialog-header">
          <div className="dialog-title-mark"><Globe2 size={17} aria-hidden="true" /></div>
          <div><div className="eyebrow">ENDPOINT CONFIGURATION</div><h2 id="target-dialog-title">{target ? 'Edit monitored API' : 'Add an API'}</h2></div>
          <button className="icon-button dialog-close" type="button" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={18} /></button>
        </header>
        <p className="dialog-intro">Add a URL to your monitoring list. Health is shown only after the backend records a check.</p>
        <form onSubmit={submit} noValidate>
          <label className="field-label" htmlFor="target-name">Display name</label>
          <input id="target-name" className="text-input" autoComplete="off" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Payments API" required disabled={busy} />
          <div className="field-meta"><span>Used in your dashboard</span><span>{name.length}/100</span></div>
          <label className="field-label" htmlFor="target-url">Endpoint URL</label>
          <input id="target-url" className="text-input mono-input" type="url" autoComplete="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://api.example.com/health" required disabled={busy} />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="dialog-actions">
            <button className="button button-secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? <span className="button-spinner" aria-hidden="true" /> : null}
              {busy ? 'Saving…' : target ? 'Save changes' : 'Add endpoint'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
