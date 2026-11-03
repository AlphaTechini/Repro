# Repro: UI Design Spec

Build spec for every Repro screen. Implementers: read §0 and §11 before writing
code. Where this spec gives a class recipe, use it exactly; where it is silent,
follow `DESIGN.md`, `.agents/skills/frontend-design/SKILL.md` and
`.agents/skills/shadcn-ui/SKILL.md`.

Already built (presentational, no data): `app/components/repro/ui/*` and the
`/* Repro */` block at the end of `app/global.css`. Import from
`@/components/repro/ui`.

---

## 0. File map and ownership

| Path                                            | What                                                                                                                                                                                            | Status   |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `app/global.css` (`/* Repro */` block)          | tokens, `@theme` mapping, keyframes, 3 utilities                                                                                                                                                | done     |
| `app/components/repro/ui/types.ts`              | `ReportStatus`, `Severity`, `SourceKind`, `Actor`, `FieldSource`, `FieldProvenance`, label maps                                                                                                 | done     |
| `app/components/repro/ui/format.ts`             | `formatClipTime`, `clipSeconds`, `formatDuration`, `formatRelative`                                                                                                                             | done     |
| `app/components/repro/ui/recipes.ts`            | `quietInput`, `missingOutline`, `monoMeta`, `headCell`, `bodyCell`, `sectionLabel`, `panel`                                                                                                     | done     |
| `app/components/repro/ui/StatusPill.tsx`        | `StatusPill`, `StatusGlyph`                                                                                                                                                                     | done     |
| `app/components/repro/ui/SeverityBadge.tsx`     | `SeverityBadge`, `SeverityGlyph`                                                                                                                                                                | done     |
| `app/components/repro/ui/SourceChip.tsx`        | `SourceChip`, `HumanMark`, `ProvenanceMark`                                                                                                                                                     | done     |
| `app/components/repro/ui/CompletenessMeter.tsx` | `CompletenessMeter`                                                                                                                                                                             | done     |
| `app/components/repro/ui/KpiTile.tsx`           | `KpiTile`, `KpiStrip`, `SplitBar`, `QuestionPips`                                                                                                                                               | done     |
| `app/components/repro/ui/EmptyState.tsx`        | `EmptyState`                                                                                                                                                                                    | done     |
| `app/components/repro/ui/FieldShell.tsx`        | `FieldShell`, `MissingMark`, `fieldA11y`, `fieldIds`                                                                                                                                            | done     |
| `app/components/repro/ui/Notice.tsx`            | `Notice`                                                                                                                                                                                        | done     |
| `app/components/repro/inbox/*`                  | `InboxView`, `InboxTable`, `InboxRow`, `InboxSkeleton`, `InboxFilterTabs`, `InboxFirstRun`                                                                                                      | to build |
| `app/components/repro/new-report/*`             | `NewReportDialog`, `ClipLinkField`, `useClipLink` (parse/validate)                                                                                                                              | to build |
| `app/components/repro/report/*`                 | `ReportHeaderTitle`, `ReportHeaderActions`, `FileIssueButton`, `MissingFieldsPopover`, `ReportForm`, `StepsEditor`, `SeverityPicker`, `AgentActivityLine`, `ActivityTimeline`, `ReportSkeleton` | to build |
| `app/components/repro/evidence/*`               | `EvidencePanel`, `ClipPlayer`, `FrameGrid`, `ConsoleList`, `NetworkList`, `TranscriptList`, `EvidenceTimeline` (optional)                                                                       | to build |
| `app/components/repro/metrics/*`                | `MetricsView`, `MetricsTable`                                                                                                                                                                   | to build |
| `app/components/repro/settings/*`               | `GithubSettingsArea`                                                                                                                                                                            | to build |

Local UI shims to add (one line each, same pattern as `app/components/ui/button.tsx`):
`dialog.tsx`, `popover.tsx`, `select.tsx`, `switch.tsx`, `checkbox.tsx`, `tabs.tsx`,
`toggle-group.tsx`, `textarea.tsx`, `kbd.tsx`, `avatar.tsx`, `spinner.tsx`.
Example: `export * from "@agent-native/toolkit/ui/dialog";`. Never import
`@agent-native/toolkit/ui/*` from a page or Repro component directly.

---

## 1. Visual direction: "Evidence Ledger"

A bug report is a set of claims. Repro's job is to show, for every claim, where
it came from. The interface reads like a well-kept ledger: neutral ink, ruled
hairlines, tabular numbers, and a single recurring accent that marks the
agent's citations. Colour is never decoration; it is always a state.

### Principles

1. **Ink first, signal second.** Surfaces, text and controls are the shell's
   neutral tokens. Colour appears only as a glyph, a bar, a tint or a
   hairline that encodes state (status, severity, level, provenance). At most
   one tinted element per table row besides the status glyph.
2. **Every claim cites its source.** An agent-filled field always carries a
   `SourceChip` (`0:07 · transcript`). The chip is the only place the agent
   accent (`--source-agent`, a calm blue) appears at rest. Human values are
   marked in ink ("You"), because human input is the default authority.
3. **The report is the work; evidence is the margin.** The form owns the main
   column. The recording and diagnostics sit beside it like footnotes and are
   reached from the chips.
4. **Density from data, not chrome.** 13px UI body, 44px rows, hairline
   dividers, no cards around tables. Whitespace separates groups; borders
   separate items.
5. **Motion only reports change.** The one expressive animation is the
   agent-fill highlight. Everything else is a 120 to 180 ms colour or
   opacity change.
6. **Calm about gaps.** Missing information is flagged amber and specific
   ("Needs 2+ steps"), never red, never shaking. Red is reserved for errors
   and critical severity.

### Anti-references (do not)

- Gradients, glass, glows, decorative blobs, hero sections, illustrations in
  empty states.
- Sparkle, wand, magic or robot icons for the agent. Use copy ("Agent"),
  `IconMessageCircle` or the blue dot.
- Rainbow badges: filled coloured pills for status or severity. Pills are
  neutral outline with a coloured glyph.
- Rounded cards around every section, drop shadows on page surfaces, KPI
  "cards" with big icons.
- Uppercase tracking-wide eyebrow labels, subtitles under page titles, count
  strips above lists that already show counts.
- A second prompt box on the page. The chat lives in the AgentSidebar.
- Spinners for anything that can be optimistic.

---

## 2. Tokens

All defined in `app/global.css` (`/* Repro */`). Values are full OKLCH
colours, mapped through `@theme inline`, so `bg-status-ready/10`,
`text-sev-critical`, `border-source-agent/25`, `bg-meter-track` all work.

### 2.1 Signal colours (glyphs, bars, tints, borders)

| Token / Tailwind name | Light                  | Dark                    | Used for                                                    |
| --------------------- | ---------------------- | ----------------------- | ----------------------------------------------------------- |
| `status-draft`        | `oklch(0.62 0 0)`      | `oklch(0.6 0 0)`        | Draft glyph                                                 |
| `status-needs-info`   | `oklch(0.665 0.15 64)` | `oklch(0.8 0.14 75)`    | Needs info glyph, missing-field dot, dashed missing outline |
| `status-ready`        | `oklch(0.62 0.15 152)` | `oklch(0.74 0.15 152)`  | Ready glyph, 100% meter                                     |
| `status-filed`        | `oklch(0.56 0.17 292)` | `oklch(0.72 0.14 292)`  | Filed glyph                                                 |
| `status-duplicate`    | `oklch(0.6 0.015 260)` | `oklch(0.62 0.015 260)` | Duplicate glyph                                             |
| `sev-low`             | `oklch(0.66 0 0)`      | `oklch(0.55 0 0)`       | 1 bar                                                       |
| `sev-medium`          | `oklch(0.46 0 0)`      | `oklch(0.78 0 0)`       | 2 bars                                                      |
| `sev-high`            | `oklch(0.64 0.17 48)`  | `oklch(0.76 0.15 52)`   | 3 bars                                                      |
| `sev-critical`        | `oklch(0.56 0.21 27)`  | `oklch(0.7 0.19 25)`    | Alert square                                                |
| `level-error`         | `oklch(0.56 0.21 27)`  | `oklch(0.72 0.17 25)`   | Console error glyph, 5xx status, danger notice              |
| `level-warn`          | `oklch(0.665 0.15 64)` | `oklch(0.8 0.14 75)`    | Console warning glyph, 4xx status                           |
| `level-info`          | `oklch(0.6 0 0)`       | `oklch(0.66 0 0)`       | Console info/log glyph                                      |
| `source-agent`        | `oklch(0.56 0.16 252)` | `oklch(0.74 0.13 252)`  | Agent provenance: chip tint, dot, flash, split bar          |
| `source-human`        | `oklch(0.32 0 0)`      | `oklch(0.88 0 0)`       | Human provenance dot, split bar                             |
| `meter-track`         | `oklch(0.92 0 0)`      | `oklch(0.33 0 0)`       | All bar tracks                                              |
| `meter-fill`          | `oklch(0.36 0 0)`      | `oklch(0.86 0 0)`       | Bar fill below 100%                                         |
| `meter-complete`      | = `status-ready`       | = `status-ready`        | Bar fill at 100%                                            |

Glyph colours are at least 3:1 on `--background` in both themes (checked).

### 2.2 Small-text inks (4.5:1 or better)

Signal colours are not for text. When text must carry a state colour, use:

| Token              | Light                  | Dark                   | Use                            |
| ------------------ | ---------------------- | ---------------------- | ------------------------------ |
| `source-agent-ink` | `oklch(0.5 0.16 252)`  | `oklch(0.78 0.12 252)` | SourceChip text                |
| `needs-info-ink`   | `oklch(0.5 0.11 62)`   | `oklch(0.83 0.13 78)`  | "Needed" label, off-target KPI |
| `error-ink`        | `oklch(0.5 0.19 27)`   | `oklch(0.76 0.16 25)`  | Field errors, HTTP 5xx text    |
| `ready-ink`        | `oklch(0.47 0.12 152)` | `oklch(0.78 0.14 152)` | "Complete", on-target KPI      |

Everything else is `text-foreground` (primary) or `text-muted-foreground`
(secondary). There is no third text grey.

### 2.3 Tint recipes

| Purpose               | Classes                                                                                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent chip            | `bg-source-agent/8 text-source-agent-ink hover:bg-source-agent/15`                                                                                                                                          |
| Agent notice          | `border-source-agent/25 bg-source-agent/6`                                                                                                                                                                  |
| Warning notice        | `border-status-needs-info/35 bg-status-needs-info/8`                                                                                                                                                        |
| Danger notice         | `border-level-error/30 bg-level-error/6`                                                                                                                                                                    |
| Missing field outline | `border-dashed border-input hover:border-status-needs-info/70 focus-visible:border-status-needs-info` (`missingOutline`; text inputs and textareas only, never on Select or the severity segmented control) |
| Cited transcript line | `border-s-2 border-source-agent/60 ps-2`                                                                                                                                                                    |

### 2.4 Shell tokens (unchanged, use as is)

`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-muted`,
`bg-accent`, `border-border`, `border-input`, `ring-ring`, `bg-primary`,
`text-primary-foreground`, `bg-sidebar`, `bg-popover`. Primary buttons stay
the shell's ink `bg-primary`; Repro does not introduce a brand-coloured button.

---

## 3. Typography

Inter Variable (already set on `body` with `cv02 cv03 cv04 cv11`). Mono is
Tailwind's default `font-mono` system stack (SF Mono, Menlo, Consolas). No new
font downloads.

| Role                                                                        | Classes                                                        | Size / leading | Notes                                                       |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------- | ----------------------------------------------------------- |
| Report title (editable)                                                     | `text-xl font-semibold tracking-tight leading-7`               | 20 / 28        | The only large text on the detail page                      |
| Empty-state title                                                           | `text-base font-semibold tracking-tight`                       | 16 / 24        |                                                             |
| KPI value                                                                   | `text-2xl font-semibold tracking-tight tabular-nums leading-7` | 24 / 28        |                                                             |
| Header bar title                                                            | inherits `text-sm font-medium` from `MobileAppBar`             | 14 / 20        | Never add a second page title in the body                   |
| Form value, inputs                                                          | `text-sm`                                                      | 14 / 20        | Inputs are 14px so iOS does not zoom (toolkit `md:text-sm`) |
| UI body (tables, lists, panels, notices)                                    | `text-md`                                                      | **13** / 20    | `text-md` is 13px: smaller than `text-sm`. See §11          |
| Field label, section label                                                  | `text-xs font-medium text-muted-foreground`                    | 12 / 16        | Sentence case. Never uppercase                              |
| Column header, chip, meta                                                   | `text-2xs font-medium text-muted-foreground`                   | 11 / 16        |                                                             |
| Machine text (signatures, console, method/path/status, evidence timestamps) | `font-mono text-2xs` or `font-mono text-xs`                    | 11-12          | Always `tabular-nums`                                       |

Rules:

- All numbers that change or align in columns: `tabular-nums`.
- Weights: 400 body, 500 labels/emphasis, 600 titles/values. Never 700+.
- Tracking: `tracking-tight` only on 16px and above.
- Truncate single-line cells with `truncate`; multi-line evidence with
  `line-clamp-2`. Set `title` (native tooltip) on truncated machine text.
- Issue numbers (`#123`) are sans `tabular-nums`, like GitHub.

---

## 4. Spacing, radius, elevation, layout

### 4.1 Spacing (4px grid)

| Context                                       | Value                                                                                                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Page gutter                                   | `px-4` at every width, content left-aligned (no `mx-auto`), so body text starts on the same x as the header title; the detail back button takes `-ms-2` so its arrow sits on that edge too |
| Page top padding below header                 | `pt-6`                                                                                                                                                                                     |
| Section to section (form groups, page blocks) | `gap-8`                                                                                                                                                                                    |
| Field to field (stacked)                      | `gap-5`                                                                                                                                                                                    |
| Property rows (inline fields)                 | `gap-1` between rows (each row `min-h-9`)                                                                                                                                                  |
| Label row to control                          | `gap-1.5` (built into `FieldShell`)                                                                                                                                                        |
| Table row height                              | `h-11` (44px) single line, `h-13` (52px) title + signature                                                                                                                                 |
| Table cell padding                            | `px-3`                                                                                                                                                                                     |
| Icon to text                                  | `gap-1.5` (14px glyph), `gap-2` (16px icon)                                                                                                                                                |

### 4.2 Radius (theme radii only)

| Element                                         | Class                            |
| ----------------------------------------------- | -------------------------------- |
| Chips, pips, small keys                         | `rounded-sm`                     |
| Inputs, buttons, menus, row focus               | `rounded-md` (primitive default) |
| Panels: table frame, KPI strip, player, notices | `rounded-lg`                     |
| Pills, meters, dots                             | `rounded-full`                   |

Never `rounded-xl` or larger on a page surface.

### 4.3 Elevation

Flat. Page surfaces have no shadow. Structure comes from `border-border`
hairlines and whitespace. Only toolkit overlays (dialog, popover, tooltip,
select, menu) cast shadows, using their built-in styles.

### 4.4 Layout and responsiveness

All Repro pages sit in the shell's `<main>` between the left rail and the
`AgentSidebar` (default 384px, resizable). Available width therefore changes
when the sidebar opens, so **Repro layouts use container queries, not viewport
breakpoints**. Each page's outer element is `@container`. Reference widths:

| Viewport    | Rail  | Agent sidebar | Content width | Repro container band |
| ----------- | ----- | ------------- | ------------- | -------------------- |
| 1728        | 280   | 384           | ~1064         | `@5xl`               |
| 1440        | 280   | 384           | ~776          | `@3xl`               |
| 1440        | 280   | closed        | ~1160         | `@6xl`               |
| 1280        | 280   | 384           | ~616          | `@xl`                |
| 390 (phone) | sheet | sheet         | 390           | `@sm`                |

Viewport breakpoints (`sm:`, `md:`) are only for things tied to the shell
itself (the mobile app bar).

---

## 5. Motion

| Token                 | Value                            | Use                               |
| --------------------- | -------------------------------- | --------------------------------- |
| `--repro-dur-fast`    | 120ms                            | hover/press colour, input border  |
| `--repro-dur-base`    | 180ms                            | meter width, chip pop-in, popover |
| `--repro-dur-flash`   | 1600ms                           | agent-fill highlight              |
| `--repro-ease-out`    | `cubic-bezier(0.23, 1, 0.32, 1)` | entrances, meter                  |
| `--repro-ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | breathing dot                     |

Animate only `opacity`, `transform`, `background-color`, `box-shadow`, and
the meter's `width`. Never animate layout height of rows or fields.

### 5.1 "The agent just filled this"

When the agent writes a field (live, via `useDbSync`), three things happen at
once and nothing else:

1. `FieldShell` re-mounts an overlay with `repro-agent-flash`: tint
   `--agent-flash` (agent blue at 13%, 18% dark) plus a 2px leading bar in
   `--source-agent`, fading to transparent over 1600ms, ease-out. The overlay
   extends 8px left/right and 4px up/down past the field (`-inset-x-2
-inset-y-1 rounded-md`) so the bar sits in the gutter, not on the text.
2. The `SourceChip` mounts with `fresh` → `animate-repro-chip-in` (opacity
   0→1, scale .94→1, 180ms).
3. The value is replaced in one frame. No typewriter effect, no skeleton
   between old and new.

Trigger contract: pass `flashKey` = id (or `at`) of the latest **agent**
`field_set` event for that field. Pass `undefined` until the report has
loaded. Human edits never change `flashKey`. Several fields filled in one
batch each flash; stagger is not needed (they arrive at slightly different
times naturally).

If the user is focused in a field with unsaved typing when an agent write
arrives for it, do **not** replace their text. Keep their draft, skip the
flash, and show a one-line `hint` under the field: "The agent updated this
field. **Use agent's version**" (`Button variant="link" size="xs"`). Clicking
it applies the remote value and plays the flash.

Announce agent writes for screen readers through one `aria-live="polite"`
`sr-only` region per page, debounced 1s and batched: "Agent filled Title,
Steps and Actual."

### 5.2 Other motion

- Agent working dot: `size-1.5 rounded-full bg-source-agent animate-repro-breathe`.
- Completeness meter width: `repro-meter-fill` (180ms). Fill colour switches
  to `meter-complete` at 100%.
- New inbox row arriving live: `animate-in fade-in-0 duration-200` (opacity
  only, tw-animate-css is loaded by the toolkit).
- Dialog/popover/tooltip: toolkit defaults.
- Pressed buttons: toolkit's `active:scale-[0.98]`.

### 5.3 Reduced motion

`prefers-reduced-motion: reduce` is handled in CSS: the flash becomes a static
tint for 1.6s that then clears (information kept, motion removed), the chip
appears without scaling, the breathing dot is static, the meter jumps. Use
`motion-safe:animate-spin` for any spinner. Smooth scrolling (seek → scroll
player into view) must use `behavior: matchMedia("(prefers-reduced-motion:
reduce)").matches ? "auto" : "smooth"`.

---

## 6. Shared components

### 6.1 Built (use, don't restyle)

**`StatusPill`** `{ status: ReportStatus; variant?: "pill" | "plain" | "icon" }`

| Status       | Glyph (tabler)          | Colour                   |
| ------------ | ----------------------- | ------------------------ |
| `draft`      | `IconCircleDashed`      | `text-status-draft`      |
| `needs-info` | `IconProgressHelp`      | `text-status-needs-info` |
| `ready`      | `IconCircleCheck`       | `text-status-ready`      |
| `filed`      | `IconCircleCheckFilled` | `text-status-filed`      |
| `duplicate`  | `IconCopy`              | `text-status-duplicate`  |

- `pill` (detail top bar): `h-6 rounded-full border border-border bg-background ps-1.5 pe-2.5 text-xs font-medium`, glyph 14px, ink label.
- `plain` (inbox ≥ `@5xl`): glyph + `text-md text-muted-foreground` label.
- `icon` (inbox < `@5xl`, metrics): glyph with tooltip, `aria-label="Status: Ready"`.

**`SeverityBadge`** `{ severity: Severity | null | undefined; variant?: "plain" | "icon" }`
Three rising bars (1/2/3 filled) for low/medium/high, `IconAlertSquareFilled`
for critical. Low and medium are ink greys on purpose; only high (orange) and
critical (red) carry hue. Null renders "—" with sr-only "No severity".

**`SourceChip`** `{ source: FieldSource; onSeek?: (atMs) => void; preview?: ReactNode; fresh?: boolean }`
Anatomy: `[0:07][·][transcript]`, `h-5 rounded-sm px-1.5 text-2xs`, mono
timestamp, sans kind. Button when seekable (`onSeek` + `atMs`), static
otherwise. Tooltip shows `preview` (the quoted evidence) or "Play from 0:07".
Preview content recipes:

- transcript: `<p className="text-xs">“{segment.text}”</p>`
- console: `<p className="font-mono text-2xs">{message}</p>`
- network: `<p className="font-mono text-2xs">{method} {path} → {status}</p>`
- frame: `<img className="w-56 rounded-sm" />` from `get-clip-frame` + time

**`HumanMark`** `{ name?: string }`: ink dot + "You" (or the editor's first name).
**Review change:** `ProvenanceMark` hides the viewer's own edits unless `showSelf` is passed ("You" on every field was noise; no agent chip already means a person wrote it). Pass `humanName` for another person's edit, `showSelf` when the viewer overrode an agent value.
**`ProvenanceMark`** `{ provenance; onSeek?; preview?; fresh?; humanName? }`: picks one of the two.

**`CompletenessMeter`** `{ percent; missingCount?; size?: "sm" | "md"; barOnly? }`

- `sm`: `h-1 w-12` bar + `w-8 text-2xs tabular-nums` value. Inbox, metrics.
- `md`: `h-1.5 w-16` bar + "75% · 2 missing" (`text-md`) or "Complete" in `text-ready-ink`. Report top bar.
- Fill is ink until 100%, then green. Never amber or red.
- `role="progressbar"` with `aria-valuetext`.

**`FieldShell`** `{ id; label; provenance?; missing?: boolean | string; error?; hint?; layout?: "stacked" | "inline"; flashKey?; labelAction?; children }`

```
stacked
┌ label (12px muted) ─────────────── [Needed] | [0:07 · transcript] [labelAction] ┐
│ control                                                                         │
└ hint / error (12px)                                                             ┘

inline (property row, 2 or 3 columns by its own container width)
│ Label 7rem │ control ────────────────────────── │ provenance │
```

The control must take `id={id}` and `{...fieldA11y(id, { error, hint: !!hint })}`.
`inline` uses `@lg:` container variants, so the form column must be `@container`.

**`MissingMark`** `{ label?: string }`: amber dot + `text-2xs font-medium text-needs-info-ink`. Default "Needed".

**`Notice`** `{ tone?: "neutral" | "warning" | "danger" | "agent"; title?; children?; actions? }`
Page or section level only. `rounded-lg border px-3 py-2.5 text-md`, 16px
icon, title in ink, body muted, actions right (wrap under on narrow).
`role="alert"` for danger, `status` otherwise.

**`EmptyState`** `{ title; description?; children?; size?: "page" | "panel" }`
`page`: left-aligned, `max-w-lg mx-auto px-6 py-16 sm:py-24`. `panel`:
centred 13px text for empty tabs and filtered lists. No icons, no art.

**`KpiStrip`** + **`KpiTile`** `{ label; value; unit?; target?: { label; met: boolean | null }; footnote?; children?; loading? }`
Strip draws hairlines with `gap-px bg-border` (works across wraps). Tiles are
`bg-background px-4 py-3.5`. **`SplitBar`** `{ agent; human }` and
**`QuestionPips`** `{ count; cap? }` are the only charts.

**Recipes** (`recipes.ts`): `quietInput` (document-style field: chrome on
hover/focus only, `px-2 -mx-2` so text aligns with the label), `missingOutline`,
`monoMeta`, `headCell`, `bodyCell`, `sectionLabel`, `panel`. Always apply with
`cn(...)`, after the primitive's own classes.

### 6.2 To build (anatomy)

**`SeverityPicker`** `{ value: Severity | null; onChange; disabled? }`
Segmented control from `ToggleGroup type="single" variant="outline" size="sm"`:

```tsx
<ToggleGroup
  type="single"
  variant="outline"
  size="sm"
  value={value ?? ""}
  onValueChange={(v) => v && onChange(v as Severity)}
  className="w-fit gap-0 rounded-md border border-input p-0.5"
  aria-label="Severity"
>
  {SEVERITIES.map((s) => (
    <ToggleGroupItem
      key={s}
      value={s}
      className="h-7 gap-1.5 rounded-sm border-0 px-2.5 text-md text-muted-foreground data-[state=on]:bg-accent data-[state=on]:text-foreground"
    >
      <SeverityGlyph severity={s} />
      {SEVERITY_LABEL[s]}
    </ToggleGroupItem>
  ))}
</ToggleGroup>
```

At form container < `@md` show glyph only with `aria-label` per item.

**`StepsEditor`** `{ steps: string[]; onChange; provenance?; missing?; readOnly? }`

```
Steps                                         [0:03 · transcript]  [+ Add step]
  ⋮⋮  1.  Open Settings › Profile                                   ×
  ⋮⋮  2.  Change display name                                       ×
  ⋮⋮  3.  Click Save                                                ×
```

- List: `<ol className="flex flex-col">`; row `group/step relative flex min-h-9 items-center gap-1.5 rounded-md -mx-2 px-2 hover:bg-accent/40 focus-within:bg-accent/40`.
- Handle: `IconGripVertical size-3.5 text-muted-foreground opacity-0 group-hover/step:opacity-100 group-focus-within/step:opacity-100 cursor-grab` inside a `button` with `aria-label="Reorder step 2"`; keyboard: `Alt+↑ / Alt+↓` on the step input moves it. Drag uses pointer events on the handle (no new library needed; HTML5 drag is fine).
- Number: `w-5 shrink-0 text-end font-mono text-xs tabular-nums text-muted-foreground` → `1.`
- Input: `Input` + `cn(quietInput, "h-8 text-sm")`, `aria-label="Step 2"`.
- Remove: `Button variant="ghost" size="icon-xs"` `IconX`, same hover reveal, `aria-label="Remove step 2"`.
- Add: `labelAction` = `Button variant="ghost" size="xs"` `IconPlus` "Add step".
- `Enter` in a step inserts a new step after it and focuses it. `Backspace` in an empty step removes it and focuses the previous one's end.
- Fewer than 2 steps → `missing="Needs 2+ steps"`. Empty list renders two empty rows with placeholders "First step" / "Next step".
- Save on blur and on reorder/remove (optimistic), not per keystroke.

**`AgentActivityLine`** `{ phase: "reading" | "filling" | "asking" | "filing" | null; detail?: string }`
One line above the title, only while the agent is doing something:
`flex h-6 items-center gap-2 text-md text-muted-foreground` + breathing dot.
Copy: §9. Hidden (renders nothing, no reserved space) when `phase` is null.

**`ActivityTimeline`** `{ events: ReportEvent[] }`
Collapsed disclosure at the bottom of the form: trigger `Button variant="ghost" size="sm"` "Activity · 14" with `IconChevronRight` rotating 90° when open.

```
●  Agent read the recording                         2m
●  Agent filled Title, Steps, Actual                2m
◐  Agent asked 2 questions                          2m
○  You set Expected                                 1m
●  Repro bot filed #123                            now
```

- `ol` with a 1px rail: `relative flex flex-col gap-3 ps-5 before:absolute before:start-[5px] before:inset-y-1 before:w-px before:bg-border`.
- Dot: `absolute start-0 top-1.5 size-2.5 rounded-full ring-4 ring-background` + `bg-source-agent` (agent), `bg-source-human/70` (human), `bg-status-draft` (system), `bg-status-filed` (filed).
- Text `text-md`, actor in `font-medium`, time `ms-auto text-2xs tabular-nums text-muted-foreground` with absolute time in `title`.
- Group consecutive `field_set` events by the same actor within 10s into one line.

**`FileIssueButton`**: see §7.3 state table.
**`MissingFieldsPopover`**: see §7.3.

---

## 7. Screens

### 7.0 Shell integration (all screens)

- Add two static links in `app/components/layout/Sidebar.tsx` before
  `ChatThreadsSection`, using the same recipe as `HomeNavLink`:
  "Reports" (`IconInbox`, `/reports`, active for `/reports*`) and "Metrics"
  (`IconChartBar`, `/metrics`). No Settings link (account menu and ⌘, own it).
- Page title and actions go into the shell header with
  `useSetPageTitle(node)` and `useSetHeaderActions(node)` from
  `@agent-native/toolkit/app-shell`. The header is the 48px `MobileAppBar`
  and already ends with `AgentToggleButton`. Do not render a second title
  in the page body.
- The page body is inside `<main>` which scrolls. Each page root:
  `<div className="@container min-h-full">`.

### 7.1 Inbox `/reports`

```
┌ header 48 ───────────────────────────────────────────────────────────────────────────┐
│ Reports 24                                                   [+ New report  C] [chat]│
├──────────────────────────────────────────────────────────────────────────────────────┤
│ [All 24][Needs info 3][Ready 2][Filed 18][Duplicate 1]                               │ h-11
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Status       Title                                  Sev     Complete  Reporter  Created  Issue  Fix-ready │ h-8
│ ◌ Draft      Save does nothing on Profile           ▂▄▆ High ━━━━ 62%  Ana R.   2h   —      —         │
│              TypeError: Cannot read 'id' of undefined                                                 │
│ ✓ Filed      Upload stalls at 99%                    ▂▄  Med  ━━━━━ 100% Sam K.   1d   #123   4m 12s   │
│              POST /api/upload → 504                                                                   │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Header**

- Title node: `<span className="flex items-baseline gap-2">Reports<span className="text-xs font-normal tabular-nums text-muted-foreground">{total}</span></span>`.
- Actions: `Button size="sm"` with `IconPlus` "New report" and a trailing `Kbd` "C" (`hidden @lg:inline-flex`; keys hidden on touch). Opens `NewReportDialog`.

**Filter tabs** (`InboxFilterTabs`)

- Container: `flex h-11 items-center gap-3 border-b border-border px-4 @3xl:px-8`.
- `Tabs value={filter} onValueChange` with `TabsList className="h-8"`; triggers `className="h-6 gap-1.5 px-2.5 text-md"`, count `<span className="text-2xs tabular-nums text-muted-foreground">3</span>`. Zero counts still render (as `0`) so tabs don't shift.
- Values: `all`, `needs-info`, `ready`, `filed`, `duplicate`. `draft` reports appear only under All. Persist the filter in the URL (`?status=needs-info`) so `navigate`/back works and the agent sees it in navigation state.
- Below `@md`, the TabsList scrolls horizontally: wrap in `overflow-x-auto [scrollbar-width:none]`.

**Table** (`InboxTable`)

- Wrapper: `px-4 @3xl:px-8`, then `<table className="w-full table-fixed border-collapse">`. No outer card border; rows separated by `border-b border-border`.
- Header row: `<thead className="sticky top-0 z-10 bg-background">` (sticks under the 48px header since main scrolls), `th` = `headCell` + `border-b border-border`.

| Column    | Header                            | Width / visibility                                         | Cell content                                                                                                                                                                                  |
| --------- | --------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status    | "Status" (sr-only below `@5xl`)   | `w-9` below `@5xl`, `w-28` at `@5xl`                       | `StatusPill variant="icon"` / `"plain"`                                                                                                                                                       |
| Title     | "Title"                           | auto                                                       | line 1: `Link` `truncate text-md font-medium text-foreground`; line 2: `errorSignature` `block truncate font-mono text-2xs text-muted-foreground` (omit line if null; row then `h-11`)        |
| Severity  | "Severity" (sr-only below `@5xl`) | hidden below `@2xl`; `w-9` icon until `@5xl`; `w-24` plain | `SeverityBadge`                                                                                                                                                                               |
| Complete  | "Complete"                        | `w-28`                                                     | `CompletenessMeter size="sm"`                                                                                                                                                                 |
| Reporter  | "Reporter"                        | `hidden @5xl:table-cell w-36`                              | `Avatar` 20px (`size-5`, initials `text-2xs`) + first name + last initial, `truncate text-md text-muted-foreground`                                                                           |
| Created   | "Created"                         | `w-16 text-end`                                            | `formatRelative(createdAt)`, `text-md tabular-nums text-muted-foreground`, `title` = full local datetime                                                                                      |
| Issue     | "Issue"                           | `hidden @2xl:table-cell w-16`                              | filed: `<a href={githubIssueUrl} target="_blank" rel="noreferrer" className="relative z-10 text-md tabular-nums text-foreground hover:underline underline-offset-2">#123</a>`; else `—` muted |
| Fix-ready | "Fix-ready"                       | `hidden @5xl:table-cell w-20 text-end`                     | `formatDuration(filedAt - createdAt)` `text-md tabular-nums`; not filed: `—`                                                                                                                  |

- Row: `<tr className="group h-13 cursor-pointer border-b border-border transition-colors duration-100 hover:bg-accent/50 has-[a:focus-visible]:bg-accent/60">`. First cell adds `group-has-[a[data-row-link]:focus-visible]:repro-row-focus`.
- Row navigation: the title `Link` (`data-row-link`, `className="outline-none"`) is the real anchor (keyboard, cmd-click, middle-click). `tr onClick` navigates too unless the click target is inside `a, button`.
- Keyboard: `↑/↓` and `J/K` move focus between row links; `Enter` opens; `C` opens New report (ignored while typing in an input). Implement on the `tbody` with `onKeyDown`.
- New rows arriving live fade in (`animate-in fade-in-0 duration-200`). Sort: `createdAt` desc.
- Long lists: render all up to 200; beyond that, "Show 200 more" `Button variant="ghost" size="sm"` row. No pagination chrome.

**States**

| State                           | What renders                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading                         | Header renders immediately with title "Reports" (no count). Filter tabs render with counts as `Skeleton h-3 w-3`. `InboxSkeleton`: 8 rows `h-13 border-b`, each: `Skeleton size-3.5 rounded-full`, `Skeleton h-3.5 w-[42%]` + `Skeleton h-2.5 w-[28%] mt-1.5`, `Skeleton h-1 w-12` (meter), `Skeleton h-3 w-8` (created). Show after 150ms only (avoid flash on fast loads). |
| First run (zero reports in org) | `InboxFirstRun` (below). No filter tabs, no table header.                                                                                                                                                                                                                                                                                                                    |
| Filter empty                    | `EmptyState size="panel"` inside the table area: "No reports need info." / "Nothing is ready to file." / "No filed reports yet." / "No duplicates." Description none.                                                                                                                                                                                                        |
| Error                           | `Notice tone="danger" title="Couldn't load reports."` body = server message, actions `Button size="xs" variant="outline"` "Retry". Keep any cached rows visible below.                                                                                                                                                                                                       |

**`InboxFirstRun`** (the empty state is also the onboarding):

```
Turn a recording into a fix-ready issue
Repro reads a Clips recording, fills the bug report, and asks you only what's missing.

1  Record the bug with the Clips Chrome extension. It captures console errors and failed requests.
2  Paste the share link here.
3  Answer up to three questions. Repro files the issue on GitHub.

┌───────────────────────────────────────────────────────┐ ┌──────────────┐
│ 🔗 https://clips.agent-native.com/share/…             │ │Create report │
└───────────────────────────────────────────────────────┘ └──────────────┘
Filing needs GitHub. Connect it in Settings.      ← only when not connected
```

- `EmptyState size="page"` with title/description above.
- Steps: `<ol className="flex flex-col gap-2.5">`, each `flex gap-3 text-md`; numeral `flex size-5 shrink-0 items-center justify-center rounded-full border border-border font-mono text-2xs tabular-nums text-muted-foreground`.
- `ClipLinkField` (shared with the dialog) in `flex gap-2`, input `h-9 flex-1`, button `size="default"`.
- GitHub hint: `text-xs text-muted-foreground` with `Link` to `buildSettingsRoute("app", "github")` (from `@agent-native/core/client/navigation`) styled `text-foreground underline underline-offset-2`.

### 7.2 New report

Two entry points, one component (`ClipLinkField` + `useClipLink`):
the first-run inline field, and `NewReportDialog` (header button, `C`, command
menu item "New report", and pasting a Clips link anywhere on `/reports` when no
input is focused, which opens the dialog prefilled and submits).

```
┌ Dialog, top-aligned ─────────────────────────────────────────┐
│ 🔗  Paste a Clips share link                                 │ h-12
├──────────────────────────────────────────────────────────────┤
│ Clip 8fK2xQ · clips.agent-native.com          ← parsed hint  │
│                                   Esc Cancel   [Create report]│
└──────────────────────────────────────────────────────────────┘
```

- `DialogContent className="top-[18%] translate-y-0 gap-0 p-0 sm:max-w-[34rem]"` (top-aligned like a command bar; the only arbitrary values allowed in this spec). `DialogTitle className="sr-only"` "New report", `DialogDescription className="sr-only"` "Paste a Clips share link to start a report." Hide the default close button if the primitive allows; Esc closes.
- Input row: `flex h-12 items-center gap-2.5 border-b border-border px-4`, `IconLink size-4 text-muted-foreground`, `Input` with `cn(quietInput, "h-12 mx-0 px-0 text-sm hover:border-transparent focus-visible:border-transparent")`, `autoFocus`, `inputMode="url"`, `spellCheck={false}`, `autoComplete="off"`, `aria-label="Clips share link"`.
- Footer: `flex items-center justify-between gap-3 px-4 py-3`. Left: message slot (`text-xs`, min-h-4). Right: `Kbd` "Esc" + `Button variant="ghost" size="sm"` "Cancel", `Button size="sm"` "Create report" (+ `Kbd` "↵" inside, `hidden @sm`).

Validation (client shape check is instant; the server is the authority):

- Accept `https://<host>/share/<id>` (id `[A-Za-z0-9_-]+`, optional query such as `agent_access=`). Trim whitespace; accept a bare `clips.agent-native.com/share/<id>` by prefixing `https://`.
- Valid shape → left slot shows `Clip {id} · {host}` in `monoMeta`.

| State                                                      | Left slot                                                                                                                      | Button                            | Input                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | ---------------------------------------------------------- |
| Empty                                                      | `text-muted-foreground` "Paste a Clips share link. The agent reads it next."                                                   | disabled                          | —                                                          |
| Valid shape                                                | parsed hint                                                                                                                    | enabled                           | —                                                          |
| Wrong shape (on submit, on paste, or on blur with content) | `text-error-ink` "Not a Clips share link. It looks like https://clips.agent-native.com/share/…"                                | enabled (re-validates)            | `aria-invalid`, dialog row gets `bg-level-error/6`         |
| Submitting (within 100ms of submit)                        | "Creating report…" muted                                                                                                       | `Spinner` + "Creating…", disabled | `readOnly`                                                 |
| Private or not found                                       | `text-error-ink` "This clip is private or doesn't exist. In Clips, share it with “Anyone with the link”, then paste it again." | enabled                           | `aria-invalid`, text selected for easy replace             |
| Network / unknown error                                    | `text-error-ink` "Couldn't reach Clips. Check your connection and try again."                                                  | "Try again"                       | —                                                          |
| Success                                                    | —                                                                                                                              | —                                 | close dialog and `navigate(/reports/:id)` in the same tick |

Pasting a valid link submits immediately (one step: paste and go). Typed links
submit on Enter. The detail page opens in its "reading" state; never wait for
`read-clip` before navigating.

### 7.3 Report detail `/reports/:id` (hero)

```
┌ header 48 ──────────────────────────────────────────────────────────────────────────────────────┐
│ ← Reports / Save does nothing on Profile   ◌ Needs info     ━━━━━━── 75% · 2 missing [File issue] [chat]│
├────────────────────────────────────────────────────────────────┬────────────────────────────────┤
│ ● Reading the recording…                                       │ ┌────────────────────────────┐ │
│                                                                │ │                            │ │
│ Title                                     [0:07 · transcript]  │ │      Clip player 16:9      │ │
│ Save does nothing on Profile                                   │ │                            │ │
│                                                                │ └────────────────────────────┘ │
│ Severity    [▂ Low][▂▄ Medium][▂▄▆ High][■ Critical] [You]     │ 0:42 · Open in Clips ↗         │
│ Frequency   [ Every time            ▾]               ● Needed  │ ─|──|─────|──────── timeline   │
│ Environment Chrome 131 · macOS 15.1 · 1440×900  [0:00 · frame] │                                │
│                                                                │ [Console 2][Network 1][Transcript]
│ Summary                                   [0:05 · transcript]  │ 0:07 ⊗ TypeError: Cannot read  │
│ Clicking Save on the Profile page does nothing and logs…       │        properties of undefined │
│                                                                │ 0:09 ⚠ Warning: Each child…    │
│ Steps                               [0:03 · transcript] [+ Add]│                                │
│  1. Open Settings › Profile                                    │                                │
│  2. Change display name                                        │                                │
│  3. Click Save                                                 │                                │
│                                                                │                                │
│ Expected                                             ● Needed  │                                │
│ ┆ What did you expect to happen?                         ┆     │                                │
│                                                                │                                │
│ Actual                                        [0:09 · console] │                                │
│ Nothing happens. Console shows TypeError …                     │                                │
│                                                                │                                │
│ › Activity · 14                                                │                                │
└────────────────────────────────────────────────────────────────┴────────────────────────────────┘
                                                                     (AgentSidebar to the right)
```

**Header title node** (`ReportHeaderTitle`):
`<div className="flex min-w-0 items-center gap-2">`

- Back: `Button variant="ghost" size="icon-sm" asChild` → `Link to="/reports"` with `IconArrowLeft`, `aria-label="Back to reports"`. Below `@lg` header width this is the only breadcrumb.
- Crumb: `<Link className="hidden text-muted-foreground hover:text-foreground lg:inline">Reports</Link><span className="hidden text-muted-foreground/60 lg:inline">/</span>` (viewport `lg` is fine here: the header spans the content frame).
- Title: `<span className="truncate">{title || "Untitled report"}</span>` (muted when untitled).
- `StatusPill variant="pill"` `hidden sm:inline-flex`.

**Header actions** (`ReportHeaderActions`): `flex items-center gap-3`

- Meter: `Popover` trigger = `button` wrapping `CompletenessMeter size="md" missingCount` with `className="rounded-md px-1.5 py-1 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"`; `hidden md:inline-flex`. Below `md`, `CompletenessMeter barOnly`.
- `MissingFieldsPopover`: `PopoverContent align="end" className="w-64 p-1"`. Header line `px-2 py-1.5 text-2xs font-medium text-muted-foreground` "2 required fields missing". Each missing field is a button row `flex h-8 w-full items-center gap-2 rounded-sm px-2 text-md hover:bg-accent` with amber dot + field label; click closes, scrolls the field into view, focuses its control. At 100%: single line "Every required field is filled." with `IconCheck text-status-ready`.
- `FileIssueButton` (below).

**`FileIssueButton` states**

| Condition                                               | Renders                                                                                                                                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub not connected                                    | `Button variant="outline" size="sm" asChild` → Link to `buildSettingsRoute("app","github")`: `IconBrandGithub` "Connect GitHub to file"                                                      |
| Completeness < 100                                      | `Button size="sm" disabled` "File issue" wrapped in `span tabIndex={0}` with Tooltip "Fill 2 more fields to file: Expected, Frequency"                                                       |
| `ready`, auto-file off                                  | `Button size="sm"` `IconBrandGithub` "File issue". Click → immediately enters Filing state (optimistic)                                                                                      |
| Filing (user clicked, or auto-file on and agent filing) | `Button size="sm" disabled` `Spinner` "Filing…"                                                                                                                                              |
| Filed                                                   | `Button variant="outline" size="sm" asChild` → `<a href target="_blank">` `IconBrandGithub` "#123" `IconArrowUpRight size-3 text-muted-foreground`; `aria-label="Open issue #123 on GitHub"` |
| Duplicate                                               | `Button variant="outline" size="sm" asChild` → Link to original: "Open original"                                                                                                             |
| Filing failed                                           | back to "File issue" + danger `Notice` in the body (below)                                                                                                                                   |

**Body layout**

```tsx
<div className="@container min-h-full">
  <div
    className="mx-auto grid w-full max-w-[76rem] grid-cols-1 gap-x-8 gap-y-10 px-4 pb-16 pt-6
                  @3xl:grid-cols-[minmax(0,1fr)_17.5rem] @3xl:px-8
                  @5xl:grid-cols-[minmax(0,1fr)_20rem] @5xl:gap-x-12
                  @6xl:grid-cols-[minmax(0,1fr)_24rem]"
  >
    <section aria-label="Report" className="@container min-w-0 max-w-[44rem]">
      …form…
    </section>
    <aside
      aria-label="Evidence"
      className="min-w-0 @3xl:sticky @3xl:top-6 @3xl:self-start @3xl:max-h-[calc(100dvh-6rem)] @3xl:overflow-y-auto"
    >
      …EvidencePanel…
    </aside>
  </div>
</div>
```

Below `@3xl` it stacks: form, then evidence (the sidebar-open 1280 laptop
case). In stacked mode a seek from a `SourceChip` also scrolls the player into
view (`block: "nearest"`), honouring reduced motion. The chip tooltip preview
means most checks need no scroll at all.

**Form** (`ReportForm`), top to bottom, `flex flex-col gap-8`:

1. Notices slot `flex flex-col gap-2` (zero or more; see states).
2. `AgentActivityLine`.
3. **Title**: `FieldShell id="title" label="Title"`; control `Textarea` (auto-grow, 1 row, `rows={1}`, `resize-none`, Enter blurs instead of newline) with `cn(quietInput, "min-h-0 py-1 text-xl font-semibold leading-7 tracking-tight")`, placeholder "Short, specific title".
4. **Properties** group: `<div className="flex flex-col gap-1">` of `FieldShell layout="inline"`:
   - Severity: `SeverityPicker`.
   - Frequency: `Select` with `SelectTrigger className="h-8 w-48 text-sm"`. Options (value → label): `always` "Every time", `often` "Most times", `sometimes` "Sometimes", `once` "Happened once". Placeholder "How often?".
   - Environment: `Input` `cn(quietInput, "h-8 text-sm")`, placeholder "Browser, OS, screen, URL".
5. **Narrative** group: `flex flex-col gap-6` of stacked `FieldShell`s, each control an auto-grow `Textarea` `cn(quietInput, "min-h-[4.5rem] py-1.5 text-sm leading-6")` (one documented arbitrary value):
   - Summary, placeholder "One or two sentences on what goes wrong".
   - Steps → `StepsEditor`.
   - Expected, placeholder "What did you expect to happen?"
   - Actual, placeholder "What happened instead?"
6. `ActivityTimeline` (collapsed).

Field mark logic per field:

- Empty and required, and the clip has been read → `missing` (`cn(quietInput, missingOutline)` on the control, so the dashed outline shows at rest).
- Empty while the clip is still being read and the agent can fill it (title, summary, steps, actual, environment) → render a `Skeleton h-4 w-2/3` (title `h-6 w-1/2`) in place of the placeholder, `aria-busy="true"` on the FieldShell. Human-only fields (expected, frequency) render normally and are not flagged until reading ends.
- Filled by agent → `ProvenanceMark` with `SourceChip` (`onSeek` seeks the player, `preview` per §6.1).
- Filled or edited by a human → nothing for the viewer's own edits; `HumanMark` with `name` for another person; `showSelf` when the viewer replaced an agent value.
- Required fields come from settings (`requiredFields`); non-required fields never show "Needed".

Saving (100ms rule): text fields commit on blur and on `⌘↵`/`Ctrl↵`, selects
and severity on change. Local state updates instantly; the meter and missing
marks recompute locally from the new value before the action returns; on
failure, revert the field and show `toast.error("Couldn't save Expected. Your
change was undone.")`. No "Saved" toasts; a quiet "Saving…" is not shown
either unless the request exceeds 400ms (then `text-2xs text-muted-foreground`
"Saving…" next to the field mark).

Read-only states (filed, duplicate): controls get `readOnly`/`disabled`, quiet
styling stays, hover borders off (`hover:border-transparent`), steps lose
handles and remove buttons.

**Detail states**

| State                          | Notice / behaviour                                                                                                                                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Route loading                  | `ReportSkeleton`: header title `Skeleton h-4 w-48`; form: title `h-6 w-2/3`, 3 property rows (`h-3 w-16` label + `h-8 w-48`), 3 text blocks (`h-3 w-20` + `h-16 w-full`); evidence: `aspect-video w-full rounded-lg` skeleton + 4 `h-4` lines.                                             |
| Reading clip                   | `AgentActivityLine phase="reading"`; skeleton placeholders in agent-fillable fields.                                                                                                                                                                                                       |
| Transcript pending/unavailable | no form notice; handled in the Transcript tab.                                                                                                                                                                                                                                             |
| Clip read failed               | `Notice tone="danger" title="Couldn't read this recording."` body: message from `read-clip`; actions: `Button size="xs" variant="outline"` "Retry" (calls `read-clip`), `Button size="xs" variant="ghost"` "Open in Clips".                                                                |
| Agent asked questions          | `AgentActivityLine phase="asking"` "Waiting for your answers in chat" + `Button variant="link" size="xs"` "Open chat" when the sidebar is closed (open it via the toolkit sidebar API). Questions themselves stay in chat.                                                                 |
| Possible duplicate             | `Notice tone="warning" title="Possible duplicate of #118"` body: `“Save button does nothing on Settings” · same TypeError`; actions: `Button size="xs" variant="outline"` "Add to existing", `Button size="xs" variant="ghost"` "File as new". Both call actions directly (deterministic). |
| Filing failed                  | `Notice tone="danger" title="GitHub didn't accept the issue."` body: error; actions "Retry". If the cause is permissions: "The Repro app can't write issues in acme/web. Check its access on GitHub." + "Open GitHub" link.                                                                |
| Filed                          | `Notice tone="neutral"`: "Filed as #123 by the Repro bot. Edits here don't update the GitHub issue." action `Button size="xs" variant="outline"` "View on GitHub". Form read-only.                                                                                                         |
| Duplicate                      | `Notice tone="neutral"`: "Merged into “Save button does nothing on Settings”. Its evidence now includes this recording." action "Open original". Form read-only.                                                                                                                           |
| Not found / no access          | `EmptyState title="Report not found" description="It may have been deleted, or you don't have access."` + `Button variant="outline" size="sm" asChild` "Back to reports".                                                                                                                  |

**Evidence panel** (`EvidencePanel`), `flex flex-col gap-4`:

1. `ClipPlayer` `{ recordingId; origin; seekMs; onUnavailable }`
   - Frame: `relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black`.
   - `<iframe src={`${origin}/embed/${recordingId}?t=${clipSeconds(seekMs)}`} title="Recording" allow="autoplay; fullscreen; picture-in-picture" className="absolute inset-0 size-full" />`. Seeking re-keys the iframe with the new `t` (debounce 150ms). Default `t` = first console issue or failed request, else 0.
   - Fallback (iframe errors, or no `load` within 6s, or user clicks "Show frames"): `FrameGrid`: `grid grid-cols-2 gap-1.5`, each `button` `relative aspect-video overflow-hidden rounded-md border border-border bg-muted` with `img object-cover` from `get-clip-frame`, time badge `absolute bottom-1 start-1 rounded-sm bg-black/70 px-1 font-mono text-2xs text-white tabular-nums`. Click selects that frame larger (spans 2 columns).
   - Meta row under the frame: `flex items-center justify-between text-2xs text-muted-foreground`: left `font-mono tabular-nums` duration "0:42"; right `a` "Open in Clips" `IconArrowUpRight size-3` to share URL with `?at=`.
2. `EvidenceTimeline` (optional, nice): `relative h-5` track `absolute inset-x-0 top-1/2 h-px bg-border`; ticks `absolute top-1 h-3 w-0.5 rounded-full` at `atMs/durationMs`: `bg-level-error` (console error), `bg-level-warn` (failed request 4xx/warn), `bg-source-agent` (cited transcript moments). Each tick is a button (`aria-label="Console error at 0:07"`, hit area `before:absolute before:-inset-x-1.5 before:-inset-y-1`).
3. Tabs `Tabs defaultValue={consoleCount ? "console" : "transcript"}`; `TabsList className="h-8 w-full"`, triggers `className="h-6 flex-1 gap-1.5 text-md"` with counts like the inbox filter. Content `className="mt-3"`.

   **Console** (`ConsoleList`): `<ul className="flex flex-col">`; row `button` `grid w-full grid-cols-[2.5rem_1rem_minmax(0,1fr)] items-start gap-x-2 rounded-md px-1.5 py-1.5 text-start hover:bg-accent/50`:
   - time `font-mono text-2xs tabular-nums text-muted-foreground pt-px` (click seeks),
   - level glyph `size-3.5 mt-0.5`: `IconCircleX text-level-error`, `IconAlertTriangle text-level-warn`, `IconInfoCircle text-level-info`,
   - message `font-mono text-xs text-foreground line-clamp-2 break-words`; expanded (click row) shows full text + stack in `pre` `mt-1.5 max-h-48 overflow-auto rounded-sm bg-muted/60 p-2 font-mono text-2xs text-muted-foreground whitespace-pre-wrap`.
   - Entries cited by a field get a trailing `text-2xs text-source-agent-ink` "cited" label under the message (`col-start-3`).

   **Network** (`NetworkList`): row grid `grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-x-2 px-1.5 py-1.5`:
   - time as above,
   - `<span className="truncate font-mono text-xs"><span className="font-medium text-foreground">POST</span> <span className="text-muted-foreground">/api/profile</span></span>` (full URL in `title`; strip origin when it matches the app under test),
   - status `font-mono text-xs tabular-nums` `text-error-ink` for 5xx and network failures ("failed"), `text-needs-info-ink` for 4xx; duration below status `text-2xs text-muted-foreground` "1.2s".

   **Transcript** (`TranscriptList`): `<ol className="flex flex-col gap-0.5">`; row `button` `grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2 rounded-md px-1.5 py-1 text-start hover:bg-accent/50`: time + `text-md text-foreground leading-5`. Segments cited by a field: `border-s-2 border-source-agent/60` on the text cell with `ps-2`. The segment last seeked to: `bg-accent/60`.
   - `transcriptStatus` pending: `EmptyState size="panel" title="Transcript is still processing" description="Clips is transcribing this recording. The agent is working from frames and diagnostics meanwhile."`
   - unavailable/failed: `title="No transcript for this recording" description="The agent is using frames and diagnostics instead."`

   Empty console/network: `EmptyState size="panel" title="No console issues captured" description="Diagnostics are recorded only when the clip is made with the Clips Chrome extension."` (Network: "No failed requests captured").

**Coexisting with the AgentSidebar**

- Creating a report from the UI starts the agent with `sendToAgentChat({ ..., openSidebar: true })` in the report's own thread, so the sidebar opens beside the form and the user watches the form fill while the chat narrates.
- The page never draws its own chat, prompt box or "Ask AI" button. The header's `AgentToggleButton` is the only toggle.
- The sidebar has its own surface and divider (toolkit); the page keeps `bg-background`. Do not add a border on the page's right edge.
- Container queries (above) reflow the page when the sidebar opens or resizes; no JS width checks.
- Expose `navigation` = `{ view: "report", reportId }` and make `view-screen` return the visible field values, missing list and the evidence tab in view, so the agent knows what the user sees.

### 7.4 Metrics `/metrics`

```
┌ header ─ Metrics ─────────────────────────────────────────────── [Export JSON] [chat] ┐
│ ┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐         │
│ │Median time to    │Follow-up qs  ✓≤3 │Agent-filled      │Complete at   ✓100%│        │
│ │fix-ready         │1.7  per report   │78%               │filing             │        │
│ │4m 12s            │▮▮▯               │████████████──    │100%               │        │
│ │across 12 filed   │                  │94 agent · 26 you │12 of 12 reports   │        │
│ └──────────────────┴──────────────────┴──────────────────┴──────────────────┘         │
│                                                                                       │
│ Reports                                                                               │
│ Report                      Status  Fix-ready  Questions  Agent · Human   Complete  Filed │
│ Save does nothing on Prof…   ✓      4m 12s     ▮▮▯ 2      ███── 7 · 2     100%      Nov 2 │
│ …                                                                                     │
│ Median / average             12     4m 12s     1.7        78%             100%            │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

- Root `@container`, inner `mx-auto flex w-full max-w-[76rem] flex-col gap-10 px-4 pb-16 pt-6 @3xl:px-8`.
- Header actions: `Button variant="outline" size="sm"` `IconDownload` "Export JSON" → `export-metrics`; on success `toast.success("Exported to evidence/metrics.json")` (the result is off-screen, so a toast is right).
- `KpiStrip` with four `KpiTile`s:

| Tile | label                      | value                    | target                                | viz                               | footnote                           |
| ---- | -------------------------- | ------------------------ | ------------------------------------- | --------------------------------- | ---------------------------------- |
| 1    | "Median time to fix-ready" | `formatDuration(median)` | none                                  | none                              | "across {n} filed reports"         |
| 2    | "Follow-up questions"      | avg with 1 decimal       | `{ label: "≤ 3", met: avg <= 3 }`     | `QuestionPips count={round(avg)}` | "per report" via `unit`            |
| 3    | "Agent-filled fields"      | `{pct}%`                 | none                                  | `SplitBar agent human`            | "{a} agent · {h} edited by people" |
| 4    | "Complete at filing"       | `{pct}%`                 | `{ label: "100%", met: pct === 100 }` | none                              | "{x} of {n} reports"               |

- Section label "Reports" (`sectionLabel` + `mb-3`), then the same table recipe as the inbox (no row hover navigation surprises: rows link to the report).

| Column        | Width / visibility                    | Content                                                                             |
| ------------- | ------------------------------------- | ----------------------------------------------------------------------------------- |
| Report        | auto                                  | title `truncate text-md font-medium` (Link)                                         |
| Status        | `w-9`                                 | `StatusPill variant="icon"`                                                         |
| Fix-ready     | `w-24 text-end`                       | duration or `—`                                                                     |
| Questions     | `w-24`                                | `QuestionPips` + `text-2xs tabular-nums` count                                      |
| Agent · Human | `hidden @2xl:table-cell w-36`         | `SplitBar className="w-16"` + `text-2xs tabular-nums text-muted-foreground` "7 · 2" |
| Complete      | `w-24`                                | `CompletenessMeter size="sm" percent={completenessAtFiling}`                        |
| Filed         | `hidden @xl:table-cell w-20 text-end` | `formatRelative(filedAt)`                                                           |

- `tfoot` row `h-11 border-t border-border text-md font-medium`: "Median / average", totals per column.
- Sortable headers: `button` inside `th` with `IconArrowUp/IconArrowDown size-3` when active; `aria-sort` on `th`.
- States: loading → `KpiTile loading` ×4 + 6 skeleton rows. Empty (no filed reports) → tiles show `—` with `target.met: null`, and the table area is `EmptyState size="panel" title="Metrics start with the first filed report" description="Every report filed from the Inbox adds a row here."` with `Button variant="outline" size="sm" asChild` "Open reports". Error → danger `Notice` + Retry.

### 7.5 Settings → GitHub

Register as an app area on the settings route: `appAreas={[{ id: "github",
label: "GitHub", content: <GithubSettingsArea />, keywords: "github repo
repository issues auto-file required fields", searchEntries: [...] }]}` →
`/settings/app/github`. Build with `SettingsGroup` and `SettingsRow` from
`@agent-native/toolkit/app/settings` so it matches every other settings page.
Give every row an `id` (`github-connect`, `github-repo`, `github-autofile`,
`github-required`) and a search entry with that `hash`.

**Disconnected**

```
GitHub
┌───────────────────────────────────────────────────────────────────────┐
│ [gh] Connect GitHub                                  [Connect GitHub] │
│      Repro files issues as its own bot, only in repositories you      │
│      choose. It needs Issues: read and write. Nothing else.           │
├───────────────────────────────────────────────────────────────────────┤
│ Filing needs                                                          │
│  ○ Install the Repro app on a GitHub account                          │
│  ○ Choose the repository issues go to                                 │
│  ✓ Required fields set (8)                                            │
└───────────────────────────────────────────────────────────────────────┘
```

- `SettingsGroup title="GitHub"` (no description).
- Row `github-connect`: `icon={<IconBrandGithub className="size-4" />}` label "Connect GitHub", description as above, control `Button size="sm"` "Connect GitHub" → opens the install URL (`window.location.assign`, it returns via `/github/setup`). On click: button shows `Spinner` "Opening GitHub…" immediately.
- Row "Filing needs" as `children`: `ul flex flex-col gap-1.5 text-md`, items with `IconCircleDashed size-3.5 text-status-draft` (todo) or `IconCircleCheck size-3.5 text-status-ready` (done).
- Repo, auto-file and required fields rows are hidden until connected (one decision at a time). Required fields stay editable when disconnected (they also drive completeness), so show that row in both states.

**Connected**

```
GitHub
│ (A) acme-inc                    ● Connected          [Manage on GitHub ↗] │
│ Repository                       [ acme-inc/web-app                   ▾ ] │
│ Auto-file                        Files as soon as every required…   [◉]  │
│ Required fields                  ☑ Title  ☑ Steps (2+)  ☑ Expected …      │
```

- Account row: icon = `Avatar size-5` of the GitHub account; label = login; `status={<span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-status-ready" />Connected</span>}`; control `Button variant="outline" size="sm" asChild` → installation settings URL, "Manage on GitHub" `IconArrowUpRight`. Disconnecting happens on GitHub; no destructive button here.
- Repository row: description "Issues are filed here."; control `Select` `SelectTrigger className="h-8 w-64"`, items `font-mono text-xs` "owner/name". States: loading → trigger disabled with `Spinner` and "Loading repositories…"; empty → description becomes "The Repro app can't see any repositories. Add one on GitHub." with link; error → `text-error-ink` "Couldn't load repositories." + `Button variant="link" size="xs"` "Retry". No repo chosen → amber `MissingMark label="Choose a repository"` in `status`.
- Auto-file row: label "Auto-file", description "File the issue as soon as every required field is filled. Turn off to have a maintainer review and click File.", control `Switch` (default on). Optimistic toggle; failure reverts + `toast.error("Couldn't change auto-file.")`.
- Required fields row (`github-required`): label "Required fields", description "Repro won't file until these are filled. The agent asks for what's missing." children: `grid grid-cols-1 gap-2 @md:grid-cols-2` of `Checkbox` + `Label text-md`: Title, Steps (2 or more), Expected, Actual, Frequency, Severity, Environment, Recording timestamp. Title is checked and `disabled` with tooltip "Every issue needs a title." Changes save on toggle (optimistic).
- `update-settings` needs approval when the agent calls it; the UI calls it directly.

---

## 8. Feedback, toasts, errors

- **100ms rule.** Every click/keypress changes something on screen within
  100ms: pressed state, optimistic value, `Spinner` inside the button, or
  route change. Network work starts after the acknowledgement. Anything that
  may exceed 400ms shows a focused pending state (button spinner, "Saving…"
  next to the field), never a page-level spinner.
- **Optimistic by default** for field edits, severity, frequency, settings
  toggles, repo choice, step reorder. Roll back and toast on failure.
- **Not optimistic**: creating a report (needs the server's id and validation;
  show "Creating…" within 100ms) and filing (show "Filing…"; the issue number
  must come from the action result, never invented).
- **Toasts** (`import { toast } from "sonner"`): only for outcomes that are
  off-screen or failures of optimistic actions.
  - `toast.success("Issue #123 filed", { action: { label: "View", onClick } })` only when filing completes while the user is not on that report.
  - `toast.error("Couldn't save {Field}. Your change was undone.")`
  - `toast.success("Exported to evidence/metrics.json")`
  - Never toast "Saved", "Report created", or anything already visible.
- **Errors in place.** Field validation under the field (`error-ink`), section
  failures as `Notice`, route failures as `EmptyState` or the toolkit
  ErrorBoundary. Never `alert/confirm/prompt`.

---

## 9. Microcopy

Voice: plain, specific, short. Sentence case everywhere. No exclamation marks,
no "Oops", no "AI". The agent is "the agent"; the GitHub identity is "the
Repro bot".

| Where                  | Copy                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nav                    | Reports · Metrics                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Inbox header           | Reports {n} · New report                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Filters                | All · Needs info · Ready · Filed · Duplicate                                                                                                                                                                                                                                                                                                                                                                                                         |
| Columns                | Status · Title · Severity · Complete · Reporter · Created · Issue · Fix-ready                                                                                                                                                                                                                                                                                                                                                                        |
| First run title        | Turn a recording into a fix-ready issue                                                                                                                                                                                                                                                                                                                                                                                                              |
| First run description  | Repro reads a Clips recording, fills the bug report, and asks you only what's missing.                                                                                                                                                                                                                                                                                                                                                               |
| First run steps        | Record the bug with the Clips Chrome extension. It captures console errors and failed requests. / Paste the share link here. / Answer up to three questions. Repro files the issue on GitHub.                                                                                                                                                                                                                                                        |
| GitHub hint            | Filing needs GitHub. Connect it in Settings.                                                                                                                                                                                                                                                                                                                                                                                                         |
| Link field placeholder | Paste a Clips share link                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Link hint              | Paste a Clips share link. The agent reads it next.                                                                                                                                                                                                                                                                                                                                                                                                   |
| Wrong link             | Not a Clips share link. It looks like https://clips.agent-native.com/share/…                                                                                                                                                                                                                                                                                                                                                                         |
| Private/missing clip   | This clip is private or doesn't exist. In Clips, share it with “Anyone with the link”, then paste it again.                                                                                                                                                                                                                                                                                                                                          |
| Network error          | Couldn't reach Clips. Check your connection and try again.                                                                                                                                                                                                                                                                                                                                                                                           |
| Buttons                | Create report · Creating… · File issue · Filing… · #123 · Connect GitHub to file · Open original · Add to existing · File as new · Retry · Open in Clips                                                                                                                                                                                                                                                                                             |
| Agent line             | Reading the recording… · Found {n} console errors and {m} failed requests · Filling the report… · Waiting for your answers in chat · Filing the issue…                                                                                                                                                                                                                                                                                               |
| Missing mark           | Needed · Needs 2+ steps                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Missing popover        | {n} required fields missing · Every required field is filled.                                                                                                                                                                                                                                                                                                                                                                                        |
| Disabled File tooltip  | Fill {n} more fields to file: {list}                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Placeholders           | Short, specific title · One or two sentences on what goes wrong · First step / Next step · What did you expect to happen? · What happened instead? · Browser, OS, screen, URL · How often?                                                                                                                                                                                                                                                           |
| Frequency              | Every time · Most times · Sometimes · Happened once                                                                                                                                                                                                                                                                                                                                                                                                  |
| Provenance             | {m:ss} · transcript / console / network / frame · You · {First name}                                                                                                                                                                                                                                                                                                                                                                                 |
| Chip aria              | Filled by the agent from the {kind} at {m:ss}. Play from here                                                                                                                                                                                                                                                                                                                                                                                        |
| Agent-update conflict  | The agent updated this field. Use agent's version                                                                                                                                                                                                                                                                                                                                                                                                    |
| Filed notice           | Filed as #{n} by the Repro bot. Edits here don't update the GitHub issue.                                                                                                                                                                                                                                                                                                                                                                            |
| Duplicate notice       | Possible duplicate of #{n} · Merged into “{title}”. Its evidence now includes this recording.                                                                                                                                                                                                                                                                                                                                                        |
| Transcript pending     | Transcript is still processing · Clips is transcribing this recording. The agent is working from frames and diagnostics meanwhile.                                                                                                                                                                                                                                                                                                                   |
| No diagnostics         | No console issues captured · No failed requests captured · Diagnostics are recorded only when the clip is made with the Clips Chrome extension.                                                                                                                                                                                                                                                                                                      |
| Metrics tiles          | Median time to fix-ready · Follow-up questions · Agent-filled fields · Complete at filing · Target ≤ 3 · Target 100%                                                                                                                                                                                                                                                                                                                                 |
| Metrics empty          | Metrics start with the first filed report · Every report filed from the Inbox adds a row here.                                                                                                                                                                                                                                                                                                                                                       |
| Settings               | Connect GitHub · Repro files issues as its own bot, only in repositories you choose. It needs Issues: read and write. Nothing else. · Filing needs · Repository · Issues are filed here. · Auto-file · File the issue as soon as every required field is filled. Turn off to have a maintainer review and click File. · Required fields · Repro won't file until these are filled. The agent asks for what's missing. · Manage on GitHub · Connected |

---

## 10. Accessibility and keyboard

- Every icon-only control has `aria-label`; glyph-only status/severity use
  `role="img"` + label (built in).
- Focus is always visible: toolkit `focus-visible:ring-2 ring-ring` on
  controls; inbox rows use `repro-row-focus` + `bg-accent/60`.
- Colour is never the only signal: status has distinct glyph shapes, severity
  has bar counts, missing fields have the "Needed" word, HTTP status shows
  the number.
- Shortcuts (ignored while typing in inputs): `C` new report (Inbox),
  `↑/↓` `J/K` row focus, `Enter` open, `Esc` close dialog/popover, `⌘↵`
  commit a text field, `Alt+↑/↓` move a step. Show keys with `Kbd` only on
  pointer devices.
- Live updates: one polite live region per page (§5.1). The completeness meter
  is a `progressbar` with `aria-valuetext`.
- Hit targets ≥ 24px (chips are 20px tall; give seekable chips
  `before:absolute before:-inset-y-0.5` hit expansion if they sit in tight rows).
- Contrast: tokens in §2 meet 3:1 (glyphs) and 4.5:1 (inks) in both themes.

---

## 11. Implementation gotchas (must not get wrong)

1. **`text-md` is 13px**, smaller than `text-sm` (14px). The name is a t-shirt
   size on purpose: `cn()` is plain `tailwind-merge`, which treats unknown
   `text-*` names as colours. A class like `text-ui` would be silently dropped
   next to `text-muted-foreground`. Do not add new `text-*` sizes with
   non-t-shirt names.
2. **Signal colours are not text colours.** `text-status-*`, `text-sev-*`,
   `text-level-*`, `text-source-agent` are for glyphs only. Text uses ink or
   the four `*-ink` tokens.
3. **`exactOptionalPropertyTypes` is on.** Optional props must be typed
   `prop?: T | undefined` if callers may pass `undefined` through.
4. **Container queries, not viewport breakpoints**, for page layout (`@container`
   on the page root and on the form column). The AgentSidebar changes the width.
5. **Import controls from `@/components/ui/*`** (add one-line shims), Repro
   presentational pieces from `@/components/repro/ui`. Never from
   `@agent-native/toolkit/ui/*` in pages.
6. **No arbitrary values** beyond the few documented here (`top-[18%]`,
   `max-w-[76rem]`, `max-w-[44rem]`, grid templates, `min-h-[4.5rem]`,
   `max-h-[calc(100dvh-6rem)]`). Use tokens.
7. **Flash only on agent writes** (`flashKey` from the latest agent
   `field_set`), never on load or local typing. Never overwrite text the user
   is typing (§5.1).
8. **Never show a fabricated issue number or link.** `#123` only from
   `githubIssueNumber`/`githubIssueUrl`.
9. **No sparkle/robot/wand icons**, no gradients, no filled colour pills.
10. **Page title lives in the shell header** (`useSetPageTitle`), not in the body.
11. **Theme**: dark mode is the `.dark` class; every Repro token has a dark
    value. Check both themes in the browser smoke.
