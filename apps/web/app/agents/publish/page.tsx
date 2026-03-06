'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, type AgentCreatePayload } from '@/lib/api';

const CATEGORIES = [
  { value: 'research', label: 'Research' },
  { value: 'writing', label: 'Writing' },
  { value: 'data', label: 'Data' },
  { value: 'automation', label: 'Automation' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'other', label: 'Other' },
];

const PRICING_TYPES = [
  { value: 'free', label: 'Free' },
  { value: 'per_use', label: 'Per Use' },
  { value: 'subscription', label: 'Subscription' },
];

interface FormState {
  name: string;
  description: string;
  long_description: string;
  category: string;
  version: string;
  pricing_type: 'free' | 'per_use' | 'subscription';
  price_per_use: string;
  monthly_price: string;
  tags: string;
  config_schema: string;
  is_published: boolean;
}

export default function PublishAgentPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string })?.accessToken;

  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    long_description: '',
    category: 'other',
    version: '1.0.0',
    pricing_type: 'free',
    price_per_use: '',
    monthly_price: '',
    tags: '',
    config_schema: '',
    is_published: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'submit', string>>>({});
  const [loading, setLoading] = useState(false);

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: typeof errors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (form.pricing_type === 'per_use' && !form.price_per_use)
      newErrors.price_per_use = 'Price per use is required';
    if (form.pricing_type === 'subscription' && !form.monthly_price)
      newErrors.monthly_price = 'Monthly price is required';
    if (form.config_schema.trim()) {
      try {
        JSON.parse(form.config_schema);
      } catch {
        newErrors.config_schema = 'Must be valid JSON';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!accessToken) {
      setErrors({ submit: 'You must be logged in to publish an agent.' });
      return;
    }

    setLoading(true);
    try {
      const payload: AgentCreatePayload = {
        name: form.name.trim(),
        description: form.description.trim(),
        long_description: form.long_description.trim() || undefined,
        category: form.category,
        version: form.version.trim() || '1.0.0',
        pricing_type: form.pricing_type,
        price_per_use:
          form.pricing_type === 'per_use' ? parseFloat(form.price_per_use) : null,
        monthly_price:
          form.pricing_type === 'subscription' ? parseFloat(form.monthly_price) : null,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        config_schema: form.config_schema.trim()
          ? JSON.parse(form.config_schema)
          : null,
        is_published: form.is_published,
      };
      const agent = await api.agents.create(payload, accessToken);
      router.push(`/agents/${agent.id}`);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to publish agent' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 lg:px-8">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-indigo-400 hover:text-indigo-300">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Publish New Agent</h1>
        <p className="mt-2 text-gray-400">
          Share your AI agent with the AgentBay community
        </p>
      </div>

      {errors.submit && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {errors.submit}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="mb-4 font-semibold">Basic Information</h2>
          <div className="space-y-4">
            <Input
              label="Agent Name *"
              placeholder="e.g. Research Assistant Pro"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              error={errors.name}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Short Description *
              </label>
              <textarea
                placeholder="A brief one-line description of what this agent does"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={2}
                className={`w-full rounded-lg border bg-gray-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.description
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              />
              {errors.description && (
                <p className="mt-1.5 text-xs text-red-400">{errors.description}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Full Description (Markdown)
              </label>
              <textarea
                placeholder="## Overview&#10;&#10;Describe your agent in detail using Markdown..."
                value={form.long_description}
                onChange={(e) => set('long_description', e.target.value)}
                rows={8}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-colors hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Version"
                placeholder="1.0.0"
                value={form.version}
                onChange={(e) => set('version', e.target.value)}
              />
            </div>
            <Input
              label="Tags (comma-separated)"
              placeholder="research, web, automation"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="mb-4 font-semibold">Pricing</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Pricing Type *
              </label>
              <select
                value={form.pricing_type}
                onChange={(e) =>
                  set('pricing_type', e.target.value as FormState['pricing_type'])
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PRICING_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {form.pricing_type === 'per_use' && (
              <Input
                label="Price per Use ($) *"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.05"
                value={form.price_per_use}
                onChange={(e) => set('price_per_use', e.target.value)}
                error={errors.price_per_use}
              />
            )}
            {form.pricing_type === 'subscription' && (
              <Input
                label="Monthly Price ($) *"
                type="number"
                step="0.01"
                min="0"
                placeholder="29.00"
                value={form.monthly_price}
                onChange={(e) => set('monthly_price', e.target.value)}
                error={errors.monthly_price}
              />
            )}
          </div>
        </div>

        {/* Config Schema */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="mb-4 font-semibold">Input Schema (Optional)</h2>
          <p className="mb-3 text-sm text-gray-400">
            Define the JSON schema for agent inputs (what parameters users need to provide).
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Config Schema (JSON)
            </label>
            <textarea
              placeholder={`{\n  "topic": { "type": "string", "description": "Topic to research" }\n}`}
              value={form.config_schema}
              onChange={(e) => set('config_schema', e.target.value)}
              rows={6}
              className={`w-full rounded-lg border bg-gray-900 px-4 py-2.5 font-mono text-sm text-white placeholder-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.config_schema
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            />
            {errors.config_schema && (
              <p className="mt-1.5 text-xs text-red-400">{errors.config_schema}</p>
            )}
          </div>
        </div>

        {/* Publish status */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_published"
            checked={form.is_published}
            onChange={(e) => set('is_published', e.target.checked)}
            className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="is_published" className="text-sm text-gray-300">
            Publish immediately (visible to everyone)
          </label>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} size="lg">
            {loading ? 'Publishing…' : 'Publish Agent'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push('/dashboard')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
