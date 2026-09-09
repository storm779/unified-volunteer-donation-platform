import { useMemo, useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import { useLiveData } from '../hooks/useLiveData';
import { OpportunityCard } from '../components/Cards';
import { PageHeading, Loading, ErrorState, EmptyState } from '../components/UI';
export default function VolunteerPage() {
  const { data, loading, error, refresh } = useLiveData('/opportunities', ['opportunities']);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All opportunities');
  const categories = ['All opportunities', ...new Set((data || []).map((o) => o.category))];
  const filtered = useMemo(
    () =>
      (data || []).filter(
        (o) =>
          (category === 'All opportunities' || o.category === category) &&
          `${o.title} ${o.description} ${o.location}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [data, category, search],
  );
  return (
    <section className="container section browse-page">
      <PageHeading
        eyebrow="YOUR TIME IS A GIFT"
        title={
          <>
            Show up.
            <br />
            <em>Make someone’s day.</em>
          </>
        }
        description="Bring your skills, your energy, and your heart. We’ll help you find your place."
      />
      <div className="browse-tools">
        <label className="search-field">
          <Search size={20} />
          <input
            aria-label="Search opportunities"
            placeholder="Search by role, interest, or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="browse-note">
          <MapPin size={17} />
          Find good happening around you
        </div>
      </div>
      <div className="filter-chips" aria-label="Opportunity categories">
        {categories.map((c) => (
          <button
            key={c}
            aria-pressed={c === category}
            className={c === category ? 'selected' : ''}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="results-heading">
        <p>
          <strong>{filtered.length}</strong> ways to make a difference
        </p>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : filtered.length ? (
        <div className="volunteer-grid">
          {filtered.map((o, i) => (
            <div key={o.id} className="volunteer-browse-card">
              <OpportunityCard opportunity={o} index={i} />
              <p>
                {o.description.slice(0, 165)}
                {o.description.length > 165 ? '…' : ''}
              </p>
              <div>
                <span>{o.spots} total places</span>
                <span className={`badge status-${o.status}`}>{o.status}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No opportunities found"
          description="Try another skill, role, or location."
        >
          <button
            className="button secondary"
            onClick={() => {
              setSearch('');
              setCategory('All opportunities');
            }}
          >
            Clear filters
          </button>
        </EmptyState>
      )}
    </section>
  );
}
