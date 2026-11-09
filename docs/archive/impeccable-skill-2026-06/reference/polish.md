# Polish

## Core Philosophy
Polish is the *last* step — apply only to functionally complete work.

## Pre-Polish Checklist
1. Feature is functionally complete
2. Quality bar identified (MVP vs flagship)
3. Walk the actual user path before opening DevTools
4. Pull prior critique output if available
5. Classify issues: **cosmetic** (looks off) vs **functional** (breaks/confuses) — fix functional first

## Polish Dimensions

**Visual Alignment & Spacing**
- Grid adherence, spacing scale only (no arbitrary px values)
- Optical centering for icons
- Responsive consistency

**Typography**
- Consistent hierarchy
- 45–75 char line length
- No widows/orphans

**Color & Contrast**
- WCAG AA minimums (4.5:1 body, 3:1 large text)
- Token-only colors
- No gray text on colored backgrounds

**Interaction States**
Every interactive element: default, hover, focus, active, disabled, loading, error, success.

**Micro-interactions**
- 150–300ms transitions
- Ease-out curves
- No bounce/elastic
- Respect `prefers-reduced-motion`

**Copy**
- Consistent terminology
- Capitalization style
- Periods on sentences, not labels

**Edge Cases**
- Empty states
- Error states with recovery paths
- Long content overflow
- Offline handling

**Responsiveness**
- 44×44px minimum touch targets
- No text under 14px on mobile
- No horizontal scroll

**Code Quality**
- No console.log
- No commented-out code
- No unused imports
- No `any` in TypeScript

## Final Verification
- Use the feature yourself
- Test on real devices, not just DevTools
- Check all states, not just happy path
