// NOTE: AuthProvider lives in src/app/layout.tsx only (root layout).
// This layout is intentionally bare — do NOT add AuthProvider here.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
