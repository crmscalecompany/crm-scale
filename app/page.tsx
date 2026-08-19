import { redirect } from "next/navigation";

// The proxy (proxy.ts) already gates unauthenticated access to every
// non-public path before this ever renders, so by the time we get here the
// user is signed in — just route them to the app.
export default function RootPage() {
  redirect("/crm");
}
