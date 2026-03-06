'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AgentGrid } from '@/components/AgentGrid';
import { SearchBar } from '@/components/SearchBar';
import { api, type Agent } from '@/lib/api';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'research', label: 'Research' },
  { id: 'writing', label: 'Writing' },
  { id: 'data', label: 'Data' },
  { id: 'automation', label: 'Automation' },
  { id: 'customer_service', label: 'Customer Service' },
  { id: 'other', label: 'Other' },
];

const PRICING_TYPES = [
  { id: 'all', label: 'All Pricing' },
  { id: 'free', label: 'Free' },
  { id: 'per_use', label: 'Per Use' },
  { id: 'subscription', label: 'Subscription' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'top_rated', label: 'Top Rated' },
  { value: 'most_used', label: 'Most Used' },
  { value: 'name', label: 'A–Z' },
];

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function AgentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive state from URL params
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') ?? 'all');
  const [activePricing, setActivePricing] = useState(searchParams.get('pricing') ?? 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') ?? 'newest');

  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync URL params when filters change
  const syncUrl = useCallback(
    (q: string, category: string, pricing: string, sort: string) => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (category && category !== 'all') params.set('category', category);
      if (pricing && pricing !== 'all') params.set('pricing', pricing);
      if (sort && sort !== 'newest') params.set('sort', sort);
      const qs = params.toString();
      router.replace(`/agents${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router]
  );

  const fetchAgents = useCallback(
    async (q: string, category: string, pricing: string, sort: string, currentSkip: number, append: boolean) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        const result = await api.agents.list({
          q: q || undefined,
          category: category !== 'all' ? category : undefined,
          pricing_type: pricing !== 'all' ? pricing : undefined,
          sort_by: sort,
          skip: currentSkip,
          limit: PAGE_SIZE,
        });

        setTotal(result.total);
        setAgents((prev) => (append ? [...prev, ...result.items] : result.items));
      } catch {
        if (!append) setAgents([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Load category stats on mount
  useEffect(() => {
    api.agents
      .categoryStats()
      .then((res) => setCategoryStats(res.stats))
      .catch(() => {});
  }, []);

  // Initial + filter change fetch (debounced for search)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSkip(0);
      fetchAgents(search, activeCategory, activePricing, sortBy, 0, false);
      syncUrl(search, activeCategory, activePricing, sortBy);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, activeCategory, activePricing, sortBy, fetchAgents, syncUrl]);

  const handleLoadMore = () => {
    const nextSkip = skip + PAGE_SIZE;
    setSkip(nextSkip);
    fetchAgents(search, activeCategory, activePricing, sortBy, nextSkip, true);
  };

  const hasMore = agents.length < total;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Browse Agents</h1>
        <p className="mt-2 text-gray-400">Discover AI agents built by the community</p>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search agents by name, description, or tag…" />

      {/* Category tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORIES.map(({ id, label }) => {
          const count = id === 'all'
            ? Object.values(categoryStats).reduce((a, b) => a + b, 0)
            : categoryStats[id];
          return (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === id
                  ? 'bg-indigo-600 text-white'
                  : 'border border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {label}
              {count !== undefined && (
                <span className={`ml-1.5 text-xs ${activeCategory === id ? 'text-indigo-200' : 'text-gray-600'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Pricing filter + Sort */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {PRICING_TYPES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActivePricing(id)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                activePricing === id
                  ? id === 'free'
                    ? 'bg-green-600 text-white'
                    : id === 'per_use'
                    ? 'bg-blue-600 text-white'
                    : id === 'subscription'
                    ? 'bg-purple-600 text-white'
                    : 'bg-indigo-600 text-white'
                  : 'border border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 focus:border-indigo-500 focus:outline-none"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Result count */}
      {!loading && (
        <div className="mt-4 text-sm text-gray-500">
          {total} agent{total !== 1 ? 's' : ''} found
        </div>
      )}

      {/* Agent grid */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-xl border border-gray-800 bg-gray-900/50" />
            ))}
          </div>
        ) : (
          <AgentGrid agents={agents} />
        )}
      </div>

      {/* Load More */}
      {!loading && hasMore && (
        <div className="mt-10 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="rounded-xl border border-gray-700 bg-gray-800/50 px-8 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : `Load More (${total - agents.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
}

