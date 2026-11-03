import { InboxView } from "@/components/repro/inbox/InboxView";

export function meta() {
  return [{ title: "Reports - Repro" }]; // i18n-ignore meta fallback
}

export default function ReportsIndexRoute() {
  return <InboxView />;
}
