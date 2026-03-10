'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { api, type Agent, type Execution } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types derived from JSON config_schema
// ---------------------------------------------------------------------------

interface FieldDef {
  type?: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
}

// ---------------------------------------------------------------------------
// Dynamic field renderer
// ---------------------------------------------------------------------------

function DynamicField({
  name,
  fieldDef,
  value,
  onChange,
  required,
}: {
  name: string;
  fieldDef: FieldDef;
  value: unknown;
  onChange: (val: unknown) => void;
  required: boolean;
}) {
  const label = fieldDef.description || name;
  const inputBase =
    'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

  // Boolean toggle
  if (fieldDef.type === 'boolean') {
    return (
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-300">
          {label}
          {required && <span className="ml-1 text-red-400">*</span>}
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={!!value}
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            value ? 'bg-indigo-600' : 'bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              value ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    );
  }

  // Select / enum
  if (fieldDef.enum && fieldDef.enum.length > 0) {
    return (
      <div>
        <label className="mb-1 block text-sm text-gray-300">
          {label}
          {required && <span className="ml-1 text-red-400">*</span>}
        </label>
        <select
          value={String(value ?? fieldDef.enum[0])}
          onChange={(e) => onChange(e.target.value)}
          className={inputBase}
        >
          {!required && <option value="">— select —</option>}
          {fieldDef.enum.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Number / integer
  if (fieldDef.type === 'number' || fieldDef.type === 'integer') {
    return (
      <div>
        <label className="mb-1 block text-sm text-gray-300">
          {label}
          {required && <span className="ml-1 text-red-400">*</span>}
        </label>
        <input
          type="number"
          value={value === undefined || value === null ? '' : String(value)}
          min={fieldDef.minimum}
          max={fieldDef.maximum}
          step={fieldDef.type === 'integer' ? 1 : 'any'}
          onChange={(e) =>
            onChange(e.target.value === '' ? '' : Number(e.target.value))
          }
          placeholder={`Enter ${label}`}
          className={inputBase}
        />
      </div>
    );
  }

  // Long string (textarea heuristic: description mentions "text" or no max length)
  const isLong =
    (fieldDef.description || '').toLowerCase().includes('text') ||
    (fieldDef.description || '').toLowerCase().includes('content') ||
    (fieldDef.description || '').toLowerCase().includes('prompt');

  if (isLong) {
    return (
      <div>
        <label className="mb-1 block text-sm text-gray-300">
          {label}
          {required && <span className="ml-1 text-red-400">*</span>}
        </label>
        <textarea
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={`Enter ${label}`}
          className={`${inputBase} resize-y`}
        />
      </div>
    );
  }

  // Default: text input
  return (
    <div>
      <label className="mb-1 block text-sm text-gray-300">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      <input
        type="text"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${label}`}
        className={inputBase}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// JSON output viewer
// ---------------------------------------------------------------------------

function JsonViewer({ data }: { data: Record<string, unknown> }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-gray-950 p-4 text-xs leading-relaxed text-green-400">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: Execution['status'] }) {
  const classes: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20',
    running: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 animate-pulse',
    completed: 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20',
    failed: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
  };
  const icons: Record<string, string> = {
    pending: '⏳',
    running: '⚙️',
    completed: '✅',
    failed: '❌',
  };
  return (
    <span
      aria-label={`Status: ${status}`}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${classes[status] ?? classes.pending}`}
    >
      <span aria-hidden="true">{icons[status]}</span> {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main AgentRunPanel component
// ---------------------------------------------------------------------------

export function AgentRunPanel({ agent }: { agent: Agent }) {
  const { data: session } = useSession();
  const router = useRouter();
  const accessToken = (session as { accessToken?: string })?.accessToken;

  const schema = agent.config_schema as
    | {
        properties?: Record<string, FieldDef>;
        required?: string[];
      }
    | undefined;

  const properties = schema?.properties ?? {};
  const requiredFields: string[] = schema?.required ?? [];

  // Initialise form values with defaults from schema
  const initialValues: Record<string, unknown> = {};
  for (const [name, def] of Object.entries(properties)) {
    if (def.default !== undefined) {
      initialValues[name] = def.default;
    } else if (def.type === 'boolean') {
      initialValues[name] = false;
    } else if (def.type === 'number' || def.type === 'integer') {
      initialValues[name] = '';
    } else if (def.enum && def.enum.length > 0) {
      initialValues[name] = def.enum[0];
    } else {
      initialValues[name] = '';
    }
  }

  const [formValues, setFormValues] = useState<Record<string, unknown>>(initialValues);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [runState, setRunState] = useState<'idle' | 'running' | 'done'>('idle');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState('');

  function setField(name: string, val: unknown) {
    setFormValues((prev) => ({ ...prev, [name]: val }));
  }

  function validateForm(): boolean {
    const errors: string[] = [];
    for (const field of requiredFields) {
      const val = formValues[field];
      const fieldType = properties[field]?.type;
      // For boolean fields, any value (including false) is considered provided.
      // For number fields, 0 is a valid value — only empty string means missing.
      const isMissing =
        val === undefined ||
        val === null ||
        (fieldType !== 'boolean' && val === '');
      if (isMissing) {
        const label = (properties[field]?.description || field);
        errors.push(`'${label}' is required`);
      }
    }
    setValidationErrors(errors);
    return errors.length === 0;
  }

  async function handleRun() {
    if (!accessToken) {
      router.push('/login');
      return;
    }

    if (!validateForm()) return;

    setApiError('');
    setExecution(null);
    setRunState('running');

    // Build clean payload — drop empty strings for optional fields
    const payload: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(formValues)) {
      if (val !== '' && val !== undefined) {
        payload[key] = val;
      }
    }

    try {
      const result = await api.executions.run(agent.id, payload, accessToken);
      setExecution(result);
      setRunState('done');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Execution failed');
      setRunState('idle');
    }
  }

  function handleReset() {
    setRunState('idle');
    setExecution(null);
    setApiError('');
    setValidationErrors([]);
  }

  const hasFields = Object.keys(properties).length > 0;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <h2 className="font-semibold">Run Agent</h2>
        {execution && <StatusBadge status={execution.status} />}
      </div>

      <div className="p-6">
        {/* Not logged-in prompt */}
        {!accessToken && (
          <p className="mb-4 text-sm text-gray-400">
            <button
              onClick={() => router.push('/login')}
              className="text-indigo-400 underline hover:text-indigo-300"
            >
              Sign in
            </button>{' '}
            to run this agent.
          </p>
        )}

        {/* Input form */}
        {runState !== 'done' && (
          <>
            {hasFields ? (
              <div className="space-y-4">
                {Object.entries(properties).map(([name, def]) => (
                  <DynamicField
                    key={name}
                    name={name}
                    fieldDef={def}
                    value={formValues[name]}
                    onChange={(val) => setField(name, val)}
                    required={requiredFields.includes(name)}
                  />
                ))}
              </div>
            ) : (
              <p className="mb-4 text-sm text-gray-500">
                This agent requires no input parameters.
              </p>
            )}

            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <ul className="mt-4 space-y-1">
                {validationErrors.map((e) => (
                  <li key={e} className="text-xs text-red-400">
                    ⚠ {e}
                  </li>
                ))}
              </ul>
            )}

            {/* API error */}
            {apiError && (
              <div className="mt-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                {apiError}
              </div>
            )}

            {/* Run button */}
            <Button
              className="mt-6 w-full"
              size="lg"
              onClick={handleRun}
              disabled={runState === 'running' || !accessToken}
            >
              {runState === 'running' ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Running…
                </span>
              ) : (
                '▶ Run Agent'
              )}
            </Button>
          </>
        )}

        {/* Result panel */}
        {runState === 'done' && execution && (
          <div className="space-y-4">
            {/* Duration */}
            {execution.duration_ms != null && (
              <p className="text-xs text-gray-500">
                Completed in {execution.duration_ms} ms
              </p>
            )}

            {execution.status === 'completed' && execution.output_data ? (
              <div>
                <p className="mb-2 text-sm font-medium text-green-400">
                  ✅ Execution successful
                </p>
                <JsonViewer data={execution.output_data} />
              </div>
            ) : (
              <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                <p className="font-medium">❌ Execution failed</p>
                {execution.error_message && (
                  <p className="mt-1 text-xs">{execution.error_message}</p>
                )}
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={handleReset}>
              Run Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
