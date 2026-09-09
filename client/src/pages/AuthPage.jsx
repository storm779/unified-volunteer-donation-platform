import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  HeartHandshake,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/api';
import './dashboard.css';

const homeFor = (role) =>
  role === 'admin' ? '/admin' : role === 'organization' ? '/organization' : '/dashboard';

export default function AuthPage({ register: isRegister = false }) {
  const { login, register, loginDemo, mode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role:
      new URLSearchParams(location.search).get('role') === 'organization' ? 'organization' : 'user',
    organizationName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const change = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function authenticate(event, demoRole) {
    event?.preventDefault();
    setBusy(demoRole || 'form');
    setError('');
    try {
      const result = demoRole
        ? await loginDemo(demoRole)
        : isRegister
          ? await register(form)
          : await login(form.email, form.password);
      const signedInUser = result?.user || result;
      const destination = location.state?.from?.pathname || location.state?.from;
      navigate(
        typeof destination === 'string' &&
          destination.startsWith('/') &&
          !destination.startsWith('//')
          ? destination
          : homeFor(signedInUser?.role || demoRole || form.role),
        { replace: true },
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-shell">
        <aside className="auth-story">
          <div className="auth-story-top">
            <HeartHandshake size={27} />
            <span>A LITTLE HEART. A LOT OF CHANGE.</span>
          </div>
          <div className="auth-story-copy">
            <span className="auth-kicker">GOOD STARTS WITH US</span>
            <h1>
              Find your people.
              <br />
              Make your impact.
            </h1>
            <p>
              Give what you can. Share what you know. Be part of a community making everyday
              kindness count.
            </p>
            <div className="auth-values">
              <span>
                <Check size={16} /> Causes close to your heart
              </span>
              <span>
                <Check size={16} /> Time that makes a difference
              </span>
              <span>
                <Check size={16} /> Your impact, all in one place
              </span>
            </div>
          </div>
          <div className="auth-image">
            <img
              src="/images/education.jpg"
              alt="Children learning together in a community classroom"
            />
            <div>
              <span className="auth-image-label">EVERY SMALL ACTION ADDS UP</span>
              <p>
                A better tomorrow starts
                <br />
                with someone like you.
              </p>
            </div>
          </div>
        </aside>
        <section className="auth-form-panel">
          <Link to="/" className="auth-back">
            ← Back to CommonGround
          </Link>
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <h2>{isRegister ? 'Let’s do good, together.' : 'Good to have you back.'}</h2>
          <p className="auth-subtitle">
            {isRegister
              ? 'Create your account and turn intention into impact.'
              : 'Sign in to keep making a difference.'}
          </p>
          <form onSubmit={authenticate} className="auth-form">
            {isRegister && (
              <>
                <fieldset className="auth-role-fieldset">
                  <legend>I’m joining as</legend>
                  <div className="auth-roles">
                    <button
                      type="button"
                      className={`auth-role ${form.role === 'user' ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, role: 'user' })}
                      aria-pressed={form.role === 'user'}
                    >
                      <UserRound size={19} />
                      <span>
                        Individual<small>Give & volunteer</small>
                      </span>
                      {form.role === 'user' && <Check size={15} />}
                    </button>
                    <button
                      type="button"
                      className={`auth-role ${form.role === 'organization' ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, role: 'organization' })}
                      aria-pressed={form.role === 'organization'}
                    >
                      <Building2 size={19} />
                      <span>
                        Organization<small>Connect & create</small>
                      </span>
                      {form.role === 'organization' && <Check size={15} />}
                    </button>
                  </div>
                </fieldset>
                <label className="field">
                  Full name
                  <input
                    name="name"
                    value={form.name}
                    onChange={change}
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    placeholder="Your full name"
                    required
                  />
                </label>
                {form.role === 'organization' && (
                  <label className="field">
                    Organization name
                    <input
                      name="organizationName"
                      value={form.organizationName}
                      onChange={change}
                      autoComplete="organization"
                      minLength={2}
                      maxLength={120}
                      placeholder="Your organization’s name"
                      required
                    />
                  </label>
                )}
              </>
            )}
            <label className="field">
              Email address
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={change}
                autoComplete="email"
                maxLength={200}
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="field">
              Password
              <span className="auth-password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={change}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  minLength={isRegister ? 8 : undefined}
                  maxLength={128}
                  placeholder={
                    isRegister ? 'Create a password (8+ characters)' : 'Enter your password'
                  }
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            {error && (
              <div className="dash-feedback error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary auth-submit" type="submit" disabled={!!busy}>
              {busy === 'form' ? <LoaderCircle className="dash-spin" size={18} /> : null}
              {isRegister ? 'Create my account' : 'Sign in'}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {isRegister ? 'Already part of the community?' : 'New to CommonGround?'}{' '}
            <Link to={isRegister ? '/login' : '/register'} state={location.state}>
              {isRegister ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
          {mode === 'demo' && (
            <div className="auth-demo">
              <div className="auth-demo-heading">
                <Sparkles size={16} />
                <strong>Take a look around</strong>
                <span>LOCAL DEMO</span>
              </div>
              <p>Explore a sample account. Demo donations use no real money.</p>
              <div className="auth-demo-buttons">
                {[
                  { role: 'user', label: 'Donor', icon: UserRound },
                  { role: 'organization', label: 'Organization', icon: Building2 },
                  { role: 'admin', label: 'Admin', icon: ShieldCheck },
                ].map(({ role, label, icon: Icon }) => (
                  <button
                    key={role}
                    type="button"
                    disabled={!!busy}
                    onClick={() => authenticate(null, role)}
                  >
                    {busy === role ? (
                      <LoaderCircle className="dash-spin" size={15} />
                    ) : (
                      <Icon size={15} />
                    )}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="auth-security">
            <ShieldCheck size={15} />
            <span>
              {mode === 'firebase'
                ? 'Secure sign-in powered by Firebase Authentication'
                : 'A safe space to start making a difference'}
            </span>
          </div>
        </section>
      </div>
    </section>
  );
}
