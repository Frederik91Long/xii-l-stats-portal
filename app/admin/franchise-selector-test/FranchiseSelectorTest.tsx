'use client';

import { useState } from 'react';

import {
  FlaskConical,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';

import AdminFranchiseSelector from '../AdminFranchiseSelector';

import type {
  AdminFranchiseOption
} from '@/lib/admin/franchises';

import {
  CURRENT_SEASON,
  getAvailableSeasons
} from '@/lib/seasons';

export default function FranchiseSelectorTest() {
  const [season, setSeason] =
    useState(CURRENT_SEASON);

  const [selectedFranchise, setSelectedFranchise] =
    useState<AdminFranchiseOption | null>(null);

  const [disabled, setDisabled] =
    useState(false);

  const [resetKey, setResetKey] =
    useState(0);

  const availableSeasons =
    getAvailableSeasons();

  function resetTest() {
    setSeason(CURRENT_SEASON);
    setSelectedFranchise(null);
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
            Franchise Selector Test Environment
          </h2>
        </div>

        <p
          style={{
            color: '#9ca3af',
            fontSize: '14px',
            lineHeight: 1.7
          }}
        >
          Test the official XII-L Franchise
          Registry, franchise search, season
          validation and franchise selection.
          No database records will be created
          or modified.
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 700
            }}
          >
            Test Season

            <select
              value={season}
              onChange={event =>
                setSeason(event.target.value)
              }
              style={{
                background: '#030712',
                color: '#ffffff',
                border: '1px solid #4b5563',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px'
              }}
            >
              {availableSeasons.map(item => (
                <option
                  key={item.year}
                  value={item.year}
                >
                  {item.year} — {item.name}
                </option>
              ))}

              <option value="invalid">
                Invalid Season — Error Test
              </option>
            </select>
          </label>

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

            Disable franchise selector
          </label>

          <button
            type="button"
            onClick={resetTest}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#030712',
              color: '#d4af37',
              border: '1px solid #4b5563',
              borderRadius: '8px',
              padding: '12px 16px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <RotateCcw size={16} />
            Reset Test
          </button>
        </div>
      </section>

      <AdminFranchiseSelector
        key={resetKey}
        season={season}
        value={selectedFranchise}
        onChange={setSelectedFranchise}
        label="Test — Select XII-L Franchise"
        disabled={disabled}
      />

      <section
        style={{
          background: '#111827',
          color: '#ffffff',
          border: '1px solid #374151',
          borderRadius: '14px',
          padding: '24px'
        }}
      >
        <h3
          style={{
            fontSize: '17px',
            marginTop: 0
          }}
        >
          Selected Franchise Data
        </h3>

        {selectedFranchise ? (
          <>
            {selectedFranchise.season === season ? (
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
                Franchise successfully selected
              </div>
            ) : (
              <div
                role="alert"
                style={{
                  color: '#fbbf24',
                  fontSize: '13px',
                  marginBottom: '14px'
                }}
              >
                Stale selection: the selected
                franchise belongs to another
                season. This selection is not
                valid for the active season.
              </div>
            )}

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
                selectedFranchise,
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
            No franchise selected.
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
        The invalid season option is provided
        for error handling tests. Franchise
        selections are temporary and will
        not be saved to Supabase.
      </section>
    </div>
  );
}
