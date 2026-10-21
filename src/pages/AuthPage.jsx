import { useState } from 'react';
import { Activity, ArrowRight, Eye, EyeOff, ShieldCheck, Zap } from 'lucide-react';
import { api, setAccessToken, clearAccessToken } from '../lib/api';

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const registering = mode === 'register';

  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    const normalizedEmail = email.trim().toLowerCase();
    if (registering && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      if (registering) {
        await api.registerUser({ email: normalizedEmail, password });
        setNotice('Account created. Signing you in…');
      }
      const tokenResult = await api.login({ email: normalizedEmail, password });
      setAccessToken(tokenResult.access_token);
      const user = await api.getCurrentUser();
      onAuthenticated(user);
    } catch (requestError) {
      clearAccessToken();
      setError(requestError.message || 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
  }

  return (
    <main className="auth-screen">
      <section className="auth-story" aria-label="ApiPulse overview">
        <div className="auth-brand"><span className="auth-brand-mark"><Activity size={19} strokeWidth={2.4} /></span><span>Api<span>Pulse</span></span></div>
        <div className="auth-story-content">
          <span className="auth-kicker"><span className="auth-live-dot" /> API OBSERVABILITY WORKSPACE</span>
          <h1>Every endpoint.<br /><em>One clear signal.</em></h1>
          <p>Know when your APIs respond, slow down, or go quiet. One focused workspace for health checks, response times, and uptime trends.</p>
          <div className="auth-feature-list">
            <div><span><ShieldCheck size={16} /></span><div><strong>Private workspace</strong><small>Monitored endpoints stay scoped to your account.</small></div></div>
            <div><span><Activity size={16} /></span><div><strong>Live health signals</strong><small>Manual checks, recorded history, and uptime summaries.</small></div></div>
            <div><span><Zap size={16} /></span><div><strong>Automated checks</strong><small>Scheduled backend checks while the service is running.</small></div></div>
          </div>
        </div>
        <div className="auth-story-foot"><span>BUILT FOR API RELIABILITY</span><span>FASTAPI <b>·</b> REACT <b>·</b> POSTGRESQL</span></div>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-card">
          <div className="auth-card-eyebrow">{registering ? 'GET STARTED' : 'WELCOME BACK'}</div>
          <h2>{registering ? 'Create your workspace' : 'Sign in to ApiPulse'}</h2>
          <p className="auth-card-copy">{registering ? 'Create an account to start monitoring your APIs.' : 'Your monitoring workspace is waiting.'}</p>
          <div className="auth-mode-switch" role="tablist" aria-label="Authentication mode">
            <button type="button" role="tab" aria-selected={!registering} className={!registering ? 'auth-mode-active' : ''} onClick={() => switchMode('login')}>Sign in</button>
            <button type="button" role="tab" aria-selected={registering} className={registering ? 'auth-mode-active' : ''} onClick={() => switchMode('register')}>Create account</button>
          </div>
          <form className="auth-form" onSubmit={submit}>
            <label htmlFor="auth-email">Email address</label>
            <input id="auth-email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={255} />
            <div className="auth-password-heading"><label htmlFor="auth-password">Password</label>{registering ? <span>8+ characters</span> : null}</div>
            <div className="auth-password-wrap">
              <input id="auth-password" type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} placeholder={registering ? 'Create a strong password' : 'Enter your password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={registering ? 8 : 1} maxLength={128} />
              <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
            {registering ? <>
              <label htmlFor="auth-confirm-password">Confirm password</label>
              <input id="auth-confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter password again" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} maxLength={128} />
            </> : null}
            {error ? <div className="auth-alert auth-alert-error" role="alert">{error}</div> : null}
            {notice ? <div className="auth-alert auth-alert-success" role="status">{notice}</div> : null}
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? <span className="button-spinner" /> : <>{registering ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></>}{busy ? (registering ? 'Creating workspace…' : 'Signing in…') : null}</button>
          </form>
          <div className="auth-form-note"><ShieldCheck size={15} /><span>Passwords are hashed before storage. Sessions use expiring signed access tokens.</span></div>
        </div>
        <div className="auth-bottom-note"><span>ApiPulse</span> <b>·</b> API Monitoring &amp; Observability</div>
      </section>
    </main>
  );
}
