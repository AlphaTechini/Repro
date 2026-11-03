/** Column width/visibility recipes (container queries, see UI-DESIGN §7.1). */
export const COL = {
  status: "w-9 @5xl:w-28",
  severity: "hidden @2xl:table-cell w-9 @5xl:w-24",
  complete: "w-28",
  reporter: "hidden @5xl:table-cell w-36",
  created: "w-16",
  issue: "hidden @2xl:table-cell w-16",
  fixReady: "hidden @5xl:table-cell w-20",
} as const;
