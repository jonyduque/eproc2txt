# Design Spec: Portable TV Redesign & Control Integration

Design specification to transform the application's cabinet visual layout into a 1980s portable CRT television and integrate the configuration panel directly into the right side of the TV chassis.

## 1. Objectives
* **Chassis Styling**: Change the cabinet texture from woodgrain to a dark charcoal/matte black textured ABS plastic casing.
* **Remove Stand**: Remove the neck and base/feet elements completely. The TV sits flat on the background surface.
* **Slimmer Borders**: Reduce the bezel and outer borders to give a more compact portable look.
* **Integrated Controls**: Merge the right-side configuration panel (`ConfigPanel`) visual area with the television cabinet itself on the right column. The configurations should look like the TV's built-in knobs, sliders, and buttons.
* **Dynamic Power Section**: Re-wire the power LED and the "POWER" text to reflect application state changes dynamically.

---

## 2. Component Design & Layout

The main view remains a responsive two-column grid inside `.retro-tv-layout-grid`:
* **Left Bezel**: The CRT screen container (hosting `LoadingScreen`, `ConfigScreen`, `ProcessingScreen`, `DoneScreen`).
* **Right Bezel**: Integrated control section (replacing the separate `ConfigPanel` visual border).

### 2.1 The Cabinet (`RetroTV.tsx` / `RetroTV.css`)
* Material: `#333742` or `#2b2e38` textured ABS plastic.
* Top handle: A molded handle indentation at the top center of the chassis.
* Ventilation slats: Simulated slots on the top.
* No base: Remove `.crt-neck` and `.crt-base`.

### 2.2 Controls Integration
Instead of rendering the controls inside separate cards, they are placed directly inside the right panel of the TV casing:
* **UHF Channel Knob (Parallel Processors / `maxWorkers`)**:
  - Styled as a round dial knob.
  - Features 8 numerical tick marks (1 to 8) around the dial printed on the chassis.
  - Integrates the selection wheel. Clicking the dial or using the adjacent +/- controls rotates the knob physically (applying CSS `transform: rotate(...)`).
* **Vertical Slider/Fader (OCR Level / `tessModel`)**:
  - Styled as a vertical volume/tuning slider (fader knob inside a slot).
  - Three distinct position marks: "Rápido" (bottom), "Normal" (middle), "Preciso" (top).
  - Dragging the fader or clicking the positions changes `tessModel`.
* **Vintage Power Button**:
  - A large red rectangular push button located at the bottom-right of the control section.
  - Serves as the "Iniciar Processamento" trigger.
  - Disabled when no files are selected (`selectedPathsSize === 0`).
  - Animates on click (receding into the chassis).
* **Dynamic LED & Status label**:
  - Text label: "POWER: [STATUS]" where status is:
    - `"STANDBY"` when state is `idle` (LED off/dark grey).
    - `"READY"` when state is `configuring` (LED solid red).
    - `"ACTIVE"` when state is `processing` (LED blinking/flashing green).
    - `"FINISHED"` when state is `completed` (LED solid green).

---

## 3. Data Flow and API Changes

1. **State Propagation**:
   - `App.jsx` coordinates the overall layout.
   - `RetroTV.tsx` is updated to accept the configuration controls as a prop or render slot (or we can combine/nest them, but to keep concerns separate, we can pass the config elements directly inside `RetroTV` layout or let `RetroTV` receive configuration props and handle rendering itself).
   - Let's pass the configurations inside a custom sub-component or directly within `RetroTV` by passing control props: `maxWorkers`, `setWorkers`, `tessModel`, `setTessModel`, `status`, `onStartClick`, `selectedPathsSize`.
   
2. **Dynamic Prop Table for `RetroTV.tsx`**:
   - `status` (`"idle" | "configuring" | "processing" | "completed"`)
   - `maxWorkers` (`number`)
   - `setWorkers` (`function`)
   - `tessModel` (`string`)
   - `setTessModel` (`function`)
   - `selectedPathsSize` (`number`)
   - `onStartClick` (`function`)
   - `ignoredFiles` (`Array`)

---

## 4. Verification Plan

### Automated Checks
* Check compilation with `npm run build`.
* Run Biome linter `npx biome check src` to ensure zero errors.

### Manual Verification
* Upload a ZIP file and verify the transition from `"STANDBY"` to `"READY"`.
* Interact with the channel dial to verify rotation and worker updates (1 to 8).
* Drag or click the vertical slider to verify OCR level changes.
* Click the red Power button to start processing, verifying the LED turns to blinking green and the text displays `"POWER: ACTIVE"`.
* Verify that once processing is completed, the LED turns to solid green and the text displays `"POWER: FINISHED"`.
