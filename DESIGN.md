# Design System: eproc2txt

## 1. Visual Theme & Atmosphere
The design of `eproc2txt` follows a **futuristic cyber-technological / retro-cyberpunk dark mode** theme. The environment feels high-tech, alive, and interactive.
*   **Atmosphere:** Deep-tech, responsive, and data-dense. Light is treated as emission (glows, bleeps, and laser scanlines).
*   **Tactility:** Simulated physical layers using glassmorphic surfaces (`backdrop-filter`) and precise, narrow borders.
*   **Interactive Energy:** Smooth animations (rotating dashes, pulsing glows, sweeping laser lines, and radar indicators) represent background system processes.

---

## 2. Color Palette & Roles
All colors are specified using the modern `oklch` color space to ensure uniform perceptual brightness and color consistency.

*   **Deep Space Dark (Background):** `oklch(0.16 0.02 260)`
    *   *Role:* Solid background tone. Broken up by radial gradients.
*   **Techno Charcoal (Surface):** `oklch(0.20 0.025 260)`
    *   *Role:* Background of standard panels and input states.
*   **Electric Cyan (Primary):** `oklch(0.82 0.17 195)`
    *   *Role:* Primary accent, active processing indicators, progress bars, highlights, and primary buttons. Has an active text glow.
*   **Cyber Magenta (Accent/Secondary):** `oklch(0.72 0.22 320)`
    *   *Role:* Secondary accent, warnings, inactive highlights, hover transitions, and special buttons.
*   **Cyber White (Foreground):** `oklch(0.96 0.01 240)`
    *   *Role:* Readable text. High contrast but not harsh pure white.
*   **Muted Steel (Muted Text):** `oklch(0.70 0.03 250)`
    *   *Role:* Labels, metadata, and helper text.
*   **Green Matrix (Success):** `oklch(0.78 0.18 150)`
    *   *Role:* Successful completion states, final stats, and done badges.
*   **Warning Orange (Warning):** `oklch(0.82 0.16 85)`
    *   *Role:* Interruptions, intermediate loader warnings.

---

## 3. Typography Rules
*   **Font Sans:** `"Space Grotesk", system-ui, sans-serif`
    *   *Role:* Headings, controls, buttons, and UI components. Space Grotesk gives a futuristic, technical geometric styling with custom open-shaped letterforms.
*   **Font Mono:** `"JetBrains Mono", monospace`
    *   *Role:* Chronometers, elapsed timers, document counts, statistics, and raw text preview displays.
*   **Tabular Numbers:** All data-dense fields use `font-variant-numeric: tabular-nums` to prevent layouts from shifting during real-time updates.

---

## 4. Component Stylings

### Buttons
*   **Primary Button:** Rich gradient from Cyan to Magenta (`linear-gradient(135deg, var(--color-accent), var(--color-primary))`) with an underlying pulsate glow (`animate-glow-pulse`) and a white glare sweep transition on hover.
*   **Secondary Button:** Transparent dark glass (`rgba(255, 255, 255, 0.06)`) with a fine border (`var(--border-color)`), lighting up slightly on hover.

### Cards & Panels
*   **Standard Panel (`.panel`):** Dark semi-transparent gradient (`oklch(0.22 0.03 262 / 0.85)` to `oklch(0.18 0.025 262 / 0.85)`) with a `1px` subtle border and `backdrop-filter: blur(12px)`.
*   **Glowing Panel (`.panel-glow`):** Highlights active processes (e.g. stats board). Replaces standard borders with an active Cyan glow box-shadow and internal ambient light refraction.

### Dropzone
*   **Dashed Rotating Rings:** An inner circle with a dashed style rotating slowly (`8s linear infinite`) inside the drop area.
*   **Pulsing Glow Core:** The central folder icon sits inside a pulsing circular cyan blur.
*   **Laser Scanning Lines:** Real horizontal scanlines that glide slowly from left to right with varying speeds, mimicking laser triangulation.

### Background Gradient Animation
*   **Animated Ambient Glow:** Multiple color bubbles (electric cyan, cyber magenta, steel blue, soft red, amber) float vertically and circularly using hardware-accelerated CSS animations and `hard-light` blend mode.
*   **Smooth Cursor Follower:** A dedicated bubble follows mouse movements globally, reacting with a smooth latency transition for high-tech interactivity.

---

## 5. Layout Components

### RetroTV (`RetroTV.tsx`)
The entire application is wrapped inside a CRT monitor frame simulation:
*   **Chassis & Bezel:** Physical monitor frame with control bar, brand label ("EPROC-TXT CRT-80"), dials, and power LED.
*   **Screen Effects:** Multiple overlay layers:
    *   **Scanlines:** Horizontal lines simulating CRT phosphor rows.
    *   **Flicker:** Subtle opacity animation mimicking CRT refresh flicker.
    *   **Static:** Noise texture that intensifies during channel switching (`isSwitchingChannel`).
    *   **Radial Vignette:** Darkened edges simulating CRT curvature.
*   **Neck & Base:** Physical monitor stand elements for visual depth.

### Background Gradient (`BackgroundGradient.tsx`)
*   **SVG Filter:** Uses `<feGaussianBlur>` + `<feColorMatrix>` + `<feBlend>` for gooey blob effect.
*   **Gradient Bubbles:** 5 colored bubbles (`bubble-first` through `bubble-fifth`) with CSS animations at different speeds and positions.
*   **Interactive Bubble:** A `bubble-interactive` div follows mouse position via `mousemove` event listener (when `interactive={true}`).
*   **Safari Fallback:** Detects Safari and applies alternative blur class (`safari-blur` vs `default-blur`).

### Background FX (`BackgroundFX.jsx`)
*   **Grid Overlay:** CSS grid pattern (`grid-bg`) for retro-tech aesthetic.
*   **Top Glow Line:** Horizontal gradient line at the top of the viewport.
*   **Bottom Glow Circle:** Large blurred radial gradient circle at the bottom.

### Isometric Viewport 3D (`IsometricViewport3D.tsx`)
A 3D CSS scene showing the processing pipeline:
*   **Scene Container:** Uses `rotateX(52deg) rotateZ(-35deg)` for isometric projection.
*   **Document Pile:** Stacked document sheets with dynamic height based on queue count.
*   **Processor Box:** 5 cores (W1-W4 at corners, W5 at center) with laser animations for active workers.
*   **Output File:** Text file representation with XML/TXT badge that changes on completion.
*   **Particle Lanes:** Dynamically generated `@keyframes` animations for page particles flowing from pile → processor → output, and text particles flowing from processor → output. Each active worker gets its own lane animation.
*   **Stage Classes:** `viewport-idle`, `viewport-configuring`, `viewport-processing`, `viewport-completed` for different visual states.

---

## 6. Layout Principles
*   **Fluid Scrolling:** The layout has a natural min-height constraint (`min-height: 100vh`) with a standard scroll behavior. It avoids rigid full-viewport constraints that clip long document trees or logs on smaller screens.
*   **Side-by-side Grids:** Features a clean asymmetric `2-column` grid layout on desktop viewports (`1fr 360px` or `1fr 1fr`) that collapses gracefully on mobile viewports.
*   **Vertical Spacing:** Generous and consistent layout rhythm to allow breathing room between panels, keeping margins to multiples of `0.75rem` / `1rem`.
