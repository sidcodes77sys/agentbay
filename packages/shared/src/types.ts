// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'developer' | 'admin';

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// ─── Agent ───────────────────────────────────────────────────────────────────

export type AgentCategory =
  | 'research'
  | 'writing'
  | 'data'
  | 'automation'
  | 'customer_service'
  | 'other';

export type PricingType = 'free' | 'per_use' | 'subscription';

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
  category: AgentCategory;
  author: AgentAuthor;
  version: string;
  pricing_type: PricingType;
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

// ─── Execution ────────────────────────────────────────────────────────────────

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Execution {
  id: string;
  agent_id: string;
  user_id: string;
  input_data: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  status: ExecutionStatus;
  duration_ms?: number;
  created_at: string;
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
