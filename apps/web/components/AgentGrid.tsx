import { AgentCard } from '@/components/AgentCard';
import type { Agent } from '@/lib/api';

interface AgentGridProps {
  agents: Agent[];
}

export function AgentGrid({ agents }: AgentGridProps) {
  if (agents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-700 py-16 text-center">
        <div className="text-4xl">🔍</div>
        <p className="mt-4 text-gray-400">No agents found. Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
