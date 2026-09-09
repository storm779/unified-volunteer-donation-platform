import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Heart } from 'lucide-react';
import { useLiveData } from '../hooks/useLiveData';
import { CampaignCard } from '../components/Cards';
import { PageHeading, Loading, ErrorState, EmptyState } from '../components/UI';
export default function CampaignsPage() {
  const { data, loading, error, refresh } = useLiveData('/campaigns', ['campaigns']);
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'All causes';
  const search = params.get('q') || '';
  const [sort, setSort] = useState('featured');
  const categories = ['All causes', ...new Set((data || []).map((c) => c.category))];
  const filtered = useMemo(
    () =>
      (data || [])
        .filter(
          (c) =>
            (category === 'All causes' || c.category === category) &&
            `${c.title} ${c.summary} ${c.location} ${c.organizationName}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === 'progress'
            ? b.raised / b.target - a.raised / a.target
            : sort === 'newest'
              ? b.createdAt.localeCompare(a.createdAt)
              : 0,
        ),
    [data, category, search, sort],
  );
  const update = (key, value) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value && value !== 'All causes') next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  return (
    <section className="container section browse-page">
      <PageHeading
        eyebrow="A LITTLE HELP. A LASTING DIFFERENCE."
        title={
          <>
            Find a cause.
            <br />
            <em>Be part of its story.</em>
          </>
        }
        description="Discover community-led campaigns and put your kindness into action."
      />
      <div className="browse-tools">
        <label className="search-field">
          <Search size={20} />
          <input
            aria-label="Search campaigns"
            placeholder="Search a cause, community, or location…"
            value={search}
            onChange={(e) => update('q', e.target.value)}
          />
        </label>
        <label className="sort-field">
          <SlidersHorizontal size={17} />
          <select
            aria-label="Sort campaigns"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="featured">Featured first</option>
            <option value="progress">Most funded</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
      </div>
      <div className="filter-chips" aria-label="Campaign categories">
        {categories.map((c) => (
          <button
            key={c}
            aria-pressed={c === category}
            className={c === category ? 'selected' : ''}
            onClick={() => update('category', c)}
          >
            {c === 'All causes' && <Heart size={15} />} {c}
          </button>
        ))}
      </div>
      <div className="results-heading">
        <p>
          <strong>{filtered.length}</strong> causes to care about
        </p>
        <span>Every act of kindness counts.</span>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : filtered.length ? (
        <div className="campaign-grid">
          {filtered.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No campaigns found"
          description="Try a different search or explore all causes."
        >
          <button className="button secondary" onClick={() => setParams({})}>
            Clear filters
          </button>
        </EmptyState>
      )}
    </section>
  );
}
