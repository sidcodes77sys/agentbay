'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { api, type Execution, type ExecutionStatus } from '@/lib/api';

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ExecutionStatus }) {
  const classes: Record<ExecutionStatus, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20',
    running: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 animate-pulse',
    completed: 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20',
    failed: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
  };
  const icons: Record<ExecutionStatus, string> = {
    pending: '⏳',
    running: '⚙️',
    completed: '✅',
    failed: '❌',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${classes[status]}`}
    >
      {icons[status]} {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Expandable row
// ---------------------------------------------------------------------------

function ExecutionRow({ execution }: { execution: Execution }) {
  const [expanded, setExpanded] = useState(false);

  const inputPreview = JSON.stringify(execution.input_data).slice(0, 80);
  const outputPreview = execution.output_data
    ? JSON.stringify(execution.output_data).slice(0, 80)
    : execution.error_message
    ? execution.error_message.slice(0, 80)
    : '—';

  return (
    <>
      <tr
        className="cursor-pointer transition-colors hover:bg-gray-800/50"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
          {new Date(execution.created_at).toLocaleString()}
        </td>
        <td className="px-4 py-3">
          <Link
            href={`/agents/${execution.agent_id}`}
            className="text-sm text-indigo-400 hover:text-indigo-300"
            onClick={(e) => e.stopPropagation()}
          >
            {execution.agent_id.slice(0, 8)}…
          </Link>
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={execution.status} />
        </td>
        <td className="max-w-[160px] truncate px-4 py-3 font-mono text-xs text-gray-400">
          {inputPreview}
          {inputPreview.length >= 80 ? '…' : ''}
        </td>
        <td className="max-w-[160px] truncate px-4 py-3 font-mono text-xs text-gray-400">
          {outputPreview}
          {outputPreview.length >= 80 ? '…' : ''}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-gray-500">
          {execution.duration_ms != null ? `${execution.duration_ms} ms` : '—'}
        </td>
        <td className="px-4 py-3 text-right text-xs text-gray-500">
          {expanded ? '▲' : '▼'}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-900/80">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Input
                </p>
                <pre className="overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-blue-300">
                  {JSON.stringify(execution.input_data, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Output
                </p>
                {execution.status === 'completed' && execution.output_data ? (
                  <pre className="overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-green-400">
                    {JSON.stringify(execution.output_data, null, 2)}
                  </pre>
                ) : execution.error_message ? (
                  <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-xs text-red-300">
                    {execution.error_message}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No output yet.</p>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span>Execution ID: {execution.id}</span>
              <Link
                href={`/agents/${execution.agent_id}`}
                className="text-indigo-400 hover:text-indigo-300"
              >
                View agent →
              </Link>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const STATUS_FILTERS: { label: string; value: ExecutionStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Running', value: 'running' },
  { label: 'Pending', value: 'pending' },
];

const PAGE_SIZE = 20;

export default function ExecutionHistoryPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const accessToken = (session as { accessToken?: string })?.accessToken;

  const [executions, setExecutions] = useState<Execution[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchExecutions = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.executions.list(
        {
          page,
          limit: PAGE_SIZE,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        accessToken
      );
      setExecutions(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, statusFilter]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [sessionStatus, router]);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Execution History</h1>
          <p className="mt-1 text-sm text-gray-400">
            All agent runs from your account
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => {
              setStatusFilter(value);
              setPage(1);
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
        {loading ? (
          <div className="py-16 text-center text-gray-500">Loading executions…</div>
        ) : executions.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl">⚡</div>
            <p className="mt-3 text-gray-400">No executions yet.</p>
            <Link
              href="/agents"
              className="mt-4 inline-block text-sm text-indigo-400 hover:text-indigo-300"
            >
              Browse agents →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Input</th>
                  <th className="px-4 py-3">Output</th>
                  <th className="px-4 py-3 text-right">Duration</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {executions.map((ex) => (
                  <ExecutionRow key={ex.id} execution={ex} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Page {page} of {totalPages} — {total} total executions
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-white disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-white disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
