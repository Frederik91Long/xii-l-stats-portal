'use client';

import { useState } from 'react';

import {
  FlaskConical,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';

import AdminPlayerSelector from '../AdminPlayerSelector';

import type {
  AdminPlayerOption
} from '@/lib/admin/players';

const OFFENSIVE_POSITIONS = [
  'QB',
  'RB',
  'WR',
  'TE'
] as const;

export default function PlayerSelectorTest() {
  const [selectedPlayer, setSelectedPlayer] =
    useState<AdminPlayerOption | null>(null);

  const [restrictedPlayer, setRestrictedPlayer] =
    useState<AdminPlayerOption | null>(null);

  const [disabled, setDisabled] =
    useState(false);

  const [resetKey, setResetKey] =
    useState(0);

  function resetTest() {
    setSelectedPlayer(null);
    setRestrictedPlayer(null);
    setDisabled(false);
    setResetKey(previous => previous + 1);
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}
    >
      <section
        style={{
          background: '#111827',
          color: '#ffffff',
          border: '1px solid #374151',
          borderRadius: '14px',
          padding: '24px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <FlaskConical
            size={24}
            color="#d4af37"
          />

          <h2
            style={{
              fontSize: '20px',
              margin: 0
            }}
          >
            Player Selector Test Environment
          </h2>
        </div>

        <p
          style={{
            color: '#9ca3af',
            fontSize: '14px',
            lineHeight: 1.7
          }}
        >
          Test the Sleeper player search,
          position filters and player selection.
          No award records will be created or
          modified in the database.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              checked={disabled}
              onChange={event =>
                setDisabled(event.target.checked)
              }
            />

            Disable player selectors
          </label>

          <button
            type="button"
            onClick={resetTest}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#030712',
              color: '#d4af37',
              border: '1px solid #4b5563',
              borderRadius: '8px',
              padding: '10px 14px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <RotateCcw size={16} />
            Reset Test
          </button>
        </div>
      </section>

      <AdminPlayerSelector
        key={`all-${resetKey}`}
        label="Test 1 — All Player Positions"
        value={selectedPlayer}
        onChange={setSelectedPlayer}
        disabled={disabled}
      />

      <section
        style={{
          background: '#111827',
          color: '#ffffff',
          border: '1px solid #374151',
          borderRadius: '14px',
          padding: '20px'
        }}
      >
        <h3
          style={{
            fontSize: '16px',
            marginTop: 0
          }}
        >
          Selected Player Data
        </h3>

        {selectedPlayer ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#86efac',
                fontSize: '13px',
                marginBottom: '14px'
              }}
            >
              <CheckCircle2 size={18} />
              Player successfully selected
            </div>

            <pre
              style={{
                background: '#030712',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '16px',
                overflowX: 'auto',
                fontSize: '12px',
                lineHeight: 1.7,
                color: '#86efac'
              }}
            >
              {JSON.stringify(
                selectedPlayer,
                null,
                2
              )}
            </pre>
          </>
        ) : (
          <p
            style={{
              color: '#9ca3af',
              fontSize: '13px'
            }}
          >
            No player selected.
          </p>
        )}
      </section>

      <AdminPlayerSelector
        key={`restricted-${resetKey}`}
        label="Test 2 — Offensive Positions Only"
        value={restrictedPlayer}
        onChange={setRestrictedPlayer}
        disabled={disabled}
        allowedPositions={OFFENSIVE_POSITIONS}
      />

      <section
        style={{
          background: '#111827',
          color: '#ffffff',
          border: '1px solid #374151',
          borderRadius: '14px',
          padding: '20px'
        }}
      >
        <h3
          style={{
            fontSize: '16px',
            marginTop: 0
          }}
        >
          Restricted Player Data
        </h3>

        {restrictedPlayer ? (
          <pre
            style={{
              background: '#030712',
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '16px',
              overflowX: 'auto',
              fontSize: '12px',
              lineHeight: 1.7,
              color: '#86efac'
            }}
          >
            {JSON.stringify(
              restrictedPlayer,
              null,
              2
            )}
          </pre>
        ) : (
          <p
            style={{
              color: '#9ca3af',
              fontSize: '13px'
            }}
          >
            No player selected.
          </p>
        )}
      </section>

      <section
        style={{
          background: '#292211',
          color: '#fbbf24',
          border: '1px solid #92400e',
          borderRadius: '12px',
          padding: '18px',
          fontSize: '13px',
          lineHeight: 1.7
        }}
      >
        Development test environment only.
        Player selections are temporary and
        will not be saved to Supabase.
      </section>
    </div>
  );
}
