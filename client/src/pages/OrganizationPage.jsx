import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Heart,
  HeartHandshake,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  Save,
  Sprout,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLiveData } from '../hooks/useLiveData';
import { api, errorMessage } from '../services/api';
import { money, date, initials } from '../utils/format';
import './dashboard.css';

const categories = [
  'Education',
  'Healthcare',
  'Water',
  'Emergency Relief',
  'Food Security',
  'Environment',
];
const images = [
  ['/images/education.jpg', 'Community education'],
  ['/images/healthcare.jpg', 'Rural healthcare'],
  ['/images/water.jpg', 'Clean water'],
  ['/images/relief.jpg', 'Emergency relief'],
  ['/images/food.jpg', 'Food distribution'],
  ['/images/environment.jpg', 'Environment & planting'],
];
const campaignDefaults = {
  title: '',
  category: 'Education',
  summary: '',
  description: '',
  location: '',
  image: '/images/education.jpg',
  target: '',
  status: 'active',
};
const opportunityDefaults = {
  title: '',
  category: 'Education',
  description: '',
  location: '',
  date: '',
  commitment: '',
  spots: '',
  skills: '',
  status: 'open',
};
const toLocalDateTime = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function OrganizationPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useLiveData('/dashboard', [
    'campaigns',
    'opportunities',
    'applications',
    'donations',
  ]);
  const [tab, setTab] = useState('campaigns');
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState(null);
  const campaigns = data?.campaigns || [];
  const opportunities = data?.opportunities || [];
  const applications = data?.applications || [];
  const pending = applications.filter((item) => item.status === 'pending').length;
  const raised = campaigns.reduce((total, item) => total + item.raised, 0);

  async function updateApplication(id, status) {
    setBusy(id);
    setFeedback(null);
    try {
      await api.patch(`/applications/${id}`, { status });
      await refresh();
      setFeedback({ type: 'success', message: `Application marked as ${status}.` });
    } catch (err) {
      setFeedback({ type: 'error', message: errorMessage(err) });
    } finally {
      setBusy('');
    }
  }
  async function saved() {
    setEditor(null);
    await refresh();
    setFeedback({
      type: 'success',
      message: 'Your changes are saved and visible to the community.',
    });
  }

  return (
    <section className="dashboard-page">
      <div className="container dash-container">
        <div className="dash-heading">
          <div>
            <span className="eyebrow">ORGANIZATION WORKSPACE</span>
            <h1>
              Good work. Greater impact<span className="dash-heading-dot">.</span>
            </h1>
            <p>
              <Building2 size={15} /> {user?.organizationName || user?.name}{' '}
              <span className="dash-inline-dot">·</span> Your community starts here.
            </p>
          </div>
          <button className="button primary" onClick={() => setEditor({ kind: 'campaign' })}>
            <Plus size={18} /> Create campaign
          </button>
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
            label="Total funds raised"
            value={money(raised)}
            note="Community generosity in action"
          />
          <Metric
            icon={Sprout}
            label="Active campaigns"
            value={campaigns.filter((item) => item.status === 'active').length}
            note={`${campaigns.length} campaigns created`}
          />
          <Metric
            icon={HeartHandshake}
            label="Open opportunities"
            value={opportunities.filter((item) => item.status === 'open').length}
            note="Ways to bring people together"
          />
          <Metric
            icon={Users}
            label="Pending applications"
            value={pending}
            note="People ready to lend a hand"
          />
        </div>
        <section className="dash-panel">
          <div className="dash-panel-heading">
            <div>
              <span className="eyebrow">MAKE THINGS HAPPEN</span>
              <h2>Your initiatives</h2>
            </div>
            <span className="dash-live">
              <i /> Live updates
            </span>
          </div>
          <div className="dash-tabs" role="tablist" aria-label="Organization management">
            {[
              { id: 'campaigns', label: 'Campaigns', count: campaigns.length },
              {
                id: 'opportunities',
                label: 'Volunteer opportunities',
                count: opportunities.length,
              },
              { id: 'applications', label: 'Applications', count: applications.length },
            ].map(({ id, label, count }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? 'active' : ''}
                onClick={() => setTab(id)}
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>
          {loading ? (
            <div className="dash-loading">
              <LoaderCircle className="dash-spin" /> Loading your workspace…
            </div>
          ) : error ? (
            <div className="dash-empty">
              <p>{typeof error === 'string' ? error : 'Your workspace couldn’t be loaded.'}</p>
              <button className="button secondary" onClick={refresh}>
                Try again
              </button>
            </div>
          ) : (
            <>
              {tab === 'campaigns' &&
                (campaigns.length ? (
                  <div className="dash-initiative-grid">
                    {campaigns.map((campaign) => (
                      <article className="dash-campaign" key={campaign.id}>
                        <Link to={`/campaigns/${campaign.id}`} className="dash-campaign-image">
                          <img src={campaign.image} alt={campaign.title} />
                          <span className={`dash-status ${campaign.status}`}>
                            {campaign.status}
                          </span>
                        </Link>
                        <div className="dash-campaign-content">
                          <span className="eyebrow">{campaign.category}</span>
                          <Link to={`/campaigns/${campaign.id}`}>
                            <h3>{campaign.title}</h3>
                          </Link>
                          <p>{campaign.summary}</p>
                          <div className="dash-campaign-numbers">
                            <strong>{money(campaign.raised)}</strong>
                            <span>of {money(campaign.target)}</span>
                          </div>
                          <div
                            className="dash-progress"
                            role="progressbar"
                            aria-label={`${campaign.title} funding`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.min(
                              100,
                              Math.round((campaign.raised / campaign.target) * 100),
                            )}
                          >
                            <span
                              style={{
                                width: `${Math.min(100, (campaign.raised / campaign.target) * 100)}%`,
                              }}
                            />
                          </div>
                          <div className="dash-campaign-foot">
                            <span>
                              <Users size={14} />
                              {campaign.donorCount || 0} supporters
                            </span>
                            <button
                              className="dash-text-button"
                              onClick={() => setEditor({ kind: 'campaign', item: campaign })}
                            >
                              <Pencil size={14} /> Edit campaign
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty
                    icon={Sprout}
                    title="Start something meaningful"
                    description="Give your community a cause to rally around. Create your first campaign."
                    action="Create campaign"
                    onClick={() => setEditor({ kind: 'campaign' })}
                  />
                ))}
              {tab === 'opportunities' && (
                <>
                  <div className="dash-list-toolbar">
                    <p>Connect great people with meaningful work.</p>
                    <button
                      className="button secondary small"
                      onClick={() => setEditor({ kind: 'opportunity' })}
                    >
                      <Plus size={16} /> New opportunity
                    </button>
                  </div>
                  {opportunities.length ? (
                    <div className="dash-opportunity-list">
                      {opportunities.map((item) => (
                        <article className="dash-opportunity" key={item.id}>
                          <div className="dash-opportunity-icon">
                            <HeartHandshake size={24} />
                          </div>
                          <div className="dash-opportunity-info">
                            <span className="eyebrow">{item.category}</span>
                            <Link to={`/volunteer/${item.id}`}>
                              <h3>{item.title}</h3>
                            </Link>
                            <div className="dash-meta">
                              <span>
                                <MapPin size={14} />
                                {item.location}
                              </span>
                              <span>
                                <CalendarDays size={14} />
                                {date(item.date)}
                              </span>
                              <span>
                                <Users size={14} />
                                {item.spots} spots
                              </span>
                            </div>
                            <p>{item.commitment}</p>
                          </div>
                          <div className="dash-opportunity-actions">
                            <span className={`dash-status ${item.status}`}>{item.status}</span>
                            <button
                              className="button secondary small"
                              onClick={() => setEditor({ kind: 'opportunity', item })}
                            >
                              <Pencil size={14} /> Edit
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      icon={HeartHandshake}
                      title="Make room for helping hands"
                      description="Tell volunteers how they can help your organization make a difference."
                      action="Create opportunity"
                      onClick={() => setEditor({ kind: 'opportunity' })}
                    />
                  )}
                </>
              )}
              {tab === 'applications' &&
                (applications.length ? (
                  <div className="dash-review-list">
                    {applications.map((item) => (
                      <article className="dash-review" key={item.id}>
                        <span className="dash-mini-avatar">{initials(item.userName)}</span>
                        <div className="dash-review-content">
                          <div className="dash-review-title">
                            <h3>{item.userName}</h3>
                            <span>{date(item.createdAt)}</span>
                          </div>
                          <p className="dash-review-email">{item.userEmail}</p>
                          <Link
                            className="dash-review-role"
                            to={`/volunteer/${item.opportunityId}`}
                          >
                            {item.opportunityTitle}
                            <ArrowRight size={14} />
                          </Link>
                          <p className="dash-review-motivation">{item.motivation}</p>
                        </div>
                        <label className="dash-review-select">
                          <span>Application status</span>
                          <select
                            aria-label={`Application status for ${item.userName}`}
                            value={item.status}
                            disabled={!!busy || item.status === 'withdrawn'}
                            onChange={(event) => updateApplication(item.id, event.target.value)}
                          >
                            <option value="pending">Pending review</option>
                            <option value="accepted">Accepted</option>
                            <option value="rejected">Rejected</option>
                            {item.status === 'withdrawn' && (
                              <option value="withdrawn">Withdrawn</option>
                            )}
                          </select>
                          {busy === item.id && <small>Saving…</small>}
                        </label>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty
                    icon={Users}
                    title="Your next helping hand is on its way"
                    description="Applications will appear here when volunteers apply to your opportunities."
                  />
                ))}
            </>
          )}
        </section>
        <div className="dash-workspace-note">
          <HeartHandshake size={18} />
          <p>Behind every number is someone who cares. Thank you for giving them a way to help.</p>
        </div>
        {editor && (
          <InitiativeEditor editor={editor} onClose={() => setEditor(null)} onSaved={saved} />
        )}
      </div>
    </section>
  );
}

function InitiativeEditor({ editor, onClose, onSaved }) {
  const isCampaign = editor.kind === 'campaign';
  const item = editor.item;
  const [form, setForm] = useState(() =>
    isCampaign
      ? {
          ...campaignDefaults,
          ...(item
            ? Object.fromEntries(
                Object.keys(campaignDefaults).map((key) => [
                  key,
                  item[key] ?? campaignDefaults[key],
                ]),
              )
            : {}),
        }
      : {
          ...opportunityDefaults,
          ...(item
            ? Object.fromEntries(
                Object.keys(opportunityDefaults).map((key) => [
                  key,
                  item[key] ?? opportunityDefaults[key],
                ]),
              )
            : {}),
          skills: item?.skills?.join(', ') || '',
          date: toLocalDateTime(item?.date),
        },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef(null);
  const change = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('input')?.focus();
    return () => {
      document.body.style.overflow = oldOverflow;
      previousFocus?.focus?.();
    };
  }, []);
  function handleKeyDown(event) {
    if (event.key === 'Escape' && !saving) onClose();
    if (event.key === 'Tab') {
      const focusable = [
        ...dialog.current.querySelectorAll(
          'button:not(:disabled), input, select, textarea, a[href]',
        ),
      ];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = isCampaign
        ? { ...form, target: Number(form.target) }
        : {
            ...form,
            date: new Date(form.date).toISOString(),
            spots: Number(form.spots),
            skills: [
              ...new Set(
                form.skills
                  .split(',')
                  .map((skill) => skill.trim())
                  .filter(Boolean),
              ),
            ],
          };
      const endpoint = isCampaign ? '/campaigns' : '/opportunities';
      if (item) await api.patch(`${endpoint}/${item.id}`, payload);
      else await api.post(endpoint, payload);
      await onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="dash-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        ref={dialog}
        className="dash-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="initiative-editor-title"
        onKeyDown={handleKeyDown}
      >
        <div className="dash-modal-heading">
          <div>
            <span className="eyebrow">MAKE YOUR NEXT MOVE</span>
            <h2 id="initiative-editor-title">
              {item ? 'Edit' : 'Create'} {isCampaign ? 'campaign' : 'opportunity'}
            </h2>
          </div>
          <button
            className="dash-icon-button"
            aria-label="Close editor"
            disabled={saving}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="dash-editor-form">
          <label className="field">
            {isCampaign ? 'Campaign' : 'Opportunity'} title
            <input
              name="title"
              value={form.title}
              onChange={change}
              placeholder={
                isCampaign ? 'A cause worth coming together for' : 'A meaningful way to lend a hand'
              }
              required
              minLength={5}
              maxLength={120}
            />
          </label>
          <div className="dash-form-row">
            <label className="field">
              Category
              <select name="category" value={form.category} onChange={change}>
                {!categories.includes(form.category) && (
                  <option value={form.category}>{form.category}</option>
                )}
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Location
              <input
                name="location"
                value={form.location}
                onChange={change}
                placeholder="City, state"
                minLength={2}
                maxLength={120}
                required
              />
            </label>
          </div>
          {isCampaign && (
            <label className="field">
              Short summary
              <textarea
                name="summary"
                value={form.summary}
                onChange={change}
                rows={2}
                minLength={10}
                maxLength={240}
                placeholder="Share your purpose in a sentence or two."
                required
              />
              <small>{form.summary.length}/240 characters</small>
            </label>
          )}
          <label className="field">
            {isCampaign ? 'The story behind your cause' : 'About the opportunity'}
            <textarea
              name="description"
              value={form.description}
              onChange={change}
              rows={5}
              minLength={20}
              maxLength={12000}
              placeholder={
                isCampaign
                  ? 'Describe the need, who will benefit, and how contributions will be used.'
                  : 'Tell volunteers what they will do, who they will help, and what to expect.'
              }
              required
            />
          </label>
          {isCampaign ? (
            <>
              <div className="dash-form-row">
                <label className="field">
                  Fundraising goal (₹)
                  <input
                    name="target"
                    type="number"
                    value={form.target}
                    onChange={change}
                    placeholder="100000"
                    min={100}
                    max={100000000}
                    step={1}
                    required
                  />
                </label>
                <label className="field">
                  Status
                  <select name="status" value={form.status} onChange={change}>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
              </div>
              <label className="field">
                Campaign image
                <select name="image" value={form.image} onChange={change}>
                  {!images.some(([path]) => path === form.image) && (
                    <option value={form.image}>Current image</option>
                  )}
                  {images.map(([path, label]) => (
                    <option key={path} value={path}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <img className="dash-editor-image" src={form.image} alt="Selected campaign cover" />
            </>
          ) : (
            <>
              <div className="dash-form-row">
                <label className="field">
                  Start date & time
                  <input
                    name="date"
                    type="datetime-local"
                    value={form.date}
                    onChange={change}
                    required
                  />
                </label>
                <label className="field">
                  Volunteer spots
                  <input
                    name="spots"
                    type="number"
                    value={form.spots}
                    onChange={change}
                    placeholder="20"
                    min={1}
                    max={10000}
                    step={1}
                    required
                  />
                </label>
              </div>
              <div className="dash-form-row">
                <label className="field">
                  Time commitment
                  <input
                    name="commitment"
                    value={form.commitment}
                    onChange={change}
                    placeholder="e.g. 3 hours, every Saturday"
                    minLength={2}
                    maxLength={120}
                    required
                  />
                </label>
                <label className="field">
                  Status
                  <select name="status" value={form.status} onChange={change}>
                    <option value="open">Open for applications</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
              </div>
              <label className="field">
                Helpful skills
                <input
                  name="skills"
                  value={form.skills}
                  onChange={change}
                  maxLength={1000}
                  placeholder="Communication, teaching, teamwork"
                />
                <small>Separate skills with commas. All experience levels are welcome.</small>
              </label>
            </>
          )}
          {error && (
            <div className="dash-feedback error" role="alert">
              {error}
            </div>
          )}
          <div className="dash-modal-footer">
            <button type="button" className="button secondary" disabled={saving} onClick={onClose}>
              Cancel
            </button>
            <button className="button primary" type="submit" disabled={saving}>
              {saving ? (
                <LoaderCircle className="dash-spin" size={17} />
              ) : item ? (
                <Save size={17} />
              ) : (
                <Plus size={17} />
              )}
              {saving
                ? 'Saving…'
                : item
                  ? 'Save changes'
                  : `Create ${isCampaign ? 'campaign' : 'opportunity'}`}
            </button>
          </div>
        </form>
      </section>
    </div>
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
function Empty({ icon: Icon, title, description, action, onClick }) {
  return (
    <div className="dash-empty">
      <span className="dash-empty-icon">
        <Icon size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="button secondary small" onClick={onClick}>
          <Plus size={15} />
          {action}
        </button>
      )}
    </div>
  );
}
