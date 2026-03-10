'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { api, type Execution, type ExecutionList } from '@/lib/api';

type StatusFilter = 'all' | Execution['status'];

function StatusBadge({ status }: { status: Execution['status'] }) {
  const map: Record<Execution['status'], string> = {
    pending: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
    running: 'bg-blue-900/40 text-blue-400 border-blue-800 animate-pulse',
    completed: 'bg-green-900/40 text-green-400 border-green-800',
    failed: 'bg-red-900/40 text-red-400 border-red-800',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[status]}`}
    >
      {status}
    </span>
  );
}

function truncateJson(obj: Record<string, unknown> | null | undefined, maxLen = 60): string {
  if (!obj) return '—';
  const s = JSON.stringify(obj);
  return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
}

function ExpandableRow({ execution }: { execution: Execution }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="cursor-pointer border-b border-gray-800 transition-colors hover:bg-gray-800/40"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="px-4 py-3 text-sm">
          {execution.agent_name ?? (
            <span className="font-mono text-xs text-gray-500">{execution.agent_id.slice(0, 8)}…</span>
          )}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={execution.status} />
        </td>
        <td className="hidden px-4 py-3 font-mono text-xs text-gray-400 md:table-cell">
          {truncateJson(execution.input_data as Record<string, unknown>)}
        </td>
        <td className="hidden px-4 py-3 font-mono text-xs text-gray-400 lg:table-cell">
          {truncateJson(execution.output_data as Record<string, unknown>)}
        </td>
        <td className="px-4 py-3 text-sm text-gray-400">
          {execution.duration_ms != null
            ? `${(execution.duration_ms / 1000).toFixed(1)}s`
            : '—'}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {new Date(execution.created_at).toLocaleString()}
        </td>
        <td className="px-4 py-3 text-right text-xs text-indigo-400">
          {open ? '▲' : '▼'}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-gray-800 bg-gray-900/60">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-400">Input</p>
                <pre className="overflow-x-auto rounded bg-gray-950 p-3 text-xs text-gray-300">
                  {JSON.stringify(execution.input_data, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-400">Output</p>
                <pre className="overflow-x-auto rounded bg-gray-950 p-3 text-xs text-gray-300">
                  {execution.output_data
                    ? JSON.stringify(execution.output_data, null, 2)
                    : '—'}
                </pre>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Execution ID: {execution.id}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ExecutionHistoryPage() {
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string })?.accessToken;

  const [data, setData] = useState<ExecutionList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const limit = 20;

  const fetchExecutions = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.executions.list(accessToken, { page, limit });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  }, [accessToken, page]);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  const filteredItems =
    data?.items.filter((e) => statusFilter === 'all' || e.status === statusFilter) ?? [];

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  if (!accessToken) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-xl border border-yellow-800 bg-yellow-900/20 p-6 text-center text-sm text-yellow-300">
          Please{' '}
          <Link href="/login" className="underline">
            sign in
          </Link>{' '}
          to view your execution history.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Execution History</h1>
          <p className="mt-1 text-gray-400">
            All your past agent runs{data ? ` — ${data.total} total` : ''}
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-indigo-400 hover:text-indigo-300">
          ← Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(['all', 'pending', 'running', 'completed', 'failed'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'border-indigo-600 bg-indigo-600/20 text-indigo-300'
                : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-900/20 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading executions…</div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/20 p-12 text-center">
          <div className="text-4xl">⚡</div>
          <h3 className="mt-4 text-lg font-semibold">No executions yet</h3>
          <p className="mt-2 text-sm text-gray-400">
            Run an agent to see your history here.
          </p>
          <Link
            href="/agents"
            className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Browse Agents
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Agent
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 md:table-cell">
                  Input
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 lg:table-cell">
                  Output
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((e) => (
                <ExpandableRow key={e.id} execution={e} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
