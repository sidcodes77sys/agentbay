'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
  const currentUserId = (session?.user as { id?: string })?.id;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAgent() {
      try {
        const data = await api.agents.get(id);
        setAgent(data);
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
            <Badge variant="category">{agent.category}</Badge>
            {agent.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>

          {agent.long_description ? (
            <div className="prose prose-invert max-w-none rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <pre className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
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
                <dt className="text-gray-400">Author</dt>
                <dd className="font-medium">{agent.author.display_name || agent.author.username}</dd>
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
        </div>
      </div>
    </div>
  );
}
