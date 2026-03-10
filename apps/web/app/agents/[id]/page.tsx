'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AgentCard } from '@/components/AgentCard';
import { api, type Agent, type Execution, type Subscription } from '@/lib/api';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
);

function formatPrice(agent: Agent) {
  if (agent.pricing_type === 'free') return 'Free';
  if (agent.pricing_type === 'per_use') return `$${agent.price_per_use}/use`;
  if (agent.pricing_type === 'subscription') return `$${agent.monthly_price}/mo`;
  return 'Contact';
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Execution['status'] }) {
  const map: Record<Execution['status'], string> = {
    pending: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
    running: 'bg-blue-900/40 text-blue-400 border-blue-800 animate-pulse',
    completed: 'bg-green-900/40 text-green-400 border-green-800',
    failed: 'bg-red-900/40 text-red-400 border-red-800',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  );
}

// ── Schema field types ────────────────────────────────────────────────────────
interface FieldSchema {
  type?: string;
  title?: string;
  description?: string;
  enum?: string[];
  default?: unknown;
}

interface ConfigSchema {
  properties?: Record<string, FieldSchema>;
  required?: string[];
}

// ── Dynamic input form ────────────────────────────────────────────────────────
function DynamicForm({
  schema,
  values,
  onChange,
  disabled,
}: {
  schema: ConfigSchema;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled: boolean;
}) {
  const properties = schema.properties ?? {};
  const required = schema.required ?? [];

  if (Object.keys(properties).length === 0) {
    return (
      <p className="text-sm text-gray-500">
        This agent requires no input parameters.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(properties).map(([key, field]) => {
        const label = field.title ?? key;
        const isRequired = required.includes(key);
        const inputId = `field-${key}`;
        const currentValue = values[key] ?? field.default ?? '';

        if (field.enum) {
          return (
            <div key={key}>
              <label htmlFor={inputId} className="mb-1 block text-sm font-medium">
                {label}
                {isRequired && <span className="ml-1 text-red-400">*</span>}
              </label>
              {field.description && (
                <p className="mb-1 text-xs text-gray-500">{field.description}</p>
              )}
              <select
                id={inputId}
                disabled={disabled}
                value={String(currentValue)}
                onChange={(e) => onChange(key, e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">— Select —</option>
                {field.enum.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (field.type === 'boolean') {
          return (
            <div key={key} className="flex items-center gap-3">
              <input
                id={inputId}
                type="checkbox"
                disabled={disabled}
                checked={Boolean(currentValue)}
                onChange={(e) => onChange(key, e.target.checked)}
                className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
              />
              <label htmlFor={inputId} className="text-sm font-medium">
                {label}
                {isRequired && <span className="ml-1 text-red-400">*</span>}
              </label>
              {field.description && (
                <span className="text-xs text-gray-500">{field.description}</span>
              )}
            </div>
          );
        }

        if (field.type === 'number' || field.type === 'integer') {
          return (
            <div key={key}>
              <label htmlFor={inputId} className="mb-1 block text-sm font-medium">
                {label}
                {isRequired && <span className="ml-1 text-red-400">*</span>}
              </label>
              {field.description && (
                <p className="mb-1 text-xs text-gray-500">{field.description}</p>
              )}
              <input
                id={inputId}
                type="number"
                disabled={disabled}
                value={String(currentValue)}
                onChange={(e) =>
                  onChange(key, e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              />
            </div>
          );
        }

        // Long text (textarea) heuristic: description or text area hint
        const isLong =
          field.type === 'text' ||
          (field.description?.toLowerCase().includes('long') ?? false) ||
          key === 'content' ||
          key === 'text' ||
          key === 'prompt' ||
          key === 'message';

        if (isLong) {
          return (
            <div key={key}>
              <label htmlFor={inputId} className="mb-1 block text-sm font-medium">
                {label}
                {isRequired && <span className="ml-1 text-red-400">*</span>}
              </label>
              {field.description && (
                <p className="mb-1 text-xs text-gray-500">{field.description}</p>
              )}
              <textarea
                id={inputId}
                disabled={disabled}
                value={String(currentValue)}
                onChange={(e) => onChange(key, e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              />
            </div>
          );
        }

        return (
          <div key={key}>
            <label htmlFor={inputId} className="mb-1 block text-sm font-medium">
              {label}
              {isRequired && <span className="ml-1 text-red-400">*</span>}
            </label>
            {field.description && (
              <p className="mb-1 text-xs text-gray-500">{field.description}</p>
            )}
            <input
              id={inputId}
              type="text"
              disabled={disabled}
              value={String(currentValue)}
              onChange={(e) => onChange(key, e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Stripe payment form (inner, must be inside <Elements>) ────────────────────
function PaymentForm({
  amount,
  currency,
  onSuccess,
  onCancel,
}: {
  amount: number;
  currency: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    setPayError('');
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (error) {
      setPayError(error.message ?? 'Payment failed');
      setPaying(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div>
      <div className="mb-4 rounded-lg border border-indigo-800 bg-indigo-900/20 p-3 text-center">
        <span className="text-lg font-bold text-indigo-300">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount)}
        </span>
        <p className="mt-0.5 text-xs text-gray-400">One-time charge for this run</p>
      </div>
      <div className="mb-4 rounded-lg border border-gray-700 bg-gray-800 p-3">
        <PaymentElement />
      </div>
      {payError && (
        <p className="mb-3 text-sm text-red-400">{payError}</p>
      )}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1" disabled={paying}>
          Cancel
        </Button>
        <button
          onClick={handlePay}
          disabled={!stripe || paying}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {paying ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Processing…
            </>
          ) : (
            '💳 Pay & Run'
          )}
        </button>
      </div>
    </div>
  );
}

// ── Payment modal (for per-use agents) ───────────────────────────────────────
function PaymentModal({
  clientSecret,
  amount,
  currency,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  amount: number;
  currency: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="text-2xl">💳</span>
          <div>
            <h3 className="text-lg font-semibold">Payment Required</h3>
            <p className="text-sm text-gray-400">Enter your card details to run this agent</p>
          </div>
        </div>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: { theme: 'night', variables: { colorPrimary: '#6366f1' } },
          }}
        >
          <PaymentForm
            amount={amount}
            currency={currency}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      </div>
    </div>
  );
}

// ── Subscription modal ────────────────────────────────────────────────────────
function SubscriptionModal({
  agent,
  clientSecret,
  onSuccess,
  onCancel,
}: {
  agent: Agent;
  clientSecret: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  // If no client_secret, subscription was activated immediately (e.g. trial)
  if (!clientSecret) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl text-center">
          <div className="mb-4 text-4xl">✅</div>
          <h3 className="text-lg font-semibold">Subscription Activated</h3>
          <p className="mt-2 text-sm text-gray-400">
            Your subscription to <strong>{agent.name}</strong> is now active.
          </p>
          <Button onClick={onSuccess} className="mt-6 w-full">Run Agent</Button>
        </div>
      </div>
    );
  }

  const handleConfirm = async () => {
    const stripe = await stripePromise;
    if (!stripe) return;
    setConfirming(true);
    setError('');
    const { error: stripeError } = await stripe.confirmPayment({
      clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed');
      setConfirming(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="text-2xl">🔄</span>
          <div>
            <h3 className="text-lg font-semibold">Subscribe to {agent.name}</h3>
            <p className="text-sm text-gray-400">
              ${agent.monthly_price}/month · Cancel anytime
            </p>
          </div>
        </div>
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1" disabled={confirming}>
            Cancel
          </Button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirming ? 'Processing…' : `Subscribe · $${agent.monthly_price}/mo`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Execution panel ───────────────────────────────────────────────────────────
function ExecutionPanel({
  agent,
  accessToken,
  activeSubscription,
  onSubscribed,
}: {
  agent: Agent;
  accessToken?: string;
  activeSubscription: Subscription | null;
  onSubscribed: () => void;
}) {
  const schema = (agent.config_schema ?? {}) as ConfigSchema;
  const properties = schema.properties ?? {};

  const buildDefaults = () =>
    Object.entries(properties).reduce<Record<string, unknown>>((acc, [key, field]) => {
      if (field.default !== undefined) acc[key] = field.default;
      return acc;
    }, {});

  const [formValues, setFormValues] = useState<Record<string, unknown>>(buildDefaults());
  const [execution, setExecution] = useState<Execution | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [runError, setRunError] = useState('');

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<{
    clientSecret: string;
    amount: number;
    currency: string;
  } | null>(null);

  // Subscription modal state
  const [subscriptionModal, setSubscriptionModal] = useState<{
    clientSecret: string | null;
  } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFieldChange = (key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const startTimer = () => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const executeAgent = async () => {
    if (!accessToken) return;
    setRunError('');
    setExecution(null);
    setRunning(true);
    startTimer();
    try {
      const result = await api.executions.run(agent.id, formValues, accessToken);
      setExecution(result);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      stopTimer();
      setRunning(false);
    }
  };

  const handleRun = async () => {
    if (!accessToken) {
      signIn();
      return;
    }

    if (agent.pricing_type === 'free') {
      await executeAgent();
      return;
    }

    if (agent.pricing_type === 'per_use') {
      try {
        const intent = await api.billing.createPaymentIntent(agent.id, accessToken);
        setPaymentModal({
          clientSecret: intent.client_secret,
          amount: intent.amount,
          currency: intent.currency,
        });
      } catch (err) {
        setRunError(err instanceof Error ? err.message : 'Failed to create payment');
      }
      return;
    }

    if (agent.pricing_type === 'subscription') {
      if (activeSubscription) {
        await executeAgent();
        return;
      }
      try {
        const sub = await api.billing.createSubscription(agent.id, accessToken);
        setSubscriptionModal({ clientSecret: sub.client_secret ?? null });
      } catch (err) {
        setRunError(err instanceof Error ? err.message : 'Failed to create subscription');
      }
      return;
    }
  };

  const buttonLabel = () => {
    if (agent.pricing_type === 'free') return '▶ Run Agent';
    if (agent.pricing_type === 'per_use')
      return `💳 Pay $${agent.price_per_use} & Run`;
    if (agent.pricing_type === 'subscription') {
      if (activeSubscription) return '▶ Run Agent';
      return `🔄 Subscribe $${agent.monthly_price}/mo & Run`;
    }
    return '▶ Run Agent';
  };

  return (
    <>
      {paymentModal && (
        <PaymentModal
          clientSecret={paymentModal.clientSecret}
          amount={paymentModal.amount}
          currency={paymentModal.currency}
          onSuccess={async () => {
            setPaymentModal(null);
            await executeAgent();
          }}
          onCancel={() => setPaymentModal(null)}
        />
      )}

      {subscriptionModal && (
        <SubscriptionModal
          agent={agent}
          clientSecret={subscriptionModal.clientSecret}
          onSuccess={async () => {
            setSubscriptionModal(null);
            onSubscribed();
            await executeAgent();
          }}
          onCancel={() => setSubscriptionModal(null)}
        />
      )}

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="mb-4 text-xl font-semibold">Run Agent</h2>

        {agent.pricing_type !== 'free' && (
          <div className="mb-4 rounded-lg border border-gray-700 bg-gray-800/50 p-3 text-sm text-gray-400">
            {agent.pricing_type === 'per_use' && (
              <span>💡 This agent costs <strong className="text-blue-400">${agent.price_per_use} per run</strong>. You&apos;ll be charged after confirming payment.</span>
            )}
            {agent.pricing_type === 'subscription' && activeSubscription && (
              <span>✅ Active subscription — run freely until {activeSubscription.current_period_end ? new Date(activeSubscription.current_period_end).toLocaleDateString() : 'end of period'}.</span>
            )}
            {agent.pricing_type === 'subscription' && !activeSubscription && (
              <span>🔄 This agent requires a <strong className="text-purple-400">${agent.monthly_price}/month</strong> subscription.</span>
            )}
          </div>
        )}

        {/* Dynamic form */}
        <DynamicForm
          schema={schema}
          values={formValues}
          onChange={handleFieldChange}
          disabled={running}
        />

        {/* Run button */}
        <div className="mt-6">
          {!accessToken ? (
            <button
              onClick={() => signIn()}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Sign in to Run
            </button>
          ) : (
            <button
              onClick={handleRun}
              disabled={running}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Running agent… {elapsed}s
                </>
              ) : (
                buttonLabel()
              )}
            </button>
          )}
        </div>

        {/* Error */}
        {runError && (
          <div className="mt-4 rounded-lg border border-red-800 bg-red-900/20 p-4 text-sm text-red-300">
            {runError}
          </div>
        )}

        {/* Result */}
        {execution && (
          <div
            className={`mt-6 rounded-lg border p-4 ${
              execution.status === 'completed'
                ? 'border-green-800 bg-green-900/10'
                : 'border-red-800 bg-red-900/10'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Result</span>
              <div className="flex items-center gap-2">
                <StatusBadge status={execution.status} />
                {execution.duration_ms != null && (
                  <span className="text-xs text-gray-500">
                    {(execution.duration_ms / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            </div>
            <pre className="overflow-x-auto rounded bg-gray-950 p-3 text-xs leading-relaxed text-gray-300">
              {JSON.stringify(execution.output_data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const currentUserId = (session?.user as { id?: string })?.id;
  const accessToken = (session as { accessToken?: string })?.accessToken;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [relatedAgents, setRelatedAgents] = useState<Agent[]>([]);
  const [authorAgents, setAuthorAgents] = useState<Agent[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
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

  useEffect(() => {
    async function checkSubscription() {
      if (!accessToken || !agent || agent.pricing_type !== 'subscription') return;
      try {
        const subs = await api.billing.subscriptions(accessToken);
        const match = subs.items.find((s) => s.agent_id === agent.id);
        setActiveSubscription(match ?? null);
      } catch {
        // non-critical
      }
    }
    checkSubscription();
  }, [accessToken, agent]);

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

          {/* Execution panel */}
          <div className="mt-8">
            <ExecutionPanel
              agent={agent}
              accessToken={accessToken}
              activeSubscription={activeSubscription}
              onSubscribed={() => {
                // Re-fetch subscriptions after subscribing
                if (accessToken) {
                  api.billing.subscriptions(accessToken).then((subs) => {
                    const match = subs.items.find((s) => s.agent_id === agent.id);
                    setActiveSubscription(match ?? null);
                  }).catch(() => {});
                }
              }}
            />
          </div>

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
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Pricing</span>
              {agent.pricing_type === 'free' && (
                <span className="rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-400 border border-green-800">Free</span>
              )}
              {agent.pricing_type === 'per_use' && (
                <span className="rounded-full bg-blue-900/40 px-2.5 py-0.5 text-xs font-medium text-blue-400 border border-blue-800">Pay per use</span>
              )}
              {agent.pricing_type === 'subscription' && (
                <span className="rounded-full bg-purple-900/40 px-2.5 py-0.5 text-xs font-medium text-purple-400 border border-purple-800">Subscription</span>
              )}
            </div>
            <div className="mb-2 text-3xl font-bold text-indigo-400">
              {formatPrice(agent)}
            </div>
            <p className="text-xs text-gray-500">
              {agent.pricing_type === 'free'
                ? 'Always free to use'
                : agent.pricing_type === 'per_use'
                ? 'Charged per execution'
                : 'Billed monthly · cancel anytime'}
            </p>
            {agent.pricing_type === 'subscription' && activeSubscription && (
              <div className="mt-3 rounded-lg border border-green-800 bg-green-900/20 px-3 py-2 text-xs text-green-400">
                ✅ Active subscription
              </div>
            )}
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


