import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  CalendarDays,
  Clock,
  Users,
  Building2,
  Check,
  Send,
  LoaderCircle,
} from 'lucide-react';
import { useLiveData } from '../hooks/useLiveData';
import { useAuth } from '../context/AuthContext';
import { api, errorMessage } from '../services/api';
import { date } from '../utils/format';
import { Loading, ErrorState, Button } from '../components/UI';
export default function OpportunityDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const {
    data: o,
    loading,
    error,
    refresh,
  } = useLiveData(`/opportunities/${id}`, ['opportunities']);
  const [motivation, setMotivation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  if (loading) return <Loading />;
  if (error || !o)
    return (
      <section className="container section">
        <ErrorState error={error} onRetry={refresh} />
        <Button to="/volunteer">Back to opportunities</Button>
      </section>
    );
  const apply = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await api.post('/applications', { opportunityId: id, motivation });
      setSuccess(true);
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="container section detail-page">
      <Link className="back-link" to="/volunteer">
        <ArrowLeft size={16} />
        All opportunities
      </Link>
      <div className="detail-grid">
        <article className="opportunity-story">
          <div className="detail-intro">
            <span className="badge">{o.category}</span>
            <h1>{o.title}</h1>
            <div className="detail-meta">
              <span>
                <Building2 size={16} />
                {o.organizationName}
              </span>
              <span>
                <MapPin size={16} />
                {o.location}
              </span>
            </div>
          </div>
          <div className="opportunity-facts">
            {[
              { icon: CalendarDays, label: 'When', value: date(o.date) },
              { icon: Clock, label: 'Commitment', value: o.commitment },
              { icon: Users, label: 'Capacity', value: `${o.spots} volunteers` },
            ].map((f) => (
              <div key={f.label}>
                <f.icon size={23} />
                <span>{f.label}</span>
                <strong>{f.value}</strong>
              </div>
            ))}
          </div>
          <div className="story-content">
            <span className="eyebrow">YOUR TIME CAN CHANGE A DAY</span>
            <h2>Be part of something good.</h2>
            {o.description
              .split('\n')
              .filter(Boolean)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            <h3>Skills you can bring</h3>
            <div className="skill-tags">
              {(o.skills || []).map((skill) => (
                <span className="badge" key={skill}>
                  {skill}
                </span>
              ))}
            </div>
            <div className="organization-card">
              <span className="organization-avatar">
                <Building2 size={27} />
              </span>
              <div>
                <span className="eyebrow">YOUR COMMUNITY PARTNER</span>
                <h3>{o.organizationName}</h3>
                <p>{o.location}</p>
              </div>
            </div>
          </div>
        </article>
        <aside className="donation-panel">
          <div className="donation-panel-inner">
            <span className="eyebrow">TAKE THE FIRST STEP</span>
            {success ? (
              <div className="donation-success" role="status">
                <span>
                  <Check size={27} />
                </span>
                <h3>You’re on your way.</h3>
                <p>
                  Your application has been sent to {o.organizationName}. Follow its status in your
                  dashboard.
                </p>
                <Button to="/dashboard">
                  Track your application <ArrowUpRight size={17} />
                </Button>
              </div>
            ) : (
              <>
                <h2>
                  Good starts
                  <br />
                  with showing up.
                </h2>
                <p className="muted">
                  Tell the team a little about yourself and how you’d like to help.
                </p>
                {o.status !== 'open' ? (
                  <p className="notice">Applications for this opportunity are closed.</p>
                ) : !user ? (
                  <Link
                    className="button primary full-width"
                    to="/login"
                    state={{ from: `/volunteer/${id}` }}
                  >
                    Log in to apply <ArrowUpRight size={18} />
                  </Link>
                ) : user.role !== 'user' ? (
                  <p className="notice">
                    Volunteer applications are available to individual accounts. Sign in with an
                    individual account to apply.
                  </p>
                ) : (
                  <form onSubmit={apply}>
                    <label className="field">
                      <span>Why would you like to join?</span>
                      <textarea
                        required
                        minLength={20}
                        maxLength={2000}
                        rows={6}
                        value={motivation}
                        onChange={(e) => setMotivation(e.target.value)}
                        placeholder="Share your interests, relevant skills, and availability…"
                      />
                    </label>
                    <p className="field-hint">
                      At least 20 characters. Your name and email will be shared with the
                      organization.
                    </p>
                    <Button className="full-width" disabled={busy}>
                      {busy ? <LoaderCircle size={17} className="spin" /> : <Send size={17} />}
                      Submit application
                    </Button>
                  </form>
                )}
                {message && (
                  <p className="form-error" role="alert">
                    {message}
                  </p>
                )}
                <div className="donation-trust">
                  <Users size={22} />
                  <p>
                    A place for your kindness.
                    <br />
                    <span>The organization reviews each application.</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
