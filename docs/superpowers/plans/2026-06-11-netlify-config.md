# Netlify Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a unified `netlify.toml` configuration file to support SPA routing and secure cross-origin headers (COOP/COEP) for Web Workers and WASM.

**Architecture:** Create a `netlify.toml` file at the root of the project to set up the build command (`npm run build`), build output directory (`dist`), redirect rules for SPA fallback (`/*` -> `/index.html` with status 200), and global security headers including COOP and COEP.

**Tech Stack:** Netlify Configuration, TOML

---

### Task 1: Create Netlify Configuration File

**Files:**
- Create: `netlify.toml`

- [ ] **Step 1: Write the Netlify configuration file**

Create the file `netlify.toml` at the project root with the following content:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

- [ ] **Step 2: Run build command locally to verify setup**

Run: `npm run build`
Expected: The build succeeds and generates the distribution files in `dist/` without errors.

- [ ] **Step 3: Run Biome formatter and linter check**

Run: `npm run lint`
Expected: Biome check passes without errors on the project code.

- [ ] **Step 4: Commit**

```bash
git add netlify.toml
git commit -m "feat: add netlify.toml configuration with SPA redirect and COOP/COEP headers"
```
