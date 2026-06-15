# Design Spec: CRT UI Refinements and CSS Custom Functions

Date: 2026-06-15  
Status: Approved  
Author: Antigravity  

---

## 1. Goal Description

This spec outlines visual, layout, and architectural CSS refinements to the `eproc2txt` application:
1. **DoneScreen:** Update the floating success badge from "XML" to "TXT". Customize its color palette to match the application's primary cyan theme instead of success green.
2. **Dropzone (LoadingScreen):** Redesign the dropzone to resemble a realistic physical CRT monitor (curved screen tube glass, bezel chassis, base pedestal, control knobs, brand label, blinking power LED, and a functional Power button).
3. **Glowing Text Flickering:** Introduce a retro-futuristic CRT micro-flickering effect for all glowing text elements (`.text-glow` and `.text-glow-magenta`).
4. **Color Variables Encapsulation:** Relocate component-specific colors into `:root` blocks inside their respective component stylesheets, and support overrides in `body.light-theme`.
5. **Alpha Custom Function:** Replace hardcoded color opacity variables (e.g. `var(--color-primary-alpha-40)`) with the `@function --transparent(--color, --alpha)` custom CSS function globally.
6. **Responsive Width Custom Functions:** Define `@function --responsive-md` and `@function --responsive-lg` inside `style.css` to replace width-related `@media` queries in component stylesheets.

---

## 2. Detailed Technical Specifications

### 2.1 CSS Custom Functions for Responsive Layouts

We will declare the following custom functions in `style.css`:

```css
@function --responsive-md(--mobile, --desktop) {
  @media (max-width: 767px) {
    result: var(--mobile);
  }
  @media (min-width: 768px) {
    result: var(--desktop);
  }
}

@function --responsive-lg(--mobile, --desktop) {
  @media (max-width: 1023px) {
    result: var(--mobile);
  }
  @media (min-width: 1024px) {
    result: var(--desktop);
  }
}
```

This lets us declare responsive properties in component stylesheets without media queries:
```css
.dashboard-grid {
  grid-template-columns: --responsive-lg(1fr, 1fr 1fr);
  overflow-y: --responsive-lg(auto, hidden);
}
```

---

### 2.2 Text Glowing & Flickering Keyframes

We will declare `@keyframes text-flicker` in `style.css` simulating micro-fluctuations in cathode-ray tube rendering:

```css
@keyframes text-flicker {
  0%, 100% {
    opacity: 0.98;
    text-shadow: 0 0 var(--blur-size, 18px) oklch(from currentColor l c h / 0.85);
  }
  2.3% {
    opacity: 0.90;
    text-shadow: 0 0 calc(var(--blur-size, 18px) * 0.8) oklch(from currentColor l c h / 0.7);
  }
  3.0% {
    opacity: 1.0;
    text-shadow: 0 0 calc(var(--blur-size, 18px) * 1.25) oklch(from currentColor l c h / 1.0);
  }
  4.3% {
    opacity: 0.85;
    text-shadow: 0 0 calc(var(--blur-size, 18px) * 0.7) oklch(from currentColor l c h / 0.55);
  }
  5.0% {
    opacity: 0.98;
    text-shadow: 0 0 var(--blur-size, 18px) oklch(from currentColor l c h / 0.85);
  }
  50% {
    opacity: 0.98;
    text-shadow: 0 0 var(--blur-size, 18px) oklch(from currentColor l c h / 0.85);
  }
  52.3% {
    opacity: 0.88;
    text-shadow: 0 0 calc(var(--blur-size, 18px) * 0.75) oklch(from currentColor l c h / 0.65);
  }
  53.0% {
    opacity: 0.98;
    text-shadow: 0 0 var(--blur-size, 18px) oklch(from currentColor l c h / 0.85);
  }
  54.0% {
    opacity: 0.92;
    text-shadow: 0 0 calc(var(--blur-size, 18px) * 0.8) oklch(from currentColor l c h / 0.7);
  }
  55.5% {
    opacity: 1.0;
    text-shadow: 0 0 calc(var(--blur-size, 18px) * 1.3) oklch(from currentColor l c h / 1.0);
  }
  56.5% {
    opacity: 0.98;
    text-shadow: 0 0 var(--blur-size, 18px) oklch(from currentColor l c h / 0.85);
  }
}
```

It will be added as a secondary animation to `.text-glow` and `.text-glow-magenta`.

---

### 2.3 DoneScreen Floating TXT Badge

We will change:
- Text from "XML" to "TXT".
- `.done-floating-xml-container` -> `.done-floating-txt-container`
- `.xml-floating` -> `.txt-floating`
- The colors of the floating file to use `var(--color-primary)` (cyan) instead of success green to match the primary theme, utilizing `--transparent(var(--color-primary), 0.05)` for the card background.

---

### 2.4 Dropzone CRT Monitor chassis layout

In `Dropzone.tsx`:
```tsx
<div className="crt-monitor-frame">
  <div className="crt-chassis">
    <div className="crt-bezel">
      <div className="crt-screen-container">
        {/* Label acts as the curved CRT phosphor glass */}
        <label className={`dropzone-card panel scanlines crt-screen ...`}>
          ...
        </label>
      </div>
    </div>
    <div className="crt-control-bar">
      <div className="crt-brand">EPROC-TXT CRT-80</div>
      <div className="crt-dials">
        <div className="crt-dial" />
        <div className="crt-dial" />
      </div>
      <div className="crt-power-section">
        <div className={`crt-power-led ${loading ? "busy" : "active"}`} />
        <button 
          type="button" 
          className="crt-power-btn" 
          onClick={() => fileInputRef.current?.click()}
          title="Ligar monitor / Carregar arquivo"
        />
      </div>
    </div>
  </div>
  <div className="crt-neck" />
  <div className="crt-base" />
</div>
```

In `LoadingScreen.css`:
- `.crt-monitor-frame` defines layout container.
- `.crt-chassis` styled with a solid vintage plastic chassis texture (dark metallic grey with subtle highlights).
- `.crt-bezel` has thick borders with inner bevel shading.
- `.crt-screen` has curved corners (`border-radius: 36px` or similar) to simulate the classic bulge of old glass screens, with `box-shadow: inset 0 0 30px rgba(0,0,0,0.9)` and overlay scanlines.
- `.crt-power-led` glows green (`oklch(0.78 0.18 150)`) when active, and blinks/pulses amber (`oklch(0.82 0.16 85)`) when `loading` is true.

---

## 3. Scope of File Changes

- **Modify:** `style.css` (Animations, custom functions, global utility variables)
- **Modify:** `src/components/DoneScreen/DoneScreen.tsx` & `DoneScreen.css`
- **Modify:** `src/components/LoadingScreen/Dropzone/Dropzone.tsx` & `LoadingScreen.css`
- **Modify:** `src/components/ConfigScreen/ConfigScreen.css` (Replace media queries, use functions)
- **Modify:** `src/components/ConfigScreen/ConfigPanel/TessModel.css` (Replace alpha colors)
- **Modify:** `src/components/ConfigScreen/FileSummaryBar/FileSummaryBar.css` (Replace alpha colors)
- **Modify:** `src/components/ConfigScreen/Tree/Tree.css` (Replace alpha colors)
- **Modify:** `src/components/ProcessingScreen/ProcessingScreen.css` (Replace media queries, alpha colors)
- **Modify:** `src/components/Layout/Background/BackgroundGradient.css` (Replace media queries)
