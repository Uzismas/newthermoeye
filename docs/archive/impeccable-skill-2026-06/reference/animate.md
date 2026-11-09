# Animate

## Motion Budget
Animate to convey state, give feedback, and clarify hierarchy. Cut decorative animation.

## Timing Rules
- 100–150ms: instant feedback (button press, toggle)
- 200–300ms: state changes (menus, tooltips, tab switches)
- 300–500ms: layout changes (modals, drawers, page transitions)
- 500–800ms: entrance animations (first load only)

Exit animations: ~75% of entrance duration.

## Easing
Use natural deceleration: `ease-out-quart`, `ease-out-quint`, `ease-out-expo`.
Avoid bounce and elastic — they feel dated.
CSS: `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out)

## Animation Materials
Transform + opacity are defaults but not the whole palette.
Blur, clip-path, shadow, color filters unlock atmospheric effects — bound expensive ones to small areas.

## Performance
- Animate `transform` and `opacity` by default
- Avoid layout-driving properties (`width`, `height`, `top`, `left`)
- Use Intersection Observer for scroll triggers

## Accessibility — Non-Negotiable
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Core Philosophy
One well-orchestrated experience beats scattered animations everywhere.
Every animation needs a reason; if it only decorates, cut it.

## Thermoeye Current Animations
- `.view-pane` → `viewPaneIn` 0.28s on subview switch
- `.lg-card` → `lg-card-in` 0.5s on login
- `.lg-badge-dot` → `lg-pulse` 2s on login badge
- `.lg-eye-scan` → `lg-spin` 3s on login eye diagram
