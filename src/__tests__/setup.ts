/**
 * Vitest / JSDOM global setup
 * Runs before every test file.
 */

import '@testing-library/jest-dom'
import { vi } from 'vitest'

// ─── Mock Next.js router ───────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// ─── Mock Supabase SSR cookies (server-side only, not needed in jsdom) ───
// The actual mocking of supabase clients lives in ./supabase.ts

// ─── Silence console.error noise from expected React warnings ──────────────
const consoleError = console.error.bind(console)
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Ignore React "unexpected" state updates (act() warnings) in tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('act(...)') ||
        args[0].includes('Warning: An update to') ||
        args[0].includes('storage')) ||
      args[0].includes('Supabase')
    ) {
      return
    }
    consoleError(...args)
  }
})
afterAll(() => {
  console.error = consoleError
})

// ─── Reset all mocks between tests ─────────────────────────────────────────
afterEach(() => {
  vi.clearAllMocks()
})
