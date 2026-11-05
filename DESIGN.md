---
name: GitHub Maturity Assessment
description: Evidence-led assessment workspace in layered navy with blue, purple, and teal accents.
colors:
  bg: "#0c1424"
  panel: "#111e33"
  border: "#293951"
  muted: "#9eafc7"
  blue: "#58a6ff"
  teal: "#3dd6c6"
  purple: "#a58aff"
  text: "#e6edf7"
  sidebar: "#0a1221"
  button-fill: "#65afff"
  button-ink: "#08182b"
  button-hover: "#8bc3ff"
  journey: "#123653"
  focus: "#8cc4ff"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  headline:
    fontSize: "clamp(29px, 2.8vw, 40px)"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-.035em"
  title:
    fontSize: "17px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-.025em"
  subheading:
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.5
  decision-copy:
    fontSize: "13px"
  metadata:
    fontSize: "11px"
  utility:
    fontSize: "12px"
rounded:
  compact: "4px"
  field: "5px"
  action: "6px"
  navigation: "7px"
  panel: "9px"
spacing:
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
components:
  button-primary:
    backgroundColor: "{colors.button-fill}"
    textColor: "{colors.button-ink}"
    rounded: "{rounded.action}"
    padding: "12px 17px"
  button-primary-hover:
    backgroundColor: "{colors.button-hover}"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "24px"
---

# Design System: GitHub Maturity Assessment

## Overview

**Creative North Star: "Evidence-led assessment workspace"**

This documents the built, reference-derived visual world, not a proposed redesign. Layered navy, restrained outlines, and blue/purple/teal accents support consultant-led customer conversations. The supplied assessment reference governs the identity; this is not a randomly seeded concept or an official certification aesthetic.

**Key Characteristics:**
- Dense but readable decision support, with traceable scores and evidence.
- Flat, outlined surfaces; color differentiates dimensions, state, and recommended journeys.
- Local-first continuity, conspicuous sample labeling, and actionable next steps.

Source of truth: `src/index.css`, the final cascade in `src/App.css`, and components in `src/App.tsx`; product constraints remain in `PRODUCT.md`. The supplied desktop dashboard screenshot corroborates composition, not every current type size.

## Colors

### Primary
- **Assessment blue** (`blue`): links, radar outline/area, progress emphasis, and active maturity level. Primary buttons deliberately use the brighter `button-fill`, not the root blue.

### Secondary
- **Evidence teal** (`teal`): assessment progress and privacy accents; success tags use their own dark teal surface and pale teal text.

### Tertiary
- **Readiness purple** (`purple`): part of the pinned assessment vocabulary. Dimension and roadmap accents also use literal variants; do not normalize them all to the root token.
- Critical findings use muted rose/red; high priority uses amber; medium uses blue. Labels and numeric markers accompany color.

### Neutral
- **Midnight canvas**, **navy panel**, and **deeper sidebar** provide tonal hierarchy. `border` separates panels; `text` and `muted` support reading hierarchy.
- The recommended journey uses a distinct blue-toned `journey` surface. The sample banner is purple-toned, visibly separate from customer assessment content.
- Additional component-local border, status, hover, selection, and print colors in `App.css` are intentional variants of this palette. A strict token-only detector flags these and overridden legacy type declarations as documentation-coverage false positives, not newly introduced visual drift; the final CSS cascade is authoritative.

## Typography

System sans throughout; controls inherit the font. No external fonts or image assets are needed; interface symbols and radar graphics are SVG.
- The frontmatter headline/title/subheading values describe global h1/h2/h3 defaults, not a universal type scale. Paragraph line-height is (1.7); small text is (11px/1.6) before local overrides.
- Decision-support paragraphs, findings, answer labels/descriptions, and roadmap items are predominantly (13–14px). Report/methodology prose is (14px); common metadata is (11–12px).
- Preserve exceptions: desktop score (68px), compact page heading (29px), journey heading (26px), question heading (24px), and welcome heading with its own responsive rules.
- Existing smaller exceptions include sidebar brand caption/session details (9–12px), maturity-scale numerals (8px), footer (9px), and some utility/error copy (10–11px). Do not describe the accessibility correction as a global minimum.

## Layout

- Desktop: fixed left sidebar (238px), main offset to match, topbar (74px), main maximum width (1660px) with padding (28px 38px 0). Panels normally have (24px) padding; dashboard gaps are (20px).
- Dashboard pairs maturity score/radar with a journey column (285px), then two equal secondary panels and a three-column roadmap. Questionnaire pairs a sticky (220px) dimension navigator with the question panel.
- At width ≥1600px: main horizontal padding (52px), journey column (350px), score column (220px), radar maximum height (300px).
- At width ≤1220px: sidebar (205px), main/topbar horizontal padding (25px), panel padding (20px); secondary dashboard panels stack, decision matrix becomes two columns, questionnaire navigator narrows.
- At width ≤950px: sidebar becomes a fixed (73px) icon rail; dimension navigation becomes a horizontal scrolling strip. Main dashboard maturity/journey still remain adjacent.
- At width ≤760px: sidebar becomes a static top header with horizontally scrolling labeled navigation; main loses its offset. Topbar is (55px); main padding is (22px 20px 0). Maturity/journey, roadmap, forms, pilot plan, and architecture stack. Context summary and decision matrix remain two columns.
- Mobile maturity score and radar remain side by side. At width ≤400px, main horizontal padding becomes (14px), score (55px), and dimension columns compress. Body minimum width is (360px), not arbitrary smaller-screen support.
- Mobile has deliberate smaller chrome: navigation (10px), breadcrumb/save status/question metadata (9px), footer (8px), report-export buttons (10px), evidence textarea (12px), and narrow finding badges (8px).
- Print is a separate white/pale report treatment: hide navigation, topbar, footer, and non-print actions; remove main offset; square panels; stack roadmap; expose evidence detail content. Preserve its existing selective color overrides rather than claiming a complete light theme.

## Elevation & Depth

No box-shadow vocabulary is implemented. Depth comes from tonal surfaces, thin borders, inset form fields, and contrasting selected states. Focus is an outline, not an ambient glow. Button color transitions take (.15s); radar reveals in (.65s) with `cubic-bezier(.16, 1, .3, 1)`. Reduced-motion preference removes animations and transitions.

## Shapes

Panels have gently rounded corners (9px), actions (6px), fields/sample banner (5px), navigation (7px), and tags (4px). Borders are typically (1px). Circular dots, radio marks, and the avatar are intentional exceptions; brand/welcome symbols have larger rounded-square silhouettes.

## Components

- **Buttons:** shared `Button` supports primary/secondary, icon, disabled, and extra class styling. Primary has minimum height (41px); secondary is dark with a lighter outline. Text actions underline on hover; icon actions gain a tinted background. Disabled buttons retain layout at opacity (.48).
- **Fields:** `Field` groups label, control, and optional hint; `NumberField` supplies numeric entry. Inputs/selects/textareas use inset navy, (12px) padding, (41px) minimum height, and a (5px) radius. Textareas resize vertically. Global keyboard focus is a (2px) outline offset (4px).
- **Navigation:** selected sidebar items have a blue-tinted fill and border. Preserve accessible names when labels disappear in the icon rail. A focused skip link takes its own row before the application so it cannot cover content; the main content is a focus destination. The active mobile assessment dimension is scrolled into view.
- **Language preferences:** the topbar avatar is an accessible menu button with a short locale code. The outlined, navy menu uses radio-style language items with selected state, keyboard navigation, Escape/outside dismissal, and focus return. English, Brazilian Portuguese, and Spanish use their native language names. On mobile the topbar and section headings can wrap to accommodate expanded translations; the language menu remains within the viewport.
- **Tags/notices:** compact bordered labels communicate sample, completion/self-report, and priority state. Notices distinguish informational and storage/error messages; sample data stays explicitly fictional.
- **Questionnaire:** outlined radio answer rows gain blue fill/border when chosen and a separate focus-within outline. Numbered question steps distinguish answered/current states. Evidence notes and unknown-answer handling are part of the assessment, not decorative inputs.
- **Assessment dashboard:** score, level, radar, and metric strip form one maturity panel. Dimension rows combine colored dots, labeled tracks, and numeric scores; findings pair question, action, priority, and evidence guidance.
- **Journey and roadmap:** tinted journey panel links to its explanation; 30/60/90-day sections include owners, concrete actions, and exit criteria. Keep recommendation rationale connected to assessment evidence.
- **Saved assessments/report:** bordered assessment rows, customer initials, progress/score, report sections, export actions, and expandable evidence details reuse the same visual language.
- **Initial state:** welcome is an honest empty workspace with start/sample actions, not a pre-populated customer dashboard. Sample mode has a persistent disclosure and path to a real assessment.

## Do's and Don'ts

### Do:
- **Do** preserve the navy, blue, purple, and teal identity from the assessment reference.
- **Do** retain traceable maturity, evidence-led questions, recommendation rationale, and action-roadmap hierarchy.
- **Do** preserve readable decision-support copy and document local responsive exceptions honestly.

### Don't:
- **Don't** invent type tokens, benchmark claims, customer scores, external assets, or hosted-account features.
- **Don't** hide missing evidence behind low scores or present sample responses as customer facts.
- **Don't** replace the built workspace with a new visual concept or flatten print/mobile behavior into desktop rules.
