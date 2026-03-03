import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import type { Agent } from '@/lib/api';

interface AgentCardProps {
  agent: Agent;
}

function formatPrice(agent: Agent) {
  if (agent.pricing_type === 'free') return 'Free';
  if (agent.pricing_type === 'per_use') return `$${agent.price_per_use}/use`;
  if (agent.pricing_type === 'subscription') return `$${agent.monthly_price}/mo`;
  return 'Contact';
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link href={`/agents/${agent.id}`} className="group block">
      <div className="h-full rounded-xl border border-gray-800 bg-gray-900/50 p-6 transition-all duration-200 hover:border-indigo-500/50 hover:bg-gray-900 hover:shadow-lg hover:shadow-indigo-500/5">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl">
            🤖
          </div>
          <Badge variant="category">{agent.category.replace('_', ' ')}</Badge>
        </div>

        {/* Name and description */}
        <h3 className="mb-2 font-semibold text-white group-hover:text-indigo-300 transition-colors">
          {agent.name}
        </h3>
        <p className="mb-4 line-clamp-2 text-sm text-gray-400">{agent.description}</p>

        {/* Tags */}
        {agent.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {agent.tags.slice(0, 3).map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-800 pt-4 text-sm">
          <div className="flex items-center gap-3 text-gray-400">
            <span>⭐ {agent.rating}</span>
            <span>·</span>
            <span>{(agent.total_executions / 1000).toFixed(1)}k runs</span>
          </div>
          <span className="font-semibold text-indigo-400">{formatPrice(agent)}</span>
        </div>
      </div>
    </Link>
  );
}
