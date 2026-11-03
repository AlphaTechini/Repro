import { useParams } from "react-router";

import { ReportView } from "@/components/repro/report/ReportView";

export function meta() {
  return [{ title: "Report - Repro" }]; // i18n-ignore meta fallback
}

export default function ReportRoute() {
  const { id } = useParams();
  if (!id) return null;
  return <ReportView key={id} id={id} />;
}
