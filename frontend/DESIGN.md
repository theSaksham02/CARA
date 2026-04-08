# The Design System: Organic Authority

## 1. Overview & Creative North Star
**Creative North Star: "The Human Archive"**
This design system rejects the sterile, cold aesthetics typical of health technology in favor of a "Modern Editorial" approach. It bridges the gap between clinical authority and human warmth. Inspired by the precision of high-end editorial layouts and the fluid interactivity of Framer.com, this system utilizes expansive white space, dramatic typographic scale, and tactile layering.

Instead of a rigid, "template-first" grid, this system prioritizes **intentional asymmetry** and **tonal depth**. We treat the screen not as a flat canvas, but as a series of curated, physical layers—shifting the user's experience from "using an app" to "reading a premium publication."

---

## 2. Colors & Surface Philosophy
The palette is grounded in earth-tones that evoke trust and stability. We move away from digital blues toward a sophisticated olive and warm-cream foundation.

### The "No-Line" Rule
To achieve a high-end editorial feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined through background color shifts or subtle tonal transitions. 
- *Implementation:* Use a `surface-container-low` section sitting against a `background` to create a logical break.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers, similar to stacked sheets of high-grade paper.
- **Surface (Background):** `#fff8f1` — The base canvas.
- **Surface-Container-Low:** `#fdf2df` — Used for subtle content grouping.
- **Surface-Container-Lowest:** `#ffffff` — Used for "Floating Cards" that need to pop against the background.
- **Surface-Container-Highest:** `#ece1cf` — Used for structural elements like footers or secondary navigation bars.

### The Glass & Gradient Rule
For interactive elements or "Hero" highlights, use subtle gradients transitioning from `primary` (#445518) to `primary-container` (#5c6e2e). For floating navigation or modal overlays, apply **Glassmorphism**: use semi-transparent versions of your surface tokens with a `backdrop-blur` (16px–24px) to ensure the layout feels integrated and breathable.

---

## 3. Typography: Editorial Authority
The typographic system relies on a high-contrast pairing that balances "Medical Authority" with "Modern Utility."

- **Display & Headlines (Newsreader):** This serif choice is our voice of authority. It should be used with generous leading and occasionally tight letter-spacing for large hero sections. It feels academic yet approachable.
- **Body & Titles (Manrope):** Our "functional" voice. Manrope provides a clean, geometric contrast to the serif. It ensures that complex health data remains legible and accessible.

**Hierarchy Tip:** Always lean into extremes. If a headline is large (`display-lg`), ensure the surrounding body text has enough "breathing room" (padding) to let the typography stand as a design element itself.

---

## 4. Elevation & Depth
In this system, depth is achieved through **Tonal Layering** rather than heavy shadows.

### The Layering Principle
Hierarchy is established by stacking tiers. For a "Floating Card" effect, place a `surface-container-lowest` (#ffffff) element on top of a `surface` background. This creates a natural, soft lift.

### Ambient Shadows
When a physical "float" is required (e.g., a primary CTA button or a floating action menu), use **Ambient Shadows**:
- **Color:** A tinted version of `on-surface` (#201b10) at 5% opacity.
- **Blur:** Large and diffused (e.g., `box-shadow: 0 20px 40px rgba(32, 27, 16, 0.05)`).
- **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline-variant` token at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components

### Buttons
- **Primary:** Pill-shaped (`9999px` radius), Olive fill (`primary`). Text should be `on-primary`.
- **Secondary:** Pill-shaped, `outline-variant` Ghost Border (20% opacity). Text in `secondary`.
- **Interaction:** On hover, a subtle scale-up (1.02x) and a shift to `primary-container` provides a premium, tactile response.

### Floating Cards
- **Styling:** No borders. Use `surface-container-lowest` with a 32px (`xl`) border-radius.
- **Content:** Use vertical white space (32px+) to separate headers from body text. Forbid the use of divider lines inside cards; use a 4px `surface-variant` horizontal block for a softer separation if necessary.

### Inputs & Fields
- **Background:** `surface-container-low`.
- **Border:** None (use the "No-Line" rule).
- **Focus State:** A subtle 2px "Ghost Border" using the `primary` olive at 40% opacity.

### Chips
- **Selection:** Use `primary-fixed` with `on-primary-fixed` text.
- **Unselected:** `surface-container-high` with `on-surface-variant` text.
- **Shape:** Pill-shaped (`full`).

---

## 6. Do's and Don'ts

### Do
- **Do** use large, bold serif headers that span at least 60% of the viewport width in Hero sections.
- **Do** utilize "Dead Space." Let elements breathe; health-tech should feel calm, not cluttered.
- **Do** use `surface` color shifts to define the transition between a header and the main content.

### Don'ts
- **Don't** use 1px solid black or dark grey borders. It breaks the "Editorial" flow.
- **Don't** use standard "Drop Shadows." Only use wide, diffused Ambient Shadows.
- **Don't** use pure black (#000000) for text. Always use `on-surface` (#201b10) to maintain the warm, grounded vibe.
- **Don't** use sharp corners. Every container should feel organic and soft (minimum 8px, ideally 16px-32px).