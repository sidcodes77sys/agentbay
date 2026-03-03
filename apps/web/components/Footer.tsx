import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 px-6 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <span className="text-lg font-bold">
                Agent<span className="text-indigo-400">Bay</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-gray-400">
              The App Store for AI Agents. Discover, deploy, and publish autonomous AI agents.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Platform</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/agents" className="hover:text-white transition-colors">Browse Agents</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* Developers */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Developers</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">SDK Docs</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
              <li>
                <a
                  href="https://github.com/sidcodes77sys/agentbay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Company</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} AgentBay. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
