import { MetricsView } from "@/components/repro/metrics/MetricsView";

export function meta() {
  return [{ title: "Metrics - Repro" }]; // i18n-ignore meta fallback
}

export default function MetricsRoute() {
  return <MetricsView />;
}
