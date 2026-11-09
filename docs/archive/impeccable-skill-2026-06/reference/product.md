# Product Register

## The Product Slop Test
"The tool should disappear into the task." Would a power user of Linear, Figma, or Notion trust this interface?

## Typography
- One family is often right — a well-tuned sans handles all roles
- Fixed rem scale, not fluid — clamp-sized headings don't serve product UI
- Tighter scale ratio: 1.125–1.2 between steps
- Line length 65–75ch for prose; tables at 120ch+ are fine

## Color
- Restrained by default: tinted neutrals + one accent ≤10%
- State-rich semantic vocabulary: hover, focus, active, disabled, selected, loading, error, warning, success
- Accent for primary actions and state indicators only — not decoration
- Second neutral layer for sidebars and panels

## Layout
- Responsive = structural (collapse sidebar, breakpoint columns) — not fluid typography

## Components
Every interactive component needs: default, hover, focus, active, disabled, loading, error.
- Skeleton states for loading, not spinners in content
- Empty states that teach the interface
- Consistent affordances: same button shape, form-control vocabulary, icon style

## Motion
- 150–250ms on most transitions
- Motion conveys state, not decoration: state change, feedback, loading, reveal
- No orchestrated page-load sequences

## Product Bans
- Decorative motion that doesn't convey state
- Inconsistent component vocabulary across screens
- Display fonts in UI labels, buttons, or data
- Reinventing standard affordances (custom scrollbars, weird form controls)
- Heavy color on inactive states
- Modal as first thought

## Product Permissions
- System fonts / Inter / system-ui stacks ✓
- Standard navigation: top bar + side nav, breadcrumbs, tabs ✓
- Density — tables with many rows, dense information ✓
- Consistency over surprise ✓
