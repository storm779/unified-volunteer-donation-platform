import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  ShieldCheck,
  Heart,
  Check,
  LoaderCircle,
  Building2,
  LockKeyhole,
  ArrowRight,
} from 'lucide-react';
import { useLiveData } from '../hooks/useLiveData';
import { useAuth } from '../context/AuthContext';
import { api, errorMessage } from '../services/api';
import { loadRazorpay } from '../services/payments';
import { money, progress, date, initials } from '../utils/format';
import { Loading, ErrorState, Button } from '../components/UI';
export default function CampaignDetailPage() {
  const { id } = useParams();
  const campaign = useLiveData(`/campaigns/${id}`, ['campaigns']);
  const donations = useLiveData(`/campaigns/${id}/donations`, ['campaigns']);
  const { user, paymentMode } = useAuth();
  const [amount, setAmount] = useState('1000');
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const [success, setSuccess] = useState(null);
  const [pendingVerification, setPendingVerification] = useState(null);
  useEffect(() => {
    setOrder(null);
    setSuccess(null);
    setError('');
    setPendingVerification(null);
  }, [id, user?.id]);
  if (campaign.loading) return <Loading />;
  if (campaign.error || !campaign.data)
    return (
      <section className="container section">
        <ErrorState error={campaign.error} onRetry={campaign.refresh} />
        <Button to="/campaigns">Back to campaigns</Button>
      </section>
    );
  const c = campaign.data;
  const complete = (donation) => {
    setSuccess(donation);
    setOrder(null);
    setPendingVerification(null);
    campaign.refresh();
    donations.refresh();
  };
  const verify = async (result) => {
    setPendingVerification(result);
    setBusy(true);
    try {
      complete((await api.post('/payments/verify', result)).data);
    } catch (err) {
      setError(
        `${errorMessage(err)} You can retry verification below without starting another payment.`,
      );
    } finally {
      setBusy(false);
    }
  };
  const donate = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/payments/order', {
        campaignId: id,
        amount: Number(amount),
        anonymous,
      });
      if (data.mode === 'demo') {
        setOrder(data);
        setBusy(false);
        return;
      }
      const Razorpay = await loadRazorpay();
      const checkout = new Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.id,
        name: 'CommonGround',
        description: c.title,
        prefill: { name: user.name, email: user.email },
        theme: { color: '#143c32' },
        handler: verify,
        modal: {
          ondismiss: () => {
            setBusy(false);
            setError('Checkout closed. No donation has been recorded.');
          },
        },
      });
      checkout.on('payment.failed', (result) => {
        setBusy(false);
        setError(result.error?.description || 'Payment failed. Please try again.');
      });
      checkout.open();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };
  const finishDemo = async () => {
    setBusy(true);
    setError('');
    try {
      complete((await api.post('/payments/demo', { orderId: order.id })).data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="container section detail-page">
      <Link className="back-link" to="/campaigns">
        <ArrowLeft size={16} />
        All campaigns
      </Link>
      <div className="detail-grid">
        <article className="campaign-story">
          <div className="detail-intro">
            <span className="badge">{c.category}</span>
            <h1>{c.title}</h1>
            <div className="detail-meta">
              <span>
                <Building2 size={16} />
                {c.organizationName}
              </span>
              <span>
                <MapPin size={16} />
                {c.location}
              </span>
            </div>
          </div>
          <img
            className="detail-image"
            src={c.image}
            alt={`Community activity supporting ${c.category.toLowerCase()}`}
          />
          <div className="story-content">
            <span className="eyebrow">A CAUSE WORTH COMING TOGETHER FOR</span>
            <h2>
              A little support.
              <br />A lasting difference.
            </h2>
            {c.description
              .split('\n')
              .filter(Boolean)
              .map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            <div className="organization-card">
              <span className="organization-avatar">
                <Building2 size={27} />
              </span>
              <div>
                <span className="eyebrow">ORGANIZED BY</span>
                <h3>{c.organizationName}</h3>
                <p>{c.location} · Community-led initiative</p>
              </div>
            </div>
          </div>
          <section className="recent-donations">
            <div className="section-heading">
              <div>
                <span className="eyebrow">KINDNESS IN ACTION</span>
                <h2>People showing up.</h2>
              </div>
              <Heart size={25} />
            </div>
            {donations.error ? (
              <ErrorState error={donations.error} onRetry={donations.refresh} />
            ) : !donations.data?.length ? (
              <p className="muted">Be the first to support this campaign.</p>
            ) : (
              donations.data.slice(0, 8).map((d) => (
                <div className="donation-row" key={d.id}>
                  <span className="donor-avatar">
                    {d.anonymous ? <Heart size={18} /> : initials(d.donorName)}
                  </span>
                  <div>
                    <strong>{d.anonymous ? 'A kind stranger' : d.donorName}</strong>
                    <span>
                      {date(d.createdAt)}
                      {d.mode === 'demo'
                        ? ' · Demo donation'
                        : d.mode === 'sample'
                          ? ' · Sample donation'
                          : ' · Test donation'}
                    </span>
                  </div>
                  <strong>{money(d.amount)}</strong>
                </div>
              ))
            )}
          </section>
        </article>
        <aside className="donation-panel">
          <div className="donation-panel-inner">
            <span className="eyebrow">HELP THIS GOOD GROW</span>
            <div className="detail-raised">
              {money(c.raised)}
              <span>raised of {money(c.target)} goal</span>
            </div>
            <progress max="100" value={progress(c)} aria-label="Campaign funding progress" />
            <div className="funding-meta">
              <span>{c.donorCount} donations</span>
              <strong>{progress(c)}% funded</strong>
            </div>
            <hr />
            {success ? (
              <div className="donation-success" role="status">
                <span>
                  <Check size={27} />
                </span>
                <h3>You made a difference.</h3>
                <p>
                  Your {success.mode === 'demo' ? 'simulated' : 'test'} donation of{' '}
                  <strong>{money(success.amount)}</strong> is recorded. Thank you for showing up.
                </p>
                <Button to="/dashboard">
                  View your impact <ArrowRight size={17} />
                </Button>
                <button className="text-button" onClick={() => setSuccess(null)}>
                  Support this cause again
                </button>
              </div>
            ) : order ? (
              <div className="demo-confirm">
                <span className="badge">SIMULATED CHECKOUT</span>
                <h3>A little kindness, on its way.</h3>
                <p>
                  Record a demo donation of <strong>{money(order.amount / 100)}</strong> to{' '}
                  {c.title}. No money will be charged.
                </p>
                <Button disabled={busy} onClick={finishDemo}>
                  {busy ? <LoaderCircle className="spin" size={18} /> : <Heart size={17} />}Confirm
                  demo donation
                </Button>
                <button className="text-button" disabled={busy} onClick={() => setOrder(null)}>
                  Go back
                </button>
              </div>
            ) : (
              <form onSubmit={donate}>
                <h3>Choose your contribution</h3>
                <div className="amount-options">
                  {[500, 1000, 2500, 5000].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={Number(amount) === value}
                      className={Number(amount) === value ? 'selected' : ''}
                      onClick={() => setAmount(String(value))}
                    >
                      {money(value)}
                    </button>
                  ))}
                </div>
                <label className="field">
                  <span>Or enter an amount (₹)</span>
                  <input
                    type="number"
                    min="10"
                    max="1000000"
                    step="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    aria-label="Donation amount in rupees"
                  />
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                  />
                  Show my donation as anonymous
                </label>
                {c.status !== 'active' ? (
                  <p className="notice">
                    This campaign is {c.status} and is not accepting donations.
                  </p>
                ) : !user ? (
                  <Link
                    className="button primary full-width"
                    to="/login"
                    state={{ from: `/campaigns/${id}` }}
                  >
                    Log in to donate <ArrowUpRight size={18} />
                  </Link>
                ) : pendingVerification ? (
                  <Button type="button" disabled={busy} onClick={() => verify(pendingVerification)}>
                    Retry payment verification
                  </Button>
                ) : (
                  <Button className="full-width" type="submit" disabled={busy}>
                    {busy ? <LoaderCircle className="spin" size={18} /> : <Heart size={17} />}{' '}
                    {busy ? 'Preparing checkout…' : `Donate ${money(Number(amount) || 0)}`}
                  </Button>
                )}
                <p className="payment-note">
                  <LockKeyhole size={13} />
                  {paymentMode === 'demo'
                    ? 'Demo checkout · No real money charged'
                    : 'Razorpay Test Mode · No real money charged'}
                </p>
              </form>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="donation-trust">
              <ShieldCheck size={20} />
              <p>
                Every contribution is recorded.
                <br />
                <span>Follow campaign progress as it happens.</span>
              </p>
            </div>
          </div>
          <p className="sample-note">
            Portfolio campaign. Organizations and impact figures are sample data.
          </p>
        </aside>
      </div>
    </section>
  );
}
