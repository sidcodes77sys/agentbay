'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api, type Agent } from '@/lib/api';

function DeleteModal({
  agent,
  onConfirm,
  onCancel,
}: {
  agent: Agent;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-xl">
        <h3 className="text-lg font-semibold">Delete Agent</h3>
        <p className="mt-2 text-sm text-gray-400">
          Are you sure you want to delete{' '}
          <span className="font-medium text-white">{agent.name}</span>? This action
          cannot be undone.
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const accessToken = (session as { accessToken?: string })?.accessToken;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [actionError, setActionError] = useState('');

  const fetchAgents = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await api.agents.me(accessToken);
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  async function handleDelete(agent: Agent) {
    if (!accessToken) return;
    try {
      await api.agents.delete(agent.id, accessToken);
      setAgents((prev) => prev.filter((a) => a.id !== agent.id));
      setDeleteTarget(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete agent');
      setDeleteTarget(null);
    }
  }

  async function handleTogglePublish(agent: Agent) {
    if (!accessToken) return;
    try {
      const updated = await api.agents.update(
        agent.id,
        { is_published: !agent.is_published },
        accessToken
      );
      setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update agent');
    }
  }

  const publishedAgents = agents.filter((a) => a.is_published);
  const totalExecutions = agents.reduce((sum, a) => sum + a.total_executions, 0);
  const avgRating =
    agents.length > 0
      ? (agents.reduce((sum, a) => sum + a.rating, 0) / agents.length).toFixed(1)
      : '—';

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      {deleteTarget && (
        <DeleteModal
          agent={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Developer Dashboard</h1>
          <p className="mt-2 text-gray-400">Manage your published agents and track performance</p>
        </div>
        <Link href="/agents/publish">
          <Button>+ Publish New Agent</Button>
        </Link>
      </div>

      {actionError && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {actionError}
          <button
            className="ml-2 underline"
            onClick={() => setActionError('')}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats overview */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Published Agents', value: String(publishedAgents.length), icon: '🤖' },
          { label: 'Total Agents', value: String(agents.length), icon: '📦' },
          { label: 'Total Executions', value: totalExecutions.toLocaleString(), icon: '⚡' },
          { label: 'Avg. Rating', value: avgRating, icon: '⭐' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
            <div className="text-3xl">{icon}</div>
            <div className="mt-3 text-2xl font-bold">{value}</div>
            <div className="text-sm text-gray-400">{label}</div>
          </div>
        ))}
      </div>

      {/* Agents list */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading your agents…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-800 bg-red-900/20 p-6 text-center text-sm text-red-300">
          {error}
        </div>
      ) : agents.length > 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50">
          <div className="border-b border-gray-800 px-6 py-4">
            <h2 className="font-semibold">Your Agents</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/agents/${agent.id}`}
                      className="font-medium hover:text-indigo-400"
                    >
                      {agent.name}
                    </Link>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant="category">{agent.category}</Badge>
                    <Badge variant={agent.is_published ? 'success' : 'warning'}>
                      {agent.is_published ? 'published' : 'draft'}
                    </Badge>
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-6 text-sm text-gray-400">
                  <span className="hidden sm:inline" aria-label={`${agent.total_executions.toLocaleString()} runs`}>⚡ {agent.total_executions.toLocaleString()} runs</span>
                  <span className="hidden sm:inline" aria-label={`Rating: ${agent.rating.toFixed(1)}`}>⭐ {agent.rating.toFixed(1)}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePublish(agent)}
                    >
                      {agent.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/agents/${agent.id}/edit`)}
                    >
                      Edit
                    </Button>
                    <button
                      onClick={() => setDeleteTarget(agent)}
                      className="rounded-lg border border-red-800/50 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:border-red-700 hover:bg-red-900/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-gray-700 bg-gray-900/20 p-12 text-center">
          <div className="text-5xl">🚀</div>
          <h3 className="mt-4 text-xl font-semibold">Ready to publish your first agent?</h3>
          <p className="mt-2 text-gray-400">
            Share your AI agent with the AgentBay community.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link href="/agents/publish">
              <Button>Publish New Agent</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

