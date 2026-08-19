// Deliberately minimal — the only real page inside this group is /crm,
// which owns its own chrome (sidebar + full-width workspace, see
// components/crm/crm-workspace.tsx). A shared nav here would mean
// coordinating "active view" state between this Server Component and the
// Client Component workspace for no benefit.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
