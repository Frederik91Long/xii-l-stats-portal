'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

      if (loginError) {
        setError('Invalid email or password.');
        return;
      }

      router.replace('/admin');
      router.refresh();
    } catch {
      setError('Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: '460px',
        margin: '70px auto',
        padding: '24px'
      }}
    >
      <section
        style={{
          background: '#111827',
          color: '#ffffff',
          border: '1px solid #374151',
          borderRadius: '16px',
          padding: '32px'
        }}
      >
        <div
          style={{
            color: '#d4af37',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '2px',
            marginBottom: '12px'
          }}
        >
          XII-L COMMISSIONER ACCESS
        </div>

        <h1 style={{ margin: '0 0 12px' }}>
          Admin Center
        </h1>

        <p
          style={{
            color: '#9ca3af',
            marginBottom: '28px'
          }}
        >
          Sign in to manage the official XII-L Stats Portal.
        </p>

        <form onSubmit={handleLogin}>
          <label
            htmlFor="email"
            style={{ display: 'block', marginBottom: '8px' }}
          >
            Email address
          </label>

          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={event => setEmail(event.target.value)}
            required
            disabled={loading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px',
              marginBottom: '20px',
              borderRadius: '8px',
              border: '1px solid #374151',
              background: '#030712',
              color: '#ffffff'
            }}
          />

          <label
            htmlFor="password"
            style={{ display: 'block', marginBottom: '8px' }}
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
            disabled={loading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px',
              marginBottom: '20px',
              borderRadius: '8px',
              border: '1px solid #374151',
              background: '#030712',
              color: '#ffffff'
            }}
          />

          {error && (
            <div
              role="alert"
              style={{
                color: '#fca5a5',
                background: '#450a0a',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: '#d4af37',
              color: '#111827',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p
          style={{
            color: '#9ca3af',
            fontSize: '12px',
            textAlign: 'center',
            marginTop: '24px'
          }}
        >
          Authorized XII-L administrators only.
        </p>
      </section>
    </main>
  );
}
