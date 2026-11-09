---
name: impeccable
description: "Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract, or otherwise improve a frontend interface. Covers websites, landing pages, dashboards, product UI, app shells, components, forms, settings, onboarding, and empty states. Handles UX review, visual hierarchy, information architecture, cognitive load, accessibility, performance, responsive behavior, theming, anti-patterns, typography, fonts, spacing, layout, alignment, color, motion, micro-interactions, UX copy, error states, edge cases, i18n, and reusable design systems or tokens. Also use for bland designs that need to become bolder or more delightful, loud designs that should become quieter, live browser iteration on UI elements, or ambitious visual effects that should feel technically extraordinary. Not for backend-only or non-UI tasks."
argument-hint: "[command] [target]"
user-invocable: true
---

Designs and iterates production-grade frontend interfaces. Real working code, committed design choices, exceptional craft.

## Commands

| Command | Description |
|---|---|
| `craft [feature]` | Shape then build a feature end-to-end |
| `shape [feature]` | Plan UX/UI before writing code |
| `audit [target]` | Technical quality checks (a11y, perf, responsive) |
| `polish [target]` | Final quality pass before shipping |
| `animate [target]` | Add purposeful animations and motion |
| `colorize [target]` | Add strategic color to monochromatic UIs |
| `typeset [target]` | Improve typography hierarchy and fonts |
| `layout [target]` | Fix spacing, rhythm, and visual hierarchy |
| `critique [target]` | UX design review with heuristic scoring |
| `bolder [target]` | Amplify safe or bland designs |
| `quieter [target]` | Tone down aggressive or overstimulating designs |
| `distill [target]` | Strip to essence, remove complexity |
| `harden [target]` | Production-ready: errors, i18n, edge cases |
| `delight [target]` | Add personality and memorable touches |
| `clarify [target]` | Improve UX copy, labels, and error messages |
| `adapt [target]` | Adapt for different devices and screen sizes |
| `optimize [target]` | Diagnose and fix UI performance |
| `overdrive [target]` | Push past conventional limits |

## Design Guidance (key rules)

### Color
- Verify contrast: body text ≥4.5:1, large text ≥3:1
- Gray text on colored background → use darker shade of bg hue
- Use OKLCH for new projects

### Typography
- Cap body line length at 65–75ch
- `text-wrap: balance` on h1–h3
- Display letter-spacing floor: ≥ -0.04em

### Layout
- Flexbox for 1D, Grid for 2D
- Responsive grids: `repeat(auto-fit, minmax(280px, 1fr))`
- Vary spacing for rhythm

### Motion
- 100–150ms: instant feedback | 200–300ms: state changes | 300–500ms: layout changes
- Ease-out exponential curves. No bounce, no elastic.
- Always `@media (prefers-reduced-motion: reduce)`

### Absolute Bans
- Side-stripe borders (border-left > 1px as accent)
- Gradient text (`background-clip: text` + gradient)
- Glassmorphism as default
- Identical card grids
- Tiny uppercase eyebrow above every section

## Project Context (Thermoeye)
- Register: **product** (dashboard/clinical tool — design serves the product)
- Stack: Next.js 16 + React 19 + TypeScript + plain CSS
- Color: medical blue palette (`--purple: #0369a1`), dark navy sidebar
- Font: Inter (loaded via next/font/google)
- See `reference/product.md` for product-register rules
