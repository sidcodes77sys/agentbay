'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AgentCard } from '@/components/AgentCard';
import { AgentRunPanel } from '@/components/AgentRunPanel';
import { api, type Agent } from '@/lib/api';

function formatPrice(agent: Agent) {
  if (agent.pricing_type === 'free') return 'Free';
  if (agent.pricing_type === 'per_use') return `$${agent.price_per_use}/use`;
  if (agent.pricing_type === 'subscription') return `$${agent.monthly_price}/mo`;
  return 'Contact';
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const currentUserId = (session?.user as { id?: string })?.id;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [relatedAgents, setRelatedAgents] = useState<Agent[]>([]);
  const [authorAgents, setAuthorAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAgent() {
      try {
        const data = await api.agents.get(id);
        setAgent(data);

        // Load related agents (same category, excluding this agent)
        const related = await api.agents.list({
          category: data.category,
          sort_by: 'top_rated',
          limit: 4,
        });
        setRelatedAgents(related.items.filter((a) => a.id !== data.id).slice(0, 3));

        // Load other agents by the same author
        const byAuthor = await api.agents.list({
          author_id: data.author.id,
          limit: 4,
        });
        setAuthorAgents(byAuthor.items.filter((a) => a.id !== data.id).slice(0, 3));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Agent not found');
      } finally {
        setLoading(false);
      }
    }
    loadAgent();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Loading agent…</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6">
          <Link href="/agents" className="text-sm text-indigo-400 hover:text-indigo-300">
            ← Back to agents
          </Link>
        </div>
        <div className="rounded-xl border border-red-800 bg-red-900/20 p-6 text-center text-sm text-red-300">
          {error || 'Agent not found'}
        </div>
      </div>
    );
  }

  const isOwner = currentUserId === agent.author.id;

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
            <div className="flex-1">
              <h1 className="text-4xl font-bold">{agent.name}</h1>
              <p className="mt-2 text-lg text-gray-400">{agent.description}</p>
            </div>
            {isOwner && (
              <Link href={`/dashboard/agents/${agent.id}/edit`} className="ml-4 shrink-0">
                <Button variant="outline" size="sm">
                  Edit Agent
                </Button>
              </Link>
            )}
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            <Badge variant="category">{agent.category.replace('_', ' ')}</Badge>
            {/* Clickable tag chips */}
            {agent.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => router.push(`/agents?q=${encodeURIComponent(tag)}`)}
                className="inline-flex items-center rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
              >
                #{tag}
              </button>
            ))}
          </div>

          {agent.long_description ? (
            <div className="prose prose-invert max-w-none rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                {agent.long_description}
              </pre>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 text-sm text-gray-500">
              No detailed description provided.
            </div>
          )}

          {/* Input schema */}
          {agent.config_schema && (
            <div className="mt-8">
              <h2 className="mb-4 text-xl font-semibold">Input Parameters</h2>
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <pre className="overflow-x-auto text-sm text-gray-300">
                  {JSON.stringify(agent.config_schema, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Related agents */}
          {relatedAgents.length > 0 && (
            <div className="mt-12">
              <h2 className="mb-4 text-xl font-semibold">
                Similar Agents{' '}
                <span className="text-sm font-normal text-gray-500">
                  in {agent.category.replace('_', ' ')}
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedAgents.map((a) => (
                  <AgentCard key={a.id} agent={a} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing card */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
            <div className="mb-4 text-3xl font-bold text-indigo-400">
              {formatPrice(agent)}
            </div>
            <p className="mt-3 text-center text-xs text-gray-500">
              {agent.pricing_type === 'free'
                ? 'Always free to use'
                : 'Billed after each successful execution'}
            </p>
          </div>

          {/* Run Agent panel */}
          <AgentRunPanel agent={agent} />

          {/* Stats */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
            <h3 className="mb-4 font-semibold">Stats</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-400">Rating</dt>
                <dd className="font-medium">⭐ {agent.rating.toFixed(1)}/5.0</dd>
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
                <dt className="text-gray-400">Status</dt>
                <dd>
                  <Badge variant={agent.is_published ? 'success' : 'warning'}>
                    {agent.is_published ? 'published' : 'draft'}
                  </Badge>
                </dd>
              </div>
            </dl>
          </div>

          {/* Author info */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
            <h3 className="mb-4 font-semibold">Author</h3>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold uppercase">
                {(agent.author.display_name || agent.author.username).charAt(0)}
              </div>
              <div>
                <p className="font-medium">{agent.author.display_name || agent.author.username}</p>
                <p className="text-sm text-gray-500">@{agent.author.username}</p>
              </div>
            </div>
            {authorAgents.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-gray-500">More agents by this author</p>
                <ul className="space-y-2">
                  {authorAgents.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/agents/${a.id}`}
                        className="text-sm text-indigo-400 hover:text-indigo-300"
                      >
                        {a.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/agents?author_id=${agent.author.id}`}
                  className="mt-3 block text-xs text-gray-500 hover:text-gray-400"
                >
                  View all →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


