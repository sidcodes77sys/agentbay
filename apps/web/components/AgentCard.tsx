import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import type { Agent } from '@/lib/api';

interface AgentCardProps {
  agent: Agent;
}

function formatPrice(agent: Agent) {
  if (agent.pricing_type === 'free') return 'Free';
  if (agent.pricing_type === 'per_use')
    return agent.price_per_use != null ? `$${agent.price_per_use}/run` : 'Per use';
  if (agent.pricing_type === 'subscription')
    return agent.monthly_price != null ? `$${agent.monthly_price}/mo` : 'Subscription';
  return 'Contact';
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const PRICING_BADGE_CLASSES: Record<string, string> = {
  free: 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20',
  per_use: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20',
  subscription: 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20',
};

export function AgentCard({ agent }: AgentCardProps) {
  const pricingClass = PRICING_BADGE_CLASSES[agent.pricing_type] ?? 'bg-gray-800 text-gray-300';

  return (
    <Link href={`/agents/${agent.id}`} className="group block">
      <div className="flex h-full flex-col rounded-xl border border-gray-800 bg-gray-900/50 p-6 transition-all duration-200 hover:border-indigo-500/50 hover:bg-gray-900 hover:shadow-lg hover:shadow-indigo-500/5">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl">
            🤖
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge variant="category">{agent.category.replace('_', ' ')}</Badge>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${pricingClass}`}>
              {formatPrice(agent)}
            </span>
          </div>
        </div>

        {/* Name and description */}
        <h3 className="mb-2 font-semibold text-white transition-colors group-hover:text-indigo-300">
          {agent.name}
        </h3>
        <p className="mb-4 line-clamp-2 flex-1 text-sm text-gray-400">{agent.description}</p>

        {/* Tags */}
        {agent.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {agent.tags.slice(0, 3).map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
            {agent.tags.length > 3 && (
              <Badge>+{agent.tags.length - 3}</Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-800 pt-4 text-sm">
          <div className="flex items-center gap-3 text-gray-400">
            <span title={`Rating: ${agent.rating}`}>
              {'★'.repeat(Math.round(agent.rating))}{'☆'.repeat(5 - Math.round(agent.rating))}
              <span className="ml-1 text-xs">{agent.rating.toFixed(1)}</span>
            </span>
            <span>·</span>
            <span>{formatCount(agent.total_executions)} runs</span>
          </div>
          <span className="text-xs text-gray-500">{agent.author.display_name || agent.author.username}</span>
        </div>
      </div>
    </Link>
  );
}


