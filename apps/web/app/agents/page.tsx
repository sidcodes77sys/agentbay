'use client';

import { useState } from 'react';
import { AgentGrid } from '@/components/AgentGrid';
import { SearchBar } from '@/components/SearchBar';
import type { Agent } from '@/lib/api';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'research', label: 'Research' },
  { id: 'writing', label: 'Writing' },
  { id: 'data', label: 'Data' },
  { id: 'automation', label: 'Automation' },
  { id: 'customer_service', label: 'Customer Service' },
  { id: 'other', label: 'Other' },
];

const MOCK_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'ResearchBot Pro',
    slug: 'researchbot-pro',
    description: 'Deep research assistant that scours the web and synthesizes findings into structured reports.',
    category: 'research',
    author: { id: 'a1', username: 'aibuilder', display_name: 'AI Builder' },
    version: '1.2.0',
    pricing_type: 'per_use',
    price_per_use: 0.05,
    rating: 4.8,
    total_executions: 12400,
    is_published: true,
    tags: ['research', 'web', 'reports'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'CopyWriter AI',
    slug: 'copywriter-ai',
    description: 'Generates compelling marketing copy, blog posts, and social media content at scale.',
    category: 'writing',
    author: { id: 'a2', username: 'wordsmith', display_name: 'Wordsmith Labs' },
    version: '2.0.1',
    pricing_type: 'subscription',
    monthly_price: 29,
    rating: 4.6,
    total_executions: 8900,
    is_published: true,
    tags: ['writing', 'marketing', 'content'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'DataSense',
    slug: 'datasense',
    description: 'Analyzes CSV/JSON data and produces charts, summaries, and actionable insights.',
    category: 'data',
    author: { id: 'a3', username: 'datawiz', display_name: 'DataWiz Inc.' },
    version: '1.0.5',
    pricing_type: 'free',
    rating: 4.9,
    total_executions: 31200,
    is_published: true,
    tags: ['data', 'analytics', 'charts'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '4',
    name: 'AutoFlow',
    slug: 'autoflow',
    description: 'Automate repetitive workflows with natural language instructions. Connect to 100+ apps.',
    category: 'automation',
    author: { id: 'a4', username: 'flowmaster', display_name: 'FlowMaster' },
    version: '3.1.0',
    pricing_type: 'subscription',
    monthly_price: 49,
    rating: 4.7,
    total_executions: 22100,
    is_published: true,
    tags: ['automation', 'workflow', 'integration'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '5',
    name: 'SupportGenius',
    slug: 'supportgenius',
    description: 'AI-powered customer support agent that handles tickets, FAQs, and escalations.',
    category: 'customer_service',
    author: { id: 'a5', username: 'supportlabs', display_name: 'Support Labs' },
    version: '1.5.2',
    pricing_type: 'per_use',
    price_per_use: 0.02,
    rating: 4.5,
    total_executions: 45600,
    is_published: true,
    tags: ['support', 'customer-service', 'tickets'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '6',
    name: 'CodeReviewer',
    slug: 'codereviewer',
    description: 'Automated code review agent that checks for bugs, security issues, and style problems.',
    category: 'other',
    author: { id: 'a6', username: 'devtools', display_name: 'DevTools Co.' },
    version: '2.3.0',
    pricing_type: 'per_use',
    price_per_use: 0.10,
    rating: 4.8,
    total_executions: 9800,
    is_published: true,
    tags: ['code', 'review', 'security'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export default function AgentsPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = MOCK_AGENTS.filter((agent) => {
    const matchesSearch =
      search === '' ||
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.description.toLowerCase().includes(search.toLowerCase()) ||
      agent.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      activeCategory === 'all' || agent.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Browse Agents</h1>
        <p className="mt-2 text-gray-400">Discover AI agents built by the community</p>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search agents..." />

      {/* Category tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORIES.map(({ id, label }) => (
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
          </button>
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        {filtered.length} agent{filtered.length !== 1 ? 's' : ''} found
      </div>

      <div className="mt-6">
        <AgentGrid agents={filtered} />
      </div>
    </div>
  );
}
