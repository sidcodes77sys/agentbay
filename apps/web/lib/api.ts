const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface AgentAuthor {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

export interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string;
  long_description?: string;
  category: string;
  author: AgentAuthor;
  version: string;
  pricing_type: 'free' | 'per_use' | 'subscription';
  price_per_use?: number;
  monthly_price?: number;
  rating: number;
  total_executions: number;
  is_published: boolean;
  tags: string[];
  config_schema?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgentCreatePayload {
  name: string;
  slug?: string;
  description: string;
  long_description?: string;
  category: string;
  version?: string;
  pricing_type: 'free' | 'per_use' | 'subscription';
  price_per_use?: number | null;
  monthly_price?: number | null;
  is_published?: boolean;
  tags?: string[];
  config_schema?: Record<string, unknown> | null;
}

export interface AgentUpdatePayload {
  name?: string;
  description?: string;
  long_description?: string;
  category?: string;
  version?: string;
  pricing_type?: 'free' | 'per_use' | 'subscription';
  price_per_use?: number | null;
  monthly_price?: number | null;
  is_published?: boolean;
  tags?: string[];
  config_schema?: Record<string, unknown> | null;
}

export interface AgentsListParams {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface AgentsListResponse {
  items: Agent[];
  total: number;
  page: number;
  limit: number;
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit & { accessToken?: string }
): Promise<T> {
  const { accessToken, ...rest } = options ?? {};
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string>),
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  agents: {
    list: (params?: AgentsListParams) => {
      const qs = new URLSearchParams(
        Object.entries(params ?? {}).reduce<Record<string, string>>(
          (acc, [k, v]) => (v !== undefined ? { ...acc, [k]: String(v) } : acc),
          {}
        )
      ).toString();
      return apiFetch<AgentsListResponse>(`/api/agents${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => apiFetch<Agent>(`/api/agents/${id}`),
    getBySlug: (slug: string) => apiFetch<Agent>(`/api/agents/slug/${slug}`),
    me: (accessToken: string) =>
      apiFetch<Agent[]>('/api/agents/me', { accessToken }),
    create: (data: AgentCreatePayload, accessToken: string) =>
      apiFetch<Agent>('/api/agents', {
        method: 'POST',
        body: JSON.stringify(data),
        accessToken,
      }),
    update: (id: string, data: AgentUpdatePayload, accessToken: string) =>
      apiFetch<Agent>(`/api/agents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        accessToken,
      }),
    delete: (id: string, accessToken: string) =>
      apiFetch<void>(`/api/agents/${id}`, { method: 'DELETE', accessToken }),
  },
};
