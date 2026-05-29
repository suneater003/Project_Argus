import { useState } from 'react'
import { ArrowRight, Lock, ShieldAlert, Sparkles } from 'lucide-react'
import { signIn, signUp } from './services/api.js'
const initialForm = { email: '', password: '' }

function AuthModal({ mode, setMode, onAuthenticated }) {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isLogin = mode === 'login'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const action = isLogin ? signIn : signUp
      const payload = await action(form.email, form.password)
      window.localStorage.setItem('argus_token', payload.token)
      window.localStorage.setItem('userRole', payload.role || 'REP')
      onAuthenticated?.(payload.token, payload.role || 'REP', form.email)
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="argus-auth-modal">
      <div className="argus-auth-modal__panel">
        <div className="argus-auth-modal__header">
          <div>
            <div className="argus-auth-modal__eyebrow">Secure Access</div>
            <h2>{isLogin ? 'Sign in to Argus' : 'Create your workspace'}</h2>
          </div>
          <div className="argus-pill">
            <ShieldAlert size={14} />
            JWT Protected
          </div>
        </div>

        <div className="argus-auth-tabs">
          <button
            type="button"
            className={`argus-tab ${isLogin ? 'is-active' : ''}`}
            onClick={() => setMode('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`argus-tab ${!isLogin ? 'is-active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Create Operative Account
          </button>
        </div>

        <form className="argus-auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="pilot@enterprise.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Enter your secure passphrase"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              required
              minLength={8}
            />
          </label>

          {error ? <div className="argus-error">{error}</div> : null}

          <button type="submit" className="argus-button argus-button--primary" disabled={loading}>
            {loading ? <span className="argus-spinner" /> : <Lock size={16} />}
            {loading ? 'Authorizing...' : isLogin ? 'Launch Workspace' : 'Create Account'}
          </button>
        </form>
      </div>
    </section>
  )
}

export default function LandingPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [showModal, setShowModal] = useState(false)

  const openModal = (nextMode = 'login') => {
    setMode(nextMode)
    setShowModal(true)
  }

  return (
    <div className="argus-landing">
      <div className="argus-landing__halo argus-landing__halo--one" />
      <div className="argus-landing__halo argus-landing__halo--two" />

      <main className="argus-landing__shell">
        <section className="argus-landing__hero">
          <div className="argus-landing__hero-copy">
            <div className="argus-brand" style={{ marginBottom: 6, alignItems: 'center', gap: 16 }}>
              <div
                className="argus-brand__logo"
                style={{
                  width: 80,
                  height: 80,
                  background: 'transparent',
                  boxShadow: 'none',
                  border: 'none',
                  borderRadius: 0,
                }}
              >
                <img
                  src="/logo.png"
                  alt="Project Argus logo"
                  className="argus-brand__image"
                  style={{ width: 80, height: 80, mixBlendMode: 'screen' }}
                />
              </div>
              <div>
                <div className="argus-eyebrow" style={{ fontSize: 20, fontWeight: 600 }}>PROJECT ARGUS</div>
                <div className="argus-landing__brandline">Enterprise Sales Intelligence Platform</div>
              </div>
            </div>

            <div className="argus-landing__badge">
              <Sparkles size={14} />
              Enterprise command center
            </div>
            <h1>Decode every call. Deliver the next best action.</h1>
            <p>
              Project Argus is the secure sales intelligence workspace for enterprise teams. Upload a call, extract MEDDIC signals, identify objections, and move the account forward with a focused follow-up plan.
            </p>
            <div className="argus-landing__actions">
              <button type="button" className="argus-button argus-button--primary" onClick={() => openModal('login')}>
                Enter the Command Center
                <ArrowRight size={16} />
              </button>
              <button type="button" className="argus-button argus-button--ghost" onClick={() => openModal('signup')}>
                Create Operative Account
              </button>
            </div>
          </div>

          <div className="argus-landing__vision-grid">
            <article className="argus-landing__vision-card">
              <div className="argus-landing__vision-kicker" style={{ fontSize: 16, fontWeight: 600 }}>MEDDIC clarity</div>
              <h3>See qualification gaps instantly with structured MEDDIC extraction and quote-level evidence.</h3>
            </article>
            <article className="argus-landing__vision-card">
              <div className="argus-landing__vision-kicker" style={{ fontSize: 16, fontWeight: 600 }}>Rep coaching</div>
              <h3>Compare talk ratio, question quality, and objection handling in one readable workspace.</h3>
            </article>
            <article className="argus-landing__vision-card">
              <div className="argus-landing__vision-kicker" style={{ fontSize: 16, fontWeight: 600 }}>Manager visibility</div>
              <h3>Track rep performance, account health, and objection trends without leaving the platform.</h3>
            </article>
          </div>
        </section>
      </main>

      {showModal ? (
        <div className="argus-auth-overlay" onClick={(event) => {
          if (event.target === event.currentTarget) {
            setShowModal(false)
          }
        }}>
          <AuthModal mode={mode} setMode={setMode} onAuthenticated={onAuthenticated} />
        </div>
      ) : null}
    </div>
  )
}
