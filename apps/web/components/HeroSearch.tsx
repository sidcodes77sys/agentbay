'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function HeroSearch() {
  const [value, setValue] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(`/agents${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex w-full items-center">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search for an agent…"
        className="w-full rounded-xl border border-gray-600 bg-gray-900/80 py-3 pl-12 pr-32 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <button
        type="submit"
        className="absolute right-2 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        Search
      </button>
    </form>
  );
}
