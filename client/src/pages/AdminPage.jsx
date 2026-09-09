import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Building2,
  Check,
  Heart,
  HeartHandshake,
  LoaderCircle,
  Search,
  ShieldCheck,
  Sprout,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLiveData } from '../hooks/useLiveData';
import { api, errorMessage } from '../services/api';
import { money, date, initials } from '../utils/format';
import './dashboard.css';

export default function AdminPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useLiveData('/dashboard', [
    'users',
    'campaigns',
    'opportunities',
    'applications',
    'donations',
  ]);
  const [tab, setTab] = useState('overview');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState(null);
  const users = data?.users || [];
  const campaigns = data?.campaigns || [];
  const opportunities = data?.opportunities || [];
  const donations = data?.donations || [];
  const applications = data?.applications || [];
  const stats = data?.stats || {};
  const collections = { users, campaigns, opportunities, donations };
  const filtered = (collections[tab] || []).filter((item) =>
    [
      item.name,
      item.email,
      item.organizationName,
      item.title,
      item.campaignTitle,
      item.donorName,
      item.location,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const activity = useMemo(
    () =>
      [
        ...(data?.donations || []).map((item) => ({
          id: `donation-${item.id}`,
          kind: 'donation',
          title: `${item.donorName || 'A supporter'} contributed ${money(item.amount)}`,
          detail: item.campaignTitle,
          createdAt: item.createdAt,
          to: `/campaigns/${item.campaignId}`,
        })),
        ...(data?.applications || []).map((item) => ({
          id: `application-${item.id}`,
          kind: 'application',
          title: `${item.userName || 'A volunteer'} applied`,
          detail: item.opportunityTitle,
          createdAt: item.createdAt,
          to: `/volunteer/${item.opportunityId}`,
        })),
        ...(data?.campaigns || []).map((item) => ({
          id: `campaign-${item.id}`,
          kind: 'campaign',
          title: 'A new cause joined the community',
          detail: item.title,
          createdAt: item.createdAt,
          to: `/campaigns/${item.id}`,
        })),
      ]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8),
    [data],
  );

  async function update(endpoint, id, payload, message) {
    setBusy(id);
    setFeedback(null);
    try {
      await api.patch(`${endpoint}/${id}`, payload);
      await refresh();
      setFeedback({ type: 'success', message });
    } catch (err) {
      setFeedback({ type: 'error', message: errorMessage(err) });
    } finally {
      setBusy('');
    }
  }
  function selectTab(next) {
    setTab(next);
    setQuery('');
  }

  return (
    <section className="dashboard-page">
      <div className="container dash-container">
        <div className="dash-heading">
          <div>
            <span className="eyebrow">PLATFORM ADMINISTRATION</span>
            <h1>
              A community, moving forward<span className="dash-heading-dot">.</span>
            </h1>
            <p>A clear view of the people, causes, and contributions behind the change.</p>
          </div>
          <span className="dash-admin-label">
            <ShieldCheck size={17} /> Administrator
          </span>
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
        <div className="dash-stat-grid dash-stat-grid-six">
          <Metric
            icon={Users}
            label="Community members"
            value={stats.totalUsers ?? users.length}
            note="People making a difference"
          />
          <Metric
            icon={Building2}
            label="Organizations"
            value={
              stats.totalOrganizations ??
              users.filter((item) => item.role === 'organization').length
            }
            note="Partners in positive change"
          />
          <Metric
            icon={Wallet}
            label="Total funds raised"
            value={money(
              stats.totalRaised ?? donations.reduce((sum, item) => sum + item.amount, 0),
            )}
            note="Across every campaign"
          />
          <Metric
            icon={Heart}
            label="Donations"
            value={stats.totalDonations ?? donations.length}
            note="Acts of everyday generosity"
          />
          <Metric
            icon={Sprout}
            label="Campaigns"
            value={stats.totalCampaigns ?? campaigns.length}
            note={`${campaigns.filter((item) => item.status === 'active').length} currently active`}
          />
          <Metric
            icon={HeartHandshake}
            label="Volunteer opportunities"
            value={stats.totalOpportunities ?? opportunities.length}
            note={`${applications.length} applications received`}
          />
        </div>
        <section className="dash-panel">
          <div className="dash-panel-heading">
            <div>
              <span className="eyebrow">KEEP GOOD GROWING</span>
              <h2>Community management</h2>
            </div>
            <span className="dash-live">
              <i /> Live updates
            </span>
          </div>
          <div className="dash-tabs" role="tablist" aria-label="Platform management">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'users', label: 'People' },
              { id: 'campaigns', label: 'Campaigns' },
              { id: 'opportunities', label: 'Volunteering' },
              { id: 'donations', label: 'Donations' },
            ].map(({ id, label }) => (
              <button
                role="tab"
                key={id}
                aria-selected={tab === id}
                className={tab === id ? 'active' : ''}
                onClick={() => selectTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="dash-loading">
              <LoaderCircle className="dash-spin" /> Loading your overview…
            </div>
          ) : error ? (
            <div className="dash-empty">
              <p>
                {typeof error === 'string' ? error : 'The platform overview couldn’t be loaded.'}
              </p>
              <button className="button secondary" onClick={refresh}>
                Try again
              </button>
            </div>
          ) : tab === 'overview' ? (
            <div className="dash-admin-overview">
              <section className="dash-activity-panel">
                <div className="dash-section-heading">
                  <h3>
                    <Activity size={18} /> Recent activity
                  </h3>
                  <span>Across the community</span>
                </div>
                {activity.length ? (
                  <div className="dash-activity-feed">
                    {activity.map((item) => (
                      <article className="dash-activity-item" key={item.id}>
                        <span className={`dash-activity-icon ${item.kind}`}>
                          {item.kind === 'donation' ? (
                            <Heart size={17} />
                          ) : item.kind === 'application' ? (
                            <HeartHandshake size={17} />
                          ) : (
                            <Sprout size={17} />
                          )}
                        </span>
                        <div>
                          <strong>{item.title}</strong>
                          <Link to={item.to}>{item.detail}</Link>
                        </div>
                        <time>{date(item.createdAt)}</time>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="dash-empty">
                    <Activity size={28} />
                    <p>Community activity will appear here as people participate.</p>
                  </div>
                )}
              </section>
              <aside className="dash-admin-side">
                <div className="dash-admin-pulse">
                  <span className="eyebrow">COMMUNITY PULSE</span>
                  <h3>
                    Making space
                    <br />
                    for more good.
                  </h3>
                  <div>
                    <span>Active campaigns</span>
                    <strong>{campaigns.filter((item) => item.status === 'active').length}</strong>
                  </div>
                  <div>
                    <span>Open volunteer roles</span>
                    <strong>{opportunities.filter((item) => item.status === 'open').length}</strong>
                  </div>
                  <div>
                    <span>Applications to review</span>
                    <strong>
                      {applications.filter((item) => item.status === 'pending').length}
                    </strong>
                  </div>
                  <Link to="/campaigns">
                    Explore the community <ArrowRight size={16} />
                  </Link>
                </div>
                <div className="dash-admin-guide">
                  <ShieldCheck size={23} />
                  <h4>A thoughtful community takes care.</h4>
                  <p>
                    Manage account access and keep campaigns and opportunities up to date using the
                    tabs above.
                  </p>
                </div>
              </aside>
            </div>
          ) : (
            <>
              <div className="dash-list-toolbar">
                <p>
                  {filtered.length}{' '}
                  {tab === 'users'
                    ? 'community members'
                    : tab === 'opportunities'
                      ? 'opportunities'
                      : tab}{' '}
                  {query && 'found'}
                </p>
                <label className="dash-search">
                  <Search size={16} />
                  <input
                    type="search"
                    aria-label={`Search ${tab}`}
                    placeholder={`Search ${tab === 'users' ? 'name or email' : tab}…`}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
              </div>
              {filtered.length ? (
                <div className="dash-table-wrap">
                  <table className="dash-table dash-management-table">
                    {tab === 'users' && (
                      <>
                        <thead>
                          <tr>
                            <th>Community member</th>
                            <th>Joined</th>
                            <th>Role</th>
                            <th>Access</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <div className="dash-person">
                                  <span className="dash-mini-avatar">{initials(item.name)}</span>
                                  <div>
                                    <strong className="dash-row-title">
                                      {item.name}
                                      {item.id === user?.id && (
                                        <small className="dash-you">You</small>
                                      )}
                                    </strong>
                                    <span className="dash-row-subtitle">{item.email}</span>
                                    {item.organizationName && (
                                      <span className="dash-row-subtitle">
                                        {item.organizationName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>{date(item.createdAt)}</td>
                              <td>
                                <select
                                  aria-label={`Role for ${item.name}`}
                                  disabled={!!busy || item.id === user?.id}
                                  value={item.role}
                                  onChange={(event) =>
                                    update(
                                      '/admin/users',
                                      item.id,
                                      { role: event.target.value },
                                      `${item.name}’s role has been updated.`,
                                    )
                                  }
                                >
                                  <option value="user">User / donor</option>
                                  <option value="organization">Organization</option>
                                  <option value="admin">Administrator</option>
                                </select>
                              </td>
                              <td>
                                <span
                                  className={`dash-status ${item.disabled ? 'rejected' : 'active'}`}
                                >
                                  {item.disabled ? 'Disabled' : 'Active'}
                                </span>
                              </td>
                              <td>
                                <button
                                  className={`dash-text-button ${!item.disabled ? 'danger' : ''}`}
                                  disabled={!!busy || item.id === user?.id}
                                  title={
                                    item.id === user?.id
                                      ? 'Your own account cannot be disabled here'
                                      : undefined
                                  }
                                  onClick={() =>
                                    update(
                                      '/admin/users',
                                      item.id,
                                      { disabled: !item.disabled },
                                      `${item.name}’s account has been ${item.disabled ? 'enabled' : 'disabled'}.`,
                                    )
                                  }
                                >
                                  {busy === item.id
                                    ? 'Saving…'
                                    : item.disabled
                                      ? 'Enable'
                                      : 'Disable'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </>
                    )}
                    {tab === 'campaigns' && (
                      <>
                        <thead>
                          <tr>
                            <th>Campaign</th>
                            <th>Organization</th>
                            <th>Raised / goal</th>
                            <th>Supporters</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <Link className="dash-row-title" to={`/campaigns/${item.id}`}>
                                  {item.title}
                                </Link>
                                <span className="dash-row-subtitle">
                                  {item.category} · {item.location}
                                </span>
                              </td>
                              <td>{item.organizationName}</td>
                              <td>
                                <span className="dash-amount">{money(item.raised)}</span>
                                <span className="dash-row-subtitle">of {money(item.target)}</span>
                              </td>
                              <td>{item.donorCount || 0}</td>
                              <td>
                                <select
                                  aria-label={`Status for ${item.title}`}
                                  disabled={!!busy}
                                  value={item.status}
                                  onChange={(event) =>
                                    update(
                                      '/campaigns',
                                      item.id,
                                      { status: event.target.value },
                                      'Campaign status updated.',
                                    )
                                  }
                                >
                                  <option value="active">Active</option>
                                  <option value="paused">Paused</option>
                                  <option value="completed">Completed</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </>
                    )}
                    {tab === 'opportunities' && (
                      <>
                        <thead>
                          <tr>
                            <th>Opportunity</th>
                            <th>Organization</th>
                            <th>Start date</th>
                            <th>Spots</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <Link className="dash-row-title" to={`/volunteer/${item.id}`}>
                                  {item.title}
                                </Link>
                                <span className="dash-row-subtitle">
                                  {item.location} · {item.commitment}
                                </span>
                              </td>
                              <td>{item.organizationName}</td>
                              <td>{date(item.date)}</td>
                              <td>{item.spots}</td>
                              <td>
                                <select
                                  aria-label={`Status for ${item.title}`}
                                  disabled={!!busy}
                                  value={item.status}
                                  onChange={(event) =>
                                    update(
                                      '/opportunities',
                                      item.id,
                                      { status: event.target.value },
                                      'Opportunity status updated.',
                                    )
                                  }
                                >
                                  <option value="open">Open</option>
                                  <option value="closed">Closed</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </>
                    )}
                    {tab === 'donations' && (
                      <>
                        <thead>
                          <tr>
                            <th>Donor</th>
                            <th>Campaign</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Payment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <span className="dash-row-title">
                                  {item.donorName || 'Community supporter'}
                                </span>
                                <span className="dash-row-subtitle">
                                  {item.anonymous
                                    ? 'Anonymous on public campaign'
                                    : 'Public contribution'}
                                </span>
                              </td>
                              <td>
                                <Link to={`/campaigns/${item.campaignId}`}>
                                  {item.campaignTitle}
                                </Link>
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
                                <span className="dash-payment-id">{item.paymentId}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </>
                    )}
                  </table>
                </div>
              ) : (
                <div className="dash-empty">
                  <span className="dash-empty-icon">
                    <Search size={25} />
                  </span>
                  <h3>{query ? 'No matches just yet' : 'Nothing here yet'}</h3>
                  <p>
                    {query
                      ? 'Try a different name or keyword.'
                      : 'New community records will appear here automatically.'}
                  </p>
                  {query && (
                    <button className="button secondary small" onClick={() => setQuery('')}>
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </section>
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
