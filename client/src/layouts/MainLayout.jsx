import { useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { HeartHandshake, ArrowUpRight, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
export const dashboardPath = (role) =>
  role === 'admin' ? '/admin' : role === 'organization' ? '/organization' : '/dashboard';
export default function MainLayout() {
  const { user, mode, paymentMode, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container navbar">
          <Link to="/" className="brand" aria-label="CommonGround home">
            <span className="brand-icon">
              <HeartHandshake size={24} />
            </span>
            common<span>ground</span>
            <i />
          </Link>
          <nav className={`main-nav ${open ? 'is-open' : ''}`} aria-label="Main navigation">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/campaigns">Discover causes</NavLink>
            <NavLink to="/volunteer">Volunteer</NavLink>
            <Link
              to="/#how-it-works"
              onClick={() => {
                setOpen(false);
                setTimeout(
                  () =>
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }),
                  80,
                );
              }}
            >
              How it works
            </Link>
            <button
              className="mobile-account"
              hidden={!user}
              onClick={async () => {
                await logout();
                navigate('/');
                setOpen(false);
              }}
            >
              Log out
            </button>
          </nav>
          <div className="nav-actions">
            {user ? (
              <>
                <Link className="nav-login" to={dashboardPath(user.role)}>
                  My dashboard
                </Link>
                <button
                  className="icon-button logout"
                  aria-label="Log out"
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                >
                  <LogOut size={19} />
                </button>
              </>
            ) : (
              <Link className="nav-login" to="/login">
                Log in
              </Link>
            )}
            <Link className="button primary small" to="/campaigns">
              Make a difference
              <ArrowUpRight size={17} />
            </Link>
            <button
              className="icon-button mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      {(mode === 'demo' || paymentMode === 'demo') && (
        <div className="demo-strip">
          <span>{mode === 'firebase' ? 'SIMULATED PAYMENTS' : 'LOCAL DEMO'}</span>
          {paymentMode === 'razorpay-test'
            ? 'Explore sample causes. Razorpay Test Mode; no real money is charged.'
            : 'Explore sample causes. Donations are simulated; no money is charged.'}
          <Link to="/login">
            {mode === 'firebase' ? 'Sign in' : 'Try a role'} <ArrowUpRight size={13} />
          </Link>
        </div>
      )}
      <main id="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-top">
          <div>
            <Link to="/" className="brand">
              <span className="brand-icon">
                <HeartHandshake size={24} />
              </span>
              common<span>ground</span>
              <i />
            </Link>
            <p>
              A little of your time.
              <br />A little of your kindness.
              <br />A world of difference.
            </p>
          </div>
          <div>
            <h4>Make an impact</h4>
            <Link to="/campaigns">Explore campaigns</Link>
            <Link to="/volunteer">Volunteer your time</Link>
            <Link to="/register">Join the community</Link>
          </div>
          <div>
            <h4>For organizations</h4>
            <Link to="/register?role=organization">Register an organization</Link>
            <Link to="/organization">Organization dashboard</Link>
            <Link to="/#how-it-works">How it works</Link>
          </div>
          <div className="footer-note">
            <span className="eyebrow">SMALL ACTS. SHARED CHANGE.</span>
            <h3>
              Good grows
              <br />
              when we come together.
            </h3>
            <HeartHandshake size={32} />
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} CommonGround · Unified Volunteer Donation Platform
          </span>
          <span>A portfolio project. All sample organizations are fictional.</span>
        </div>
      </footer>
    </>
  );
}
