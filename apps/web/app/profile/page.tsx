'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-400">Loading…</div>
      </div>
    );
  }

  if (!session) return null;

  const user = session.user;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold">Your Profile</h1>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8">
        <div className="flex items-center gap-6">
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt="Avatar"
              className="h-20 w-20 rounded-full border-2 border-gray-700"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-gray-700 bg-indigo-600 text-2xl font-bold text-white">
              {(user?.name ?? 'U')[0].toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold">{user?.name ?? 'User'}</h2>
            <p className="text-sm text-gray-400">{user?.email}</p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <span className="text-sm text-gray-400">Email</span>
            <span className="text-sm">{user?.email ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <span className="text-sm text-gray-400">Display name</span>
            <span className="text-sm">{user?.name ?? '—'}</span>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
