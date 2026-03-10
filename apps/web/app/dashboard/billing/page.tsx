'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { api, type Transaction, type Subscription, type DeveloperEarnings } from '@/lib/api';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-green-900/40 text-green-400 border-green-800',
    pending: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
    failed: 'bg-red-900/40 text-red-400 border-red-800',
    refunded: 'bg-gray-900/40 text-gray-400 border-gray-700',
    active: 'bg-green-900/40 text-green-400 border-green-800',
    canceled: 'bg-red-900/40 text-red-400 border-red-800',
    past_due: 'bg-orange-900/40 text-orange-400 border-orange-800',
    expired: 'bg-gray-900/40 text-gray-400 border-gray-700',
  };
  const cls = map[status] ?? 'bg-gray-800 text-gray-400 border-gray-700';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function formatCurrency(amount: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function BillingDashboardPage() {
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string })?.accessToken;

  const [activeTab, setActiveTab] = useState<'consumer' | 'developer'>('consumer');

  // Consumer state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState('');

  // Developer state
  const [earnings, setEarnings] = useState<DeveloperEarnings | null>(null);
  const [devTransactions, setDevTransactions] = useState<Transaction[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [devTxLoading, setDevTxLoading] = useState(true);

  const fetchConsumerData = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await api.billing.transactions(accessToken, { limit: 50, page: 1 });
      setTransactions(data.items);
    } catch {
      // non-critical
    } finally {
      setTxLoading(false);
    }

    try {
      const data = await api.billing.subscriptions(accessToken);
      setSubscriptions(data.items);
    } catch {
      // non-critical
    } finally {
      setSubLoading(false);
    }
  }, [accessToken]);

  const fetchDeveloperData = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await api.billing.developerEarnings(accessToken);
      setEarnings(data);
    } catch {
      // non-critical
    } finally {
      setEarningsLoading(false);
    }

    try {
      const data = await api.billing.developerTransactions(accessToken, { limit: 50, page: 1 });
      setDevTransactions(data.items);
    } catch {
      // non-critical
    } finally {
      setDevTxLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchConsumerData();
    fetchDeveloperData();
  }, [fetchConsumerData, fetchDeveloperData]);

  async function handleCancelSubscription(sub: Subscription) {
    if (!accessToken) return;
    setCancelingId(sub.id);
    setCancelError('');
    try {
      await api.billing.cancelSubscription(sub.id, accessToken);
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, status: 'canceled' } : s))
      );
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCancelingId(null);
    }
  }

  const totalSpent = transactions
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/dashboard" className="text-sm text-indigo-400 hover:text-indigo-300">
            ← Dashboard
          </Link>
        </div>
        <h1 className="text-4xl font-bold">Billing</h1>
        <p className="mt-2 text-gray-400">Manage payments, subscriptions and earnings</p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 rounded-xl border border-gray-800 bg-gray-900/50 p-1 w-fit">
        <button
          onClick={() => setActiveTab('consumer')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'consumer'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          My Payments
        </button>
        <button
          onClick={() => setActiveTab('developer')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'developer'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Developer Earnings
        </button>
      </div>

      {/* ── Consumer Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'consumer' && (
        <div className="space-y-8">
          {/* Summary */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <div className="text-3xl">💸</div>
              <div className="mt-3 text-2xl font-bold">{formatCurrency(totalSpent)}</div>
              <div className="text-sm text-gray-400">Total Spent</div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <div className="text-3xl">🔄</div>
              <div className="mt-3 text-2xl font-bold">
                {subscriptions.filter((s) => s.status === 'active').length}
              </div>
              <div className="text-sm text-gray-400">Active Subscriptions</div>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <div className="text-3xl">⚡</div>
              <div className="mt-3 text-2xl font-bold">
                {transactions.filter((t) => t.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-400">Completed Payments</div>
            </div>
          </div>

          {/* Active Subscriptions */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Active Subscriptions</h2>
            {cancelError && (
              <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                {cancelError}
              </div>
            )}
            {subLoading ? (
              <div className="py-8 text-center text-gray-500">Loading…</div>
            ) : subscriptions.filter((s) => s.status === 'active').length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/20 p-8 text-center text-gray-500">
                No active subscriptions
              </div>
            ) : (
              <div className="rounded-xl border border-gray-800 bg-gray-900/50">
                <div className="divide-y divide-gray-800">
                  {subscriptions
                    .filter((s) => s.status === 'active')
                    .map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between px-6 py-4">
                        <div>
                          <p className="font-medium">
                            {sub.agent_name ?? sub.agent_id.slice(0, 8) + '…'}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            Renews:{' '}
                            {sub.current_period_end
                              ? new Date(sub.current_period_end).toLocaleDateString()
                              : '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={sub.status} />
                          <button
                            onClick={() => handleCancelSubscription(sub)}
                            disabled={cancelingId === sub.id}
                            className="rounded-lg border border-red-800/50 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:border-red-700 hover:bg-red-900/20 disabled:opacity-50"
                          >
                            {cancelingId === sub.id ? 'Canceling…' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Transaction History</h2>
            {txLoading ? (
              <div className="py-8 text-center text-gray-500">Loading…</div>
            ) : transactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/20 p-8 text-center text-gray-500">
                No transactions yet
              </div>
            ) : (
              <div className="rounded-xl border border-gray-800 bg-gray-900/50">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        <th className="px-6 py-3">Agent</th>
                        <th className="px-6 py-3">Amount</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="text-sm">
                          <td className="px-6 py-4 font-medium">
                            {tx.agent_name ?? tx.agent_id.slice(0, 8) + '…'}
                          </td>
                          <td className="px-6 py-4">
                            {formatCurrency(Number(tx.amount), tx.currency)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-300">
                              {tx.payment_type === 'one_time' ? 'One-time' : 'Subscription'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={tx.status} />
                          </td>
                          <td className="px-6 py-4 text-gray-400">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Developer Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'developer' && (
        <div className="space-y-8">
          {/* Earnings Summary */}
          {earningsLoading ? (
            <div className="py-8 text-center text-gray-500">Loading earnings…</div>
          ) : earnings ? (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                  <div className="text-3xl">💰</div>
                  <div className="mt-3 text-2xl font-bold text-green-400">
                    {formatCurrency(Number(earnings.total_earned))}
                  </div>
                  <div className="text-sm text-gray-400">Total Earned</div>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                  <div className="text-3xl">📅</div>
                  <div className="mt-3 text-2xl font-bold">
                    {formatCurrency(Number(earnings.this_month))}
                  </div>
                  <div className="text-sm text-gray-400">This Month</div>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                  <div className="text-3xl">⏳</div>
                  <div className="mt-3 text-2xl font-bold text-yellow-400">
                    {formatCurrency(Number(earnings.pending_payout))}
                  </div>
                  <div className="text-sm text-gray-400">Pending Payout</div>
                </div>
              </div>

              {/* Revenue Split */}
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h2 className="mb-4 font-semibold">Revenue Split</h2>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-4 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                        style={{ width: '80%' }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 w-48 text-right">
                    <span className="text-indigo-400 font-medium">80% you</span>
                    {' / '}
                    <span className="text-gray-500">20% platform</span>
                  </div>
                </div>
              </div>

              {/* Earnings by Agent */}
              {earnings.by_agent.length > 0 && (
                <div>
                  <h2 className="mb-4 text-xl font-semibold">Earnings by Agent</h2>
                  <div className="rounded-xl border border-gray-800 bg-gray-900/50">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-800 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            <th className="px-6 py-3">Agent</th>
                            <th className="px-6 py-3">Total Earned</th>
                            <th className="px-6 py-3">Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {earnings.by_agent.map((item) => {
                            const share =
                              Number(earnings.total_earned) > 0
                                ? (item.total / Number(earnings.total_earned)) * 100
                                : 0;
                            return (
                              <tr key={item.agent_id} className="text-sm">
                                <td className="px-6 py-4 font-medium">{item.agent_name}</td>
                                <td className="px-6 py-4 text-green-400">
                                  {formatCurrency(item.total)}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-800">
                                      <div
                                        className="h-full bg-indigo-500 rounded-full"
                                        style={{ width: `${share}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-gray-400">
                                      {share.toFixed(1)}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/20 p-8 text-center text-gray-500">
              No earnings data available. Publish paid agents to start earning.
            </div>
          )}

          {/* Developer Transactions */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Revenue Transactions</h2>
            {devTxLoading ? (
              <div className="py-8 text-center text-gray-500">Loading…</div>
            ) : devTransactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/20 p-8 text-center text-gray-500">
                No transactions yet for your agents
              </div>
            ) : (
              <div className="rounded-xl border border-gray-800 bg-gray-900/50">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        <th className="px-6 py-3">Agent</th>
                        <th className="px-6 py-3">Total</th>
                        <th className="px-6 py-3">Your Payout (80%)</th>
                        <th className="px-6 py-3">Platform (20%)</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {devTransactions.map((tx) => (
                        <tr key={tx.id} className="text-sm">
                          <td className="px-6 py-4 font-medium">
                            {tx.agent_name ?? tx.agent_id.slice(0, 8) + '…'}
                          </td>
                          <td className="px-6 py-4">
                            {formatCurrency(Number(tx.amount), tx.currency)}
                          </td>
                          <td className="px-6 py-4 text-green-400">
                            {formatCurrency(Number(tx.developer_payout), tx.currency)}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {formatCurrency(Number(tx.platform_fee), tx.currency)}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={tx.status} />
                          </td>
                          <td className="px-6 py-4 text-gray-400">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
