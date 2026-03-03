import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const MOCK_PUBLISHED_AGENTS = [
  {
    id: '1',
    name: 'ResearchBot Pro',
    category: 'research',
    status: 'published',
    executions: 12400,
    rating: 4.8,
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Developer Dashboard</h1>
          <p className="mt-2 text-gray-400">Manage your published agents and track performance</p>
        </div>
        <Button>+ Publish New Agent</Button>
      </div>

      {/* Stats overview */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Published Agents', value: '1', icon: '🤖' },
          { label: 'Total Executions', value: '12,400', icon: '⚡' },
          { label: 'Total Revenue', value: '$620.00', icon: '💰' },
          { label: 'Avg. Rating', value: '4.8', icon: '⭐' },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-800 bg-gray-900/50 p-6"
          >
            <div className="text-3xl">{icon}</div>
            <div className="mt-3 text-2xl font-bold">{value}</div>
            <div className="text-sm text-gray-400">{label}</div>
          </div>
        ))}
      </div>

      {/* Published agents table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50">
        <div className="border-b border-gray-800 px-6 py-4">
          <h2 className="font-semibold">Published Agents</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {MOCK_PUBLISHED_AGENTS.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <div className="font-medium">{agent.name}</div>
                <div className="mt-1 flex gap-2">
                  <Badge variant="category">{agent.category}</Badge>
                  <Badge variant={agent.status === 'published' ? 'success' : 'default'}>
                    {agent.status}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-8 text-sm text-gray-400">
                <span>⚡ {agent.executions.toLocaleString()} runs</span>
                <span>⭐ {agent.rating}</span>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Getting started (if no agents) */}
      <div className="mt-8 rounded-xl border border-dashed border-gray-700 bg-gray-900/20 p-12 text-center">
        <div className="text-5xl">🚀</div>
        <h3 className="mt-4 text-xl font-semibold">Ready to publish your first agent?</h3>
        <p className="mt-2 text-gray-400">
          Use the AgentBay Python SDK to build and publish agents in minutes.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Button>Get Started</Button>
          <Button variant="outline">View SDK Docs</Button>
        </div>
      </div>
    </div>
  );
}
