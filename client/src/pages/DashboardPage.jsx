import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Heart,
  HeartHandshake,
  LoaderCircle,
  MapPin,
  Pencil,
  Save,
  Sprout,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLiveData } from '../hooks/useLiveData';
import { api, errorMessage } from '../services/api';
import { money, date, initials } from '../utils/format';
import './dashboard.css';

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const { data, loading, error, refresh } = useLiveData('/dashboard?view=personal', [
    'donations',
    'applications',
    'campaigns',
    'opportunities',
    'users',
  ]);
  const [tab, setTab] = useState('donations');
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    location: user?.location || '',
  });
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState(null);
  const donations = data?.donations || [];
  const applications = data?.applications || [];
  const totalDonated =
    data?.stats?.totalDonated ?? donations.reduce((sum, item) => sum + item.amount, 0);
  const supported =
    data?.stats?.supportedCampaigns ?? new Set(donations.map((item) => item.campaignId)).size;

  async function saveProfile(event) {
    event.preventDefault();
    setBusy('profile');
    setFeedback(null);
    try {
      await api.patch('/users/me', profile);
      await refreshUser();
      setEditing(false);
      setFeedback({ type: 'success', message: 'Your profile has been updated.' });
    } catch (err) {
      setFeedback({ type: 'error', message: errorMessage(err) });
    } finally {
      setBusy('');
    }
  }
  async function withdraw(id) {
    setBusy(id);
    setFeedback(null);
    try {
      await api.patch(`/applications/${id}`, { status: 'withdrawn' });
      await refresh();
      setFeedback({ type: 'success', message: 'Your application has been withdrawn.' });
    } catch (err) {
      setFeedback({ type: 'error', message: errorMessage(err) });
    } finally {
      setBusy('');
    }
  }
  function exportHistory() {
    const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [
      ['Date', 'Campaign', 'Amount (INR)', 'Payment reference', 'Mode'],
      ...donations.map((item) => [
        date(item.createdAt),
        item.campaignTitle,
        item.amount,
        item.paymentId,
        item.mode,
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map(escape).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'commonground-donation-history.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="dashboard-page">
      <div className="container dash-container">
        <div className="dash-heading">
          <div>
            <span className="eyebrow">YOUR PERSONAL IMPACT</span>
            <h1>
              Hello, {user?.name?.split(' ')[0] || 'changemaker'}
              <span className="dash-heading-dot">.</span>
            </h1>
            <p>Every contribution has a story. Here’s yours.</p>
          </div>
          <Link className="button primary" to="/campaigns">
            Make a difference <ArrowRight size={17} />
          </Link>
        </div>
        {feedback && (
          <div
            className={`dash-feedback ${feedback.type}`}
            role={feedback.type === 'error' ? 'alert' : 'status'}
          >
            {feedback.type === 'success' && <Check size={18} />}
            {feedback.message}
            <button aria-label="Dismiss message" onClick={() => setFeedback(null)}>
              <X size={16} />
            </button>
          </div>
        )}
        <div className="dash-stat-grid">
          <Metric
            icon={Heart}
            label="Total contributed"
            value={money(totalDonated)}
            note="Small acts. Lasting change."
          />
          <Metric
            icon={Sprout}
            label="Causes supported"
            value={supported}
            note="Communities you’ve stood with"
          />
          <Metric
            icon={HeartHandshake}
            label="Volunteer applications"
            value={applications.length}
            note={`${applications.filter((item) => item.status === 'accepted').length} accepted opportunities`}
          />
          <Metric
            icon={Clock3}
            label="Awaiting a response"
            value={applications.filter((item) => item.status === 'pending').length}
            note="Your next chapter of giving"
          />
        </div>
        <div className="dash-user-layout">
          <section className="dash-panel dash-history">
            <div className="dash-panel-heading">
              <div>
                <span className="eyebrow">KINDNESS, IN ACTION</span>
                <h2>Your activity</h2>
              </div>
              {tab === 'donations' && donations.length > 0 && (
                <button className="dash-text-button" onClick={exportHistory}>
                  <ArrowDownToLine size={15} /> Export
                </button>
              )}
            </div>
            <div className="dash-tabs" role="tablist" aria-label="Your activity">
              <button
                role="tab"
                aria-selected={tab === 'donations'}
                onClick={() => setTab('donations')}
                className={tab === 'donations' ? 'active' : ''}
              >
                Donation history <span>{donations.length}</span>
              </button>
              <button
                role="tab"
                aria-selected={tab === 'applications'}
                onClick={() => setTab('applications')}
                className={tab === 'applications' ? 'active' : ''}
              >
                Volunteering <span>{applications.length}</span>
              </button>
            </div>
            {loading ? (
              <div className="dash-loading">
                <LoaderCircle className="dash-spin" /> Loading your impact…
              </div>
            ) : error ? (
              <div className="dash-empty">
                <p>{typeof error === 'string' ? error : 'We couldn’t load your activity.'}</p>
                <button className="button secondary" onClick={refresh}>
                  Try again
                </button>
              </div>
            ) : tab === 'donations' ? (
              donations.length ? (
                <div className="dash-table-wrap">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Cause</th>
                        <th>Date</th>
                        <th>Contribution</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donations.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <Link to={`/campaigns/${item.campaignId}`} className="dash-row-title">
                              {item.campaignTitle}
                            </Link>
                            <span className="dash-row-subtitle">
                              {item.anonymous ? 'Given anonymously' : 'Thank you for showing up'}
                            </span>
                          </td>
                          <td>{date(item.createdAt)}</td>
                          <td className="dash-amount">{money(item.amount)}</td>
                          <td>
                            <span
                              className={`dash-status ${item.mode === 'demo' ? 'demo' : 'accepted'}`}
                            >
                              {item.mode === 'demo'
                                ? 'Demo'
                                : item.mode === 'sample'
                                  ? 'Sample'
                                  : 'Verified test'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Blank
                  icon={Heart}
                  title="Your first act of kindness awaits"
                  description="Find a cause that speaks to you. Your donations and their impact will live here."
                  to="/campaigns"
                  action="Explore causes"
                />
              )
            ) : applications.length ? (
              <div className="dash-application-list">
                {applications.map((item) => (
                  <article className="dash-application" key={item.id}>
                    <div className="dash-application-icon">
                      <HeartHandshake size={21} />
                    </div>
                    <div className="dash-application-body">
                      <Link to={`/volunteer/${item.opportunityId}`} className="dash-row-title">
                        {item.opportunityTitle}
                      </Link>
                      <span className="dash-row-subtitle">
                        <CalendarDays size={13} /> Applied {date(item.createdAt)}
                      </span>
                      <p>{item.motivation}</p>
                    </div>
                    <div className="dash-application-actions">
                      <span className={`dash-status ${item.status}`}>{item.status}</span>
                      {['pending', 'accepted'].includes(item.status) && (
                        <button
                          className="dash-text-button"
                          disabled={!!busy}
                          onClick={() => withdraw(item.id)}
                        >
                          {busy === item.id ? 'Withdrawing…' : 'Withdraw'}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Blank
                icon={HeartHandshake}
                title="Your time can change a life"
                description="Discover meaningful ways to share your skills and connect with your community."
                to="/volunteer"
                action="Find your opportunity"
              />
            )}
          </section>
          <aside className="dash-sidebar">
            <section className="dash-panel dash-profile">
              <div className="dash-profile-top">
                <span className="dash-avatar">{initials(user?.name || 'You')}</span>
                <button
                  className="dash-icon-button"
                  aria-label={editing ? 'Cancel editing profile' : 'Edit profile'}
                  onClick={() => {
                    setEditing(!editing);
                    setProfile({
                      name: user?.name || '',
                      bio: user?.bio || '',
                      location: user?.location || '',
                    });
                  }}
                >
                  {editing ? <X size={17} /> : <Pencil size={17} />}
                </button>
              </div>
              {editing ? (
                <form onSubmit={saveProfile} className="dash-profile-form">
                  <label className="field">
                    Full name
                    <input
                      required
                      minLength={2}
                      maxLength={80}
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    Location
                    <input
                      maxLength={120}
                      placeholder="Your city"
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    A little about you
                    <textarea
                      maxLength={500}
                      rows={3}
                      placeholder="The causes you care about…"
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    />
                  </label>
                  <button className="button primary small" disabled={!!busy}>
                    <Save size={15} />
                    {busy === 'profile' ? 'Saving…' : 'Save profile'}
                  </button>
                </form>
              ) : (
                <>
                  <h2>{user?.name}</h2>
                  <p className="dash-profile-email">{user?.email}</p>
                  <span className="dash-status accepted">Community member</span>
                  {user?.location && (
                    <p className="dash-profile-location">
                      <MapPin size={14} />
                      {user.location}
                    </p>
                  )}
                  <p className="dash-profile-bio">
                    {user?.bio ||
                      'Every great change starts with someone who cares. Thanks for being here.'}
                  </p>
                  <div className="dash-profile-since">
                    <CalendarDays size={14} /> Member since {date(user?.createdAt)}
                  </div>
                </>
              )}
            </section>
            <div className="dash-impact-note">
              <Sprout size={28} />
              <h3>
                There’s more than
                <br />
                one way to give.
              </h3>
              <p>Your time and talents are just as powerful as your donation.</p>
              <Link to="/volunteer">
                Find a volunteer role <ArrowRight size={16} />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value, note }) {
  return (
    <article className="dash-stat">
      <div className="dash-stat-top">
        <span>{label}</span>
        <Icon size={19} />
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
function Blank({ icon: Icon, title, description, to, action }) {
  return (
    <div className="dash-empty">
      <span className="dash-empty-icon">
        <Icon size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      <Link className="button secondary small" to={to}>
        {action}
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}
