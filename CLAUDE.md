# CLAUDE.md

This project is an AI assistant web application. When writing frontend code, follow all rules below automatically.

---

## Coding Behavior (from karpathy-guidelines)

### 1. Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If 200+ lines could be 50, rewrite it.

### 3. Surgical Changes

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

### 4. Goal-Driven Execution

- Transform tasks into verifiable goals with success criteria.
- For multi-step tasks, state a plan: `1. [Step] → verify: [check]`

---

## UI/UX Design Rules (from ui-ux-pro-max)

Apply these rules to ALL frontend code. Check `skills/ui-ux-pro-max/SKILL.md` for the full reference.

### Accessibility (CRITICAL — always verify)

- Color contrast ≥ 4.5:1 for normal text, 3:1 for large text
- Visible focus rings on all interactive elements (2–4px)
- aria-label on icon-only buttons; descriptive alt text on images
- Tab order matches visual order; full keyboard navigation
- Don't convey info by color alone (add icon/text)
- Respect prefers-reduced-motion; reduce/disable animations when requested

### Touch & Interaction (CRITICAL)

- Min touch target 44×44px; spacing ≥ 8px between touch targets
- Don't rely on hover alone for important interactions
- Provide loading/pressed feedback on all interactive elements
- Use cursor-pointer on clickable elements (web)

### Icons & Visuals

- Use SVG icons (Lucide, Heroicons) — NEVER use emojis as structural icons
- Consistent icon sizing via design tokens; one icon family throughout
- Consistent stroke width; don't mix filled/outline styles at same hierarchy level

### Layout & Responsive

- Mobile-first breakpoints; systematic scale (375 / 768 / 1024 / 1440)
- Min 16px body text on mobile (avoids iOS auto-zoom)
- No horizontal scroll on mobile
- Use 4px/8px spacing rhythm (Tailwind: p-1=4px, p-2=8px, p-4=16px, etc.)
- Consistent max-width container (max-w-6xl / max-w-7xl)
- Define z-index scale; fixed elements must reserve safe padding for content underneath

### Typography & Color

- Line-height 1.5–1.75 for body text; limit 65–75 chars per line
- Use semantic color tokens (primary, secondary, error, surface, on-surface), not raw hex
- Dark mode: desaturated/lighter tones, test contrast independently
- Consistent type scale (12 14 16 18 24 32)

### Animation

- Duration 150–300ms for micro-interactions; use transform/opacity only
- Animate 1–2 key elements per view max; not decorative only
- Use ease-out for entering, ease-in for exiting
- Exit animations shorter than enter (~60–70% of enter duration)

### Forms & Feedback

- Visible label per input (not placeholder-only)
- Show error below the related field; validate on blur
- Loading → success/error state on submit
- Confirm before destructive actions; auto-dismiss toasts in 3–5s

### Light/Dark Mode

- Primary text contrast ≥ 4.5:1 in BOTH modes
- Secondary text contrast ≥ 3:1 in BOTH modes
- Borders/dividers and interaction states visible in both modes
- Modal scrim 40–60% black to preserve foreground legibility
- Use semantic color tokens mapped per theme, never hardcoded hex

### Pre-Delivery Checklist

- [ ] No emojis as icons
- [ ] Touch targets ≥ 44px
- [ ] Focus states visible
- [ ] Tested on 375px width and landscape
- [ ] Reduced-motion respected
- [ ] Both light and dark mode contrast verified
- [ ] Safe areas respected for fixed elements

---

## Styling Stack (from ui-styling)

- Use Tailwind CSS utility-first approach
- Extract components only for true repetition, not preemptively
- Mobile-first responsive: start with mobile styles, layer up via sm:/md:/lg:/xl:
- Use shadcn/ui components (Radix UI primitives) for accessible interactive elements
- Dark mode via `dark:` prefix + semantic CSS variables

---

## Design System (from design-system)

- Three-layer token architecture: Primitive → Semantic → Component
- Never use raw hex values in components — reference semantic tokens
- Use CSS variables for theme switching (light/dark)
- Define component states: Default | Hover | Active | Disabled | Focus

---

## Task-Specific Skills (invoke via Skill tool when task matches)

| Skill           | When to invoke                                                            |
| --------------- | ------------------------------------------------------------------------- |
| `banner-design` | Designing banners for social media, ads, hero images                      |
| `brand`         | Brand voice, visual identity, messaging frameworks                        |
| `design`        | Logo generation, CIP mockups, icon design, social photos                  |
| `slides`        | Creating HTML presentations with Chart.js                                 |
| `design-system` | Generating design tokens, component specs, slide systems                  |
| `ui-ux-pro-max` | Running design-system search scripts for style/color/font recommendations |
