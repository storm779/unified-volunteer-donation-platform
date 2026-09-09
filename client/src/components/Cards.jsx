import { Link } from 'react-router-dom';
import { ArrowUpRight, MapPin, Clock, Heart, CalendarDays } from 'lucide-react';
import { money, progress, date } from '../utils/format';
export function CampaignCard({ campaign }) {
  const pct = progress(campaign);
  return (
    <article className="campaign-card">
      <Link
        className="campaign-image"
        to={`/campaigns/${campaign.id}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        <img src={campaign.image || '/images/education.jpg'} alt="" loading="lazy" />
        <span className="image-tag">{campaign.category}</span>
        <span className="image-arrow">
          <ArrowUpRight size={21} />
        </span>
      </Link>
      <div className="campaign-content">
        <span className="organization-label">{campaign.organizationName}</span>
        <h3>
          <Link to={`/campaigns/${campaign.id}`}>{campaign.title}</Link>
        </h3>
        <p>{campaign.summary}</p>
        <div className="progress-label">
          <strong>
            {money(campaign.raised)} <span>raised</span>
          </strong>
          <span>{pct}%</span>
        </div>
        <progress aria-label={`${campaign.title} funding progress`} max="100" value={pct} />
        <div className="campaign-bottom">
          <span>Goal {money(campaign.target)}</span>
          <span>
            <Heart size={13} />
            {campaign.donorCount || 0} donations
          </span>
        </div>
      </div>
    </article>
  );
}
export function OpportunityCard({ opportunity, index = 0 }) {
  const icons = ['📚', '🩺', '🥣', '🌱', '🤝'];
  return (
    <article className="opportunity-card">
      <div className={`opportunity-icon icon-${index % 5}`} aria-hidden="true">
        {icons[index % 5]}
      </div>
      <div className="opportunity-content">
        <span className="organization-label">{opportunity.organizationName}</span>
        <h3>
          <Link to={`/volunteer/${opportunity.id}`}>{opportunity.title}</Link>
        </h3>
        <div className="opportunity-meta">
          <span>
            <MapPin size={14} />
            {opportunity.location}
          </span>
          <span>
            <Clock size={14} />
            {opportunity.commitment}
          </span>
        </div>
      </div>
      <div className="opportunity-action">
        <span className="badge">{opportunity.category}</span>
        <Link
          to={`/volunteer/${opportunity.id}`}
          className="circle-link"
          aria-label={`View ${opportunity.title}`}
        >
          <ArrowUpRight size={20} />
        </Link>
      </div>
    </article>
  );
}
