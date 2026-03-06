import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Agent } from '@/lib/api';

// Mock agent detail data
const MOCK_AGENT: Agent & { long_description: string; config_schema: Record<string, unknown> } = {
  id: '1',
  name: 'ResearchBot Pro',
  slug: 'researchbot-pro',
  description: 'Deep research assistant that scours the web and synthesizes findings into structured reports.',
  long_description: `## Overview

ResearchBot Pro is a powerful AI research assistant that helps you gather comprehensive information on any topic. It searches the web, evaluates sources, and synthesizes findings into clear, structured reports.

## Features

- **Deep web search** — Queries multiple search engines and data sources
- **Source evaluation** — Rates credibility of sources automatically
- **Structured output** — Returns results in Markdown, JSON, or PDF
- **Citation tracking** — Full bibliography generation

## Use Cases

- Academic research
- Market analysis
- Competitive intelligence
- Due diligence reports`,
  category: 'research',
  author: { id: 'a1', username: 'aibuilder', display_name: 'AI Builder' },
  version: '1.2.0',
  pricing_type: 'per_use',
  price_per_use: 0.05,
  rating: 4.8,
  total_executions: 12400,
  is_published: true,
  tags: ['research', 'web', 'reports'],
  config_schema: {
    topic: { type: 'string', description: 'Topic to research', required: true },
    depth: { type: 'number', description: 'Research depth (1-5)', default: 3 },
    format: { type: 'string', enum: ['markdown', 'json', 'pdf'], default: 'markdown' },
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

function formatPrice(agent: Agent) {
  if (agent.pricing_type === 'free') return 'Free';
  if (agent.pricing_type === 'per_use') return `$${agent.price_per_use}/use`;
  if (agent.pricing_type === 'subscription') return `$${agent.monthly_price}/mo`;
  return 'Contact';
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  void params; // params.id available via useParams in client components
  const agent = MOCK_AGENT; // TODO: fetch from API using params.id

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <div className="mb-6">
        <Link href="/agents" className="text-sm text-indigo-400 hover:text-indigo-300">
          ← Back to agents
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold">{agent.name}</h1>
              <p className="mt-2 text-lg text-gray-400">{agent.description}</p>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            <Badge variant="category">{agent.category}</Badge>
            {agent.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>

          <div className="prose prose-invert max-w-none rounded-xl border border-gray-800 bg-gray-900/50 p-6">
            <pre className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
              {agent.long_description}
            </pre>
          </div>

          {/* Input schema */}
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold">Input Parameters</h2>
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <pre className="overflow-x-auto text-sm text-gray-300">
                {JSON.stringify(agent.config_schema, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing card */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
            <div className="mb-4 text-3xl font-bold text-indigo-400">
              {formatPrice(agent)}
            </div>
            <Button className="w-full" size="lg">
              Run Agent
            </Button>
            <p className="mt-3 text-center text-xs text-gray-500">
              {agent.pricing_type === 'free'
                ? 'Always free to use'
                : 'Billed after each successful execution'}
            </p>
          </div>

          {/* Stats */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
            <h3 className="mb-4 font-semibold">Stats</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-400">Rating</dt>
                <dd className="font-medium">⭐ {agent.rating}/5.0</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Total runs</dt>
                <dd className="font-medium">{agent.total_executions.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Version</dt>
                <dd className="font-medium">v{agent.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Author</dt>
                <dd className="font-medium">{agent.author.display_name}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
