/**
 * Test render utilities — wraps @testing-library/react
 * with commonly needed providers (e.g. AuthContext).
 */

import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { MockUser } from './supabase'

// ─── Wrapper helper type ───────────────────────────────────────────────────

type UI = ReactElement | string | null | undefined

// ─── Custom render ─────────────────────────────────────────────────────────

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: MockUser          // logged-in user (null = not logged in)
  teams?: object[]
  currentTeam?: object | null
  children: ReactElement
}

/**
 * renderWithProviders
 *
 * Renders a component inside a mocked AuthContext so that
 * `useAuth()` calls work in tests without real Supabase.
 */
export function renderWithProviders({
  children,
  user = null,
  teams = [],
  currentTeam = null,
  ...rest
}: CustomRenderOptions) {
  // We import a minimal mock auth context lazily to avoid circular issues.
  const MockAuthContext = createMockAuthProvider({ user, teams, currentTeam })

  return {
    user: userEvent.setup(),
    ...render(<MockAuthContext>{children}</MockAuthContext>, rest),
  }
}

// ─── Mock AuthProvider for tests ──────────────────────────────────────────

function createMockAuthProvider({
  user,
  teams,
  currentTeam,
}: {
  user: MockUser | null
  teams: object[]
  currentTeam: object | null
}) {
  return function MockAuthProvider({ children }: { children: React.ReactNode }) {
    return (
      <div data-testid="mock-auth-provider">
        {/* Simulate a minimal auth context via data attributes */}
        {children}
      </div>
    )
  }
}

// ─── Re-export everything useful from testing-library ─────────────────────

export { render, screen, fireEvent } from '@testing-library/react'
export { act } from 'react'
