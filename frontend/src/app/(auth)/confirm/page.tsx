'use client';

import { useState, type FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

function ConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirmSignUp } = useAuth();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await confirmSignUp(email, code);
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-center mb-6">Confirm your account</h1>
      <p className="text-center text-gray-600 mb-6 text-sm">
        We sent a verification code to your email. Enter it below to confirm your account.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
          <input id="code" type="text" required value={code} onChange={(e) => setCode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="123456" autoComplete="one-time-code" />
        </div>
        <button type="submit" disabled={isSubmitting}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
          {isSubmitting ? 'Confirming...' : 'Confirm account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        <Link href="/login" className="text-blue-600 hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="text-center">Loading...</div>}>
      <ConfirmForm />
    </Suspense>
  );
}
