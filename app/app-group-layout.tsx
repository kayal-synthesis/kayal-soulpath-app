/**
 * app/(app)/layout.tsx
 * =====================
 * Layout for all authenticated app pages:
 * home, conversations, saved, profile, domain sessions.
 *
 * Wraps children in AppShell which provides:
 * - Sidebar navigation (desktop)
 * - Bottom tab bar (mobile)
 * - Floating action button
 * - Synthesis summary in sidebar
 *
 * This layout does NOT apply the mineral dark background —
 * that is handled per-session by ToolShell and useDomainTheme.
 * Non-session pages (home, conversations, saved, profile) use
 * their own backgrounds defined in their page files.
 */

import AppShell from '@/components/shell/AppShell'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
