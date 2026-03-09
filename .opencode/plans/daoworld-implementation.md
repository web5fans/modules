# daoworld App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build daoworld - a user-friendly Web5 entry point app with shadcn/ui, featuring 6-step user registration, Web5 Apps directory, and user settings with CKB wallet integration.

**Architecture:** Host app consuming keystore/did/pds remote modules via Module Federation, using React Router for navigation, contexts for state management, and localStorage for session persistence.

**Tech Stack:** React 19 + TypeScript + Vite + shadcn/ui + Tailwind CSS + Module Federation

---

## Executive Summary

This plan creates a new `apps/daoworld` application as a user-friendly Web5 entry point. The app integrates with existing remote modules (keystore, did, pds) via Module Federation and provides:

1. **Registration Flow (6 steps)**: Create key → Select PDS → Choose username → Connect CKB wallet → On-chain transaction → PDS registration
2. **Web5 Apps Page**: App Store-like grid of available Web5 applications
3. **User Settings**: Two-tab interface for data browsing and management operations

**Total Waves:** 6  
**Estimated Tasks:** 35  
**Parallel Execution:** Wave 1-2 can run in parallel, Waves 3-6 have some dependencies

---

## Directory Structure

```
apps/daoworld/
├── index.html                 # Entry HTML
├── package.json              # Dependencies and scripts
├── tsconfig.json             # Composite project config
├── tsconfig.app.json         # App TypeScript config
├── tsconfig.node.json        # Node TypeScript config
├── vite.config.ts            # Vite + Module Federation config
├── eslint.config.js          # ESLint configuration
├── components.json           # shadcn/ui configuration
├── src/
│   ├── index.css             # Global styles + Tailwind
│   ├── main.tsx              # App entry point
│   ├── App.tsx               # Router and providers setup
│   ├── remotes.d.ts          # Module Federation type declarations
│   ├── components/
│   │   └── ui/               # shadcn/ui components
│   ├── contexts/
│   │   ├── DaoworldContext.tsx    # Main app state
│   │   └── RegistrationContext.tsx # Registration wizard state
│   ├── hooks/
│   │   ├── useKeystore.ts    # Keystore integration
│   │   ├── useDid.ts         # DID operations
│   │   ├── usePds.ts         # PDS operations
│   │   └── useCkbWallet.ts   # CKB wallet integration
│   ├── pages/
│   │   ├── Layout.tsx        # Root layout
│   │   ├── Web5AppsPage.tsx  # App Store grid
│   │   ├── UserSettingsPage.tsx   # Settings tabs
│   │   └── registration/
│   │       ├── RegistrationWizard.tsx
│   │       ├── Step1CreateKey.tsx
│   │       ├── Step2SelectPds.tsx
│   │       ├── Step3Username.tsx
│   │       ├── Step4ConnectWallet.tsx
│   │       ├── Step5Transaction.tsx
│   │       └── Step6RegisterPds.tsx
│   ├── services/
│   │   ├── storage.ts        # localStorage utilities
│   │   └── validation.ts     # Username validators
│   └── lib/
│       └── utils.ts          # cn() utility
└── public/
```

---

## Wave 1: Project Bootstrap & Configuration

**Parallelism:** All tasks in Wave 1 can run in parallel  
**Dependencies:** None

### Task 1.1: Create App Directory Structure

**Files:**
- Create: `apps/daoworld/index.html`
- Create: `apps/daoworld/package.json`
- Create: `apps/daoworld/tsconfig.json`
- Create: `apps/daoworld/tsconfig.app.json`
- Create: `apps/daoworld/tsconfig.node.json`
- Create: `apps/daoworld/vite.config.ts`
- Create: `apps/daoworld/eslint.config.js`
- Create: `apps/daoworld/src/main.tsx`
- Create: `apps/daoworld/src/index.css`

**Step 1: Create directory structure**

```bash
mkdir -p apps/daoworld/src/{components/ui,contexts,hooks,pages/registration,services,lib}
mkdir -p apps/daoworld/public
```

**Step 2: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>daoworld - Web5 User Portal</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 3: Create package.json**

```json
{
  "name": "@web5-modules/daoworld",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@ckb-ccc/ccc": "0.0.0-canary-20260109065952",
    "@ckb-ccc/connector-react": "0.0.0-canary-20260109065952",
    "@radix-ui/react-tabs": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.462.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "tailwind-merge": "^2.6.0",
    "web5-api": "^0.0.27"
  },
  "devDependencies": {
    "@eslint/js": "^9.17.0",
    "@originjs/vite-plugin-federation": "^1.4.1",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.17.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.16",
    "globals": "^15.13.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^4.1.18",
    "typescript": "~5.8.0",
    "typescript-eslint": "^8.18.0",
    "vite": "^6.0.0"
  }
}
```

**Step 4-9:** Create remaining config files (tsconfig, vite.config.ts, eslint.config.js) following the patterns in the existing console app.

**Step 10: Commit**

```bash
git add .
git commit -m "chore: bootstrap daoworld app with base configuration"
```

---

### Task 1.2: Initialize shadcn/ui

**Files:**
- Create: `apps/daoworld/components.json`
- Create: `apps/daoworld/src/lib/utils.ts`
- Install: shadcn/ui components

**Step 1: Create components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "radix-nova",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

**Step 2: Install components**

```bash
cd apps/daoworld
pnpm dlx shadcn@latest add button card tabs input select dialog badge progress separator skeleton
```

**Step 3: Commit**

```bash
git add .
git commit -m "chore: initialize shadcn/ui with required components"
```

---

### Task 1.3: Create Module Federation Type Declarations

**Files:**
- Create: `apps/daoworld/src/remotes.d.ts`

Copy type declarations from `apps/console/src/remotes.d.ts` and adapt for daoworld.

**Step 1: Commit**

```bash
git add src/remotes.d.ts
git commit -m "chore: add Module Federation type declarations"
```

---

## Wave 2: Core Services & Utilities

**Parallelism:** All tasks can run in parallel  
**Dependencies:** Wave 1 complete

### Task 2.1: Create Storage Service

**Files:**
- Create: `apps/daoworld/src/services/storage.ts`

```typescript
export interface UserSession {
  didKey: string
  did: string
  metadata: string
  username: string
  pds: string
  ckbWalletAddress: string
  accessJwt?: string
  refreshJwt?: string
}

const STORAGE_KEY = 'daoworld_session'

export const storage = {
  saveSession(session: UserSession): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  },

  getSession(): UserSession | null {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return null
    try {
      return JSON.parse(data) as UserSession
    } catch {
      return null
    }
  },

  clearSession(): void {
    localStorage.removeItem(STORAGE_KEY)
  },

  hasSession(): boolean {
    return !!this.getSession()
  },

  updateSession(updates: Partial<UserSession>): void {
    const current = this.getSession()
    if (current) {
      this.saveSession({ ...current, ...updates })
    }
  }
}
```

---

### Task 2.2: Create Validation Utilities

**Files:**
- Create: `apps/daoworld/src/services/validation.ts`

```typescript
export const validation = {
  isValidUsername(username: string): boolean {
    if (!username || username.length < 3 || username.length > 20) {
      return false
    }
    const regex = /^[a-z][a-z0-9_-]*[a-z0-9]$/
    return regex.test(username)
  },

  getUsernameError(username: string): string | null {
    if (!username) return 'Username is required'
    if (username.length < 3) return 'Username must be at least 3 characters'
    if (username.length > 20) return 'Username must be at most 20 characters'
    if (!/^[a-z]/.test(username)) return 'Username must start with a letter'
    if (!/[a-z0-9]$/.test(username)) return 'Username must end with a letter or number'
    if (!/^[a-z0-9_-]+$/.test(username)) {
      return 'Username can only contain lowercase letters, numbers, hyphens, and underscores'
    }
    return null
  },

  formatDid(did: string): string {
    if (!did || did.length < 20) return did
    return `${did.slice(0, 12)}...${did.slice(-6)}`
  },

  formatAddress(address: string): string {
    if (!address || address.length < 12) return address
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }
}
```

---

### Task 2.3: Create Custom Hooks

**Files:**
- Create: `apps/daoworld/src/hooks/useKeystore.ts`
- Create: `apps/daoworld/src/hooks/useDid.ts`
- Create: `apps/daoworld/src/hooks/usePds.ts`
- Create: `apps/daoworld/src/hooks/useCkbWallet.ts`

Each hook follows the pattern from console app but adapted for daoworld.

---

## Wave 3: Context Providers

**Parallelism:** Tasks can run in parallel  
**Dependencies:** Wave 2 complete

### Task 3.1: Create DaoworldContext

**Files:**
- Create: `apps/daoworld/src/contexts/DaoworldContext.tsx`

Manages authentication state and session persistence.

### Task 3.2: Create RegistrationContext

**Files:**
- Create: `apps/daoworld/src/contexts/RegistrationContext.tsx`

Manages registration wizard state across 6 steps.

---

## Wave 4: Registration Wizard Components

**Parallelism:** Sequential (steps depend on each other)  
**Dependencies:** Wave 3 complete

### Task 4.1: RegistrationWizard Container

**Files:**
- Create: `apps/daoworld/src/pages/registration/RegistrationWizard.tsx`

Container with progress bar and step routing.

### Task 4.2-4.7: Registration Steps

**Files:**
- Create: `Step1CreateKey.tsx` - Create/import sign key
- Create: `Step2SelectPds.tsx` - PDS selection  
- Create: `Step3Username.tsx` - Username validation
- Create: `Step4ConnectWallet.tsx` - CKB wallet connection
- Create: `Step5Transaction.tsx` - On-chain transaction
- Create: `Step6RegisterPds.tsx` - PDS registration

---

## Wave 5: Main Application Components

**Parallelism:** Tasks can run in parallel  
**Dependencies:** Wave 4 complete

### Task 5.1: Layout Component

**Files:**
- Create: `apps/daoworld/src/pages/Layout.tsx`

Navigation with "Web5 Apps" and "User Settings" tabs.

### Task 5.2: Web5AppsPage

**Files:**
- Create: `apps/daoworld/src/pages/Web5AppsPage.tsx`

App Store-like grid with placeholder Web5 apps.

### Task 5.3: UserSettingsPage

**Files:**
- Create: `apps/daoworld/src/pages/UserSettingsPage.tsx`

Two-tab interface: User Data and Management.

---

## Wave 6: App Entry & Integration

**Parallelism:** Sequential  
**Dependencies:** Wave 5 complete

### Task 6.1: Create App.tsx Router

**Files:**
- Create: `apps/daoworld/src/App.tsx`

React Router setup with authentication flow.

### Task 6.2: Update Root Configuration

**Files:**
- Modify: `package.json` - add daoworld scripts
- Modify: `turbo.json` - if needed

### Task 6.3: Install Dependencies & Build

**Step 1:** Install all dependencies

```bash
pnpm install
```

**Step 2:** Build to verify

```bash
pnpm --filter @web5-modules/daoworld build
```

---

## Wave 7: Testing & Quality Assurance

### Task 7.1: Run ESLint

```bash
cd apps/daoworld
pnpm lint
```

### Task 7.2: Verify TypeScript

```bash
pnpm exec tsc --noEmit
```

### Task 7.3: Test Development Server

Start all services and verify the app works end-to-end.

---

## Execution Strategy

### Parallel Execution Waves

| Wave | Tasks | Parallel | Est. Time |
|------|-------|----------|-----------|
| 1 | Bootstrap & Config | Yes | 1-2h |
| 2 | Core Services | Yes | 1-2h |
| 3 | Contexts | Yes | 1h |
| 4 | Registration Wizard | Sequential | 3-4h |
| 5 | Main Components | Yes | 2-3h |
| 6 | Integration | Sequential | 1h |
| 7 | QA | Yes | 1h |

**Total Estimated Time:** 10-14 hours with parallel execution

### Atomic Commit Strategy

- Each task = 1 commit
- Conventional commit format: `chore:`, `feat:`, `fix:`
- Clear, descriptive messages

### Skills Required

- **ui-ux-pro-max**: Design system and shadcn/ui
- **superpowers/executing-plans**: Task execution
- **frontend-ui-ux**: Component implementation

---

## Post-Implementation Checklist

### Functionality
- [ ] 6-step registration flow works
- [ ] Auto-login persists in localStorage
- [ ] Web5 Apps grid displays
- [ ] Settings tabs function
- [ ] CKB wallet integration works
- [ ] DID creation on-chain succeeds
- [ ] PDS registration completes

### Quality
- [ ] ESLint passes
- [ ] TypeScript compiles
- [ ] No console errors
- [ ] Responsive design works
- [ ] Module Federation loads correctly
