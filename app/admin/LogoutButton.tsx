'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      const { error: logoutError } =
        await supabase.auth.signOut({
          scope: 'local'
        });

      if (logoutError) {
        setError('Unable to sign out. Please try again.');
        return;
      }

      window.location.replace('/admin/login');
    } catch {
      setError('Unable to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        style={{
          background: '#1f2937',
          color: '#ffffff',
          border: '1px solid #4b5563',
          borderRadius: '8px',
          padding: '10px 18px',
          fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? 'Signing out...' : 'Sign Out'}
      </button>

      {error && (
        <p
          role="alert"
          style={{
            color: '#ef4444',
            fontSize: '13px'
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
