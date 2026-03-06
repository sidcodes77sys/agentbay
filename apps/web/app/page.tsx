import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { AgentCard } from '@/components/AgentCard';
import { HeroSearch } from '@/components/HeroSearch';
import { api, type Agent } from '@/lib/api';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Discover',
    description: 'Browse hundreds of AI agents across categories. Filter by use case, pricing, and ratings.',
    icon: '🔍',
  },
  {
    step: '02',
    title: 'Compose',
    description: 'Configure and chain agents together using our visual builder or SDK.',
    icon: '⚙️',
  },
  {
    step: '03',
    title: 'Deploy',
    description: 'Run agents via API, schedule them, or embed them directly in your product.',
    icon: '🚀',
  },
];

async function getFeaturedAgents(): Promise<Agent[]> {
  try {
    const result = await api.agents.list({ sort_by: 'top_rated', limit: 3 });
    return result.items;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const featuredAgents = await getFeaturedAgents();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-gray-950 opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-600/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
            <span className="mr-2">✨</span> Now in public beta
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
            The{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              App Store
            </span>
            <br />
            for AI Agents
          </h1>
          <p className="mt-6 text-xl leading-8 text-gray-300">
            Discover, deploy, and publish autonomous AI agents. From research and writing
            to data analysis and automation — find the right agent for every job.
          </p>
          {/* Hero search bar */}
          <div className="mx-auto mt-10 max-w-xl">
            <HeroSearch />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link href="/agents">
              <Button size="lg">Browse Agents</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg">Publish Your Agent</Button>
            </Link>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> 500+ agents
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> No-code execution
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Open SDK
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Pay per use
            </div>
          </div>
        </div>
      </section>

      {/* Featured Agents */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Featured Agents</h2>
              <p className="mt-2 text-gray-400">Top-rated agents trusted by thousands of users</p>
            </div>
            <Link href="/agents" className="text-indigo-400 transition-colors hover:text-indigo-300">
              View all →
            </Link>
          </div>
          {featuredAgents.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-700 py-16 text-center">
              <div className="text-4xl">🤖</div>
              <p className="mt-4 text-gray-400">No agents published yet. Be the first!</p>
              <Link href="/dashboard" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300">
                Publish an agent →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-gray-800 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="mt-4 text-lg text-gray-400">From discovery to deployment in minutes</p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, title, description, icon }) => (
              <div key={step} className="relative rounded-2xl border border-gray-800 bg-gray-900/50 p-8 text-center">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold">
                  {step}
                </div>
                <div className="mb-4 text-5xl">{icon}</div>
                <h3 className="mb-3 text-xl font-semibold">{title}</h3>
                <p className="text-gray-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Developers */}
      <section className="border-t border-gray-800 bg-gradient-to-br from-indigo-950/50 to-purple-950/50 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center rounded-full bg-purple-500/10 px-3 py-1 text-sm text-purple-400 ring-1 ring-purple-500/20">
                For Developers
              </div>
              <h2 className="text-4xl font-bold">Build agents, earn revenue</h2>
              <p className="mt-6 text-lg text-gray-300">
                Publish your AI agents on AgentBay and reach thousands of users. Set your own pricing,
                track usage, and grow a sustainable AI business.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  'Simple Python SDK — extend our base Agent class',
                  'Flexible pricing: free, per-use, or subscription',
                  'Real-time analytics and execution logs',
                  'One-command publish: `agentbay publish`',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex-shrink-0 rounded-full bg-green-500/10 p-1 text-green-400">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M3.707 5.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l6-6a1 1 0 00-1.414-1.414L6.5 7.086 3.707 5.293z" />
                      </svg>
                    </span>
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex gap-4">
                <Link href="/dashboard">
                  <Button size="lg">Start Building</Button>
                </Link>
                <a
                  href="https://github.com/sidcodes77sys/agentbay"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="lg">View SDK →</Button>
                </a>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6 font-mono text-sm">
              <div className="mb-4 flex gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
              <pre className="overflow-x-auto text-gray-300">
                <code>{`from agentbay_sdk import Agent

class ResearchAgent(Agent):
    name = "my-researcher"
    description = "Research any topic"
    category = "research"
    pricing_type = "per_use"
    price_per_use = 0.05

    def execute(self, input_data):
        topic = input_data.get("topic")
        # Your agent logic here
        return {
            "summary": f"Research on {topic}",
            "sources": []
        }

# Publish to AgentBay
# $ agentbay publish`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

