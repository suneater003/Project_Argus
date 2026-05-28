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
      onAuthenticated?.(payload.token, payload.user)
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
            <h2>{isLogin ? 'Sign In' : 'Create Operative Account'}</h2>
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
            {loading ? 'Authorizing...' : isLogin ? 'Launch Command Center' : 'Create Account'}
          </button>
        </form>
      </div>
    </section>
  )
}

export default function LandingPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [showModal, setShowModal] = useState(true)

  return (
    <div className="argus-landing">
      <div className="argus-landing__halo argus-landing__halo--one" />
      <div className="argus-landing__halo argus-landing__halo--two" />

      <main className="argus-landing__shell">
        <header className="argus-landing__topbar">
          <div className="argus-brand">
            <div className="argus-brand__logo">
              <ShieldAlert size={26} />
            </div>
            <div>
              <div className="argus-eyebrow">Project Argus</div>
              <div className="argus-landing__brandline">Multi-tenant Sales Intelligence SaaS</div>
            </div>
          </div>
          <button type="button" className="argus-button argus-button--ghost argus-landing__cta" onClick={() => setShowModal(true)}>
            Open Secure Access
            <ArrowRight size={16} />
          </button>
        </header>

        <section className="argus-landing__hero">
          <div className="argus-landing__hero-copy">
            <div className="argus-landing__badge">
              <Sparkles size={14} />
              Digital Cyber-Mythology Command Center
            </div>
            <h1>Decode the Conversation. Dominate the Deal.</h1>
            <p>
              Project Argus is the all-seeing intelligence engine for enterprise sales teams. Drop in a call transcript, and our multi-model AI instantly extracts MEDDIC gaps, flags hidden objections, and calculates deal risk in real-time.
            </p>
            <div className="argus-landing__actions">
              <button type="button" className="argus-button argus-button--primary" onClick={() => setShowModal(true)}>
                Enter the Command Center
                <ArrowRight size={16} />
              </button>
              <button type="button" className="argus-button argus-button--ghost" onClick={() => setMode('signup')}>
                Create Operative Account
              </button>
            </div>
          </div>

          <div className="argus-landing__vision-grid">
            <article className="argus-landing__vision-card">
              <div className="argus-landing__vision-kicker">The All-Seeing Eye</div>
              <h3>Never miss a buying signal. Argus maps every conversation against the strict MEDDIC framework.</h3>
            </article>
            <article className="argus-landing__vision-card">
              <div className="argus-landing__vision-kicker">Tactical Rep Coaching</div>
              <h3>Stop guessing why deals stall. Get objective, AI-driven coaching on talk ratios and question quality.</h3>
            </article>
            <article className="argus-landing__vision-card">
              <div className="argus-landing__vision-kicker">Multi-Model Resilience</div>
              <h3>Powered by a cascading AI waterfall architecture ensuring zero downtime and maximum precision.</h3>
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
