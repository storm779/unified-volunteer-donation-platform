import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowRight,
  Heart,
  Users,
  HandHeart,
  Sprout,
  Check,
  Globe2,
} from 'lucide-react';
import { useLiveData } from '../hooks/useLiveData';
import { CampaignCard, OpportunityCard } from '../components/Cards';
import { Button, TextLink, Loading, ErrorState } from '../components/UI';
import { compactMoney } from '../utils/format';
export default function HomePage() {
  const campaigns = useLiveData('/campaigns', ['campaigns']);
  const opportunities = useLiveData('/opportunities', ['opportunities']);
  const active = (campaigns.data || []).filter((c) => c.status === 'active');
  const open = (opportunities.data || []).filter((o) => o.status === 'open');
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span />
            <span>A LITTLE KINDNESS GOES A LONG WAY</span>
          </div>
          <h1>
            Small acts.
            <br />
            Shared <em>change.</em>
          </h1>
          <p>
            Give what you can. Do what you love.
            <br />
            Find meaningful causes and people making
            <br className="desktop-break" /> a difference, together.
          </p>
          <div className="hero-actions">
            <Button to="/campaigns">
              Donate now <ArrowUpRight size={19} />
            </Button>
            <Button to="/volunteer" variant="secondary">
              Become a volunteer <ArrowRight size={18} />
            </Button>
          </div>
          <div className="hero-community">
            <div className="avatar-stack">
              <span>AK</span>
              <span>PS</span>
              <span>RM</span>
              <span>
                <Heart size={15} />
              </span>
            </div>
            <div>
              <strong>Better, together.</strong>
              <span>A community of everyday changemakers</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-photo">
            <img
              src="/images/environment.jpg"
              alt="Young volunteers holding a sapling together, ready to plant it"
              fetchPriority="high"
            />
            <span className="photo-caption">
              <span />
              <span>ROOTED IN COMMUNITY. GROWING WITH YOU.</span>
            </span>
          </div>
          <div className="hero-floating">
            <span className="floating-icon">
              <Sprout size={27} />
            </span>
            <div>
              <strong>Good starts with you.</strong>
              <span>One small act. Endless possibilities.</span>
            </div>
            <ArrowUpRight size={21} />
          </div>
          <div className="hero-stamp">
            <Heart size={24} />
            <span>
              PEOPLE.
              <br />
              PURPOSE.
              <br />
              POSSIBILITY.
            </span>
          </div>
          <span className="photo-credit">Together, we make room for a better tomorrow.</span>
        </div>
      </section>
      <section className="impact-bar">
        <div className="container impact-inner">
          <div className="impact-intro">
            <span className="eyebrow">OUR COMMUNITY IN ACTION</span>
            <h3>
              Every contribution
              <br />
              adds up.
            </h3>
          </div>
          <div className="impact-stat">
            <strong>
              {campaigns.data
                ? compactMoney(campaigns.data.reduce((sum, c) => sum + c.raised, 0))
                : '—'}
            </strong>
            <span>Raised across causes</span>
          </div>
          <div className="impact-stat">
            <strong>{campaigns.data?.length.toString().padStart(2, '0') || '—'}</strong>
            <span>Community campaigns</span>
          </div>
          <div className="impact-stat">
            <strong>{opportunities.data?.length.toString().padStart(2, '0') || '—'}</strong>
            <span>Ways to volunteer</span>
          </div>
          <div className="impact-stat">
            <strong>
              {campaigns.data
                ? campaigns.data
                    .reduce((sum, c) => sum + (c.donorCount || 0), 0)
                    .toLocaleString('en-IN')
                : '—'}
            </strong>
            <span>Acts of generosity</span>
          </div>
        </div>
      </section>
      <section className="container section" id="causes">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FIND YOUR REASON TO GIVE</span>
            <h2>A cause close to your heart.</h2>
            <p>Real needs. Shared purpose. A little help that goes a long way.</p>
          </div>
          <TextLink to="/campaigns">Explore all campaigns</TextLink>
        </div>
        {campaigns.loading ? (
          <Loading />
        ) : campaigns.error ? (
          <ErrorState error={campaigns.error} onRetry={campaigns.refresh} />
        ) : (
          <div className="campaign-grid">
            {active.slice(0, 3).map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </section>
      <section className="volunteer-section">
        <div className="container volunteer-layout">
          <div className="volunteer-heading">
            <span className="eyebrow">GIVE TIME. FIND PURPOSE.</span>
            <h2>
              Your skills.
              <br /> Someone’s
              <br />
              <em>brighter day.</em>
            </h2>
            <p>
              A few hours can open a world of possibilities. Find a way to show up for your
              community.
            </p>
            <Button to="/volunteer" variant="secondary">
              Find your opportunity <ArrowUpRight size={19} />
            </Button>
            <div className="volunteer-small-note">
              <Users size={20} />
              <span>There’s a place for everyone.</span>
            </div>
          </div>
          <div className="opportunity-list">
            {opportunities.loading ? (
              <Loading />
            ) : opportunities.error ? (
              <ErrorState error={opportunities.error} onRetry={opportunities.refresh} />
            ) : (
              open
                .slice(0, 3)
                .map((o, i) => <OpportunityCard key={o.id} opportunity={o} index={i} />)
            )}
          </div>
        </div>
      </section>
      <section className="container section how-it-works" id="how-it-works">
        <div className="section-heading centered">
          <span className="eyebrow">A SIMPLE START TO SOMETHING GOOD</span>
          <h2>Make an impact. In your own way.</h2>
        </div>
        <div className="steps-grid">
          {[
            {
              icon: Globe2,
              title: 'Find what moves you',
              text: 'Discover causes and volunteer opportunities that reflect what you care about.',
            },
            {
              icon: HandHeart,
              title: 'Give a little of yourself',
              text: 'Make a donation or offer your time. Every contribution has a place here.',
            },
            {
              icon: Sprout,
              title: 'See the good grow',
              text: 'Follow campaign progress and keep track of your contributions in one place.',
            },
          ].map((step, i) => (
            <div className="step" key={step.title}>
              <div className="step-top">
                <span className="step-icon">
                  <step.icon size={26} />
                </span>
                <span>0{i + 1}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="container">
        <div className="join-banner">
          <div>
            <span className="eyebrow">LET’S BUILD SOMETHING BETTER</span>
            <h2>
              The world needs
              <br />a little more <em>you.</em>
            </h2>
          </div>
          <div>
            <p>Start with a cause. Stay for the community.</p>
            <Button to="/register" variant="lime">
              Find your common ground <ArrowUpRight size={20} />
            </Button>
            <span>Give. Volunteer. Belong.</span>
          </div>
        </div>
      </section>
    </>
  );
}
