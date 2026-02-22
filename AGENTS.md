# AGENTS.md - Coding Guidelines for AI Agents

## Project Overview

Web5 Modules is a monorepo for decentralized Web5 infrastructure using:
- **Package Manager**: pnpm 9.0.0
- **Monorepo Tool**: Turbo
- **Framework**: React 19 + TypeScript + Vite
- **Architecture**: Module Federation with micro-frontends

## Build Commands

```bash
# Root level commands
pnpm install          # Install dependencies
pnpm dev              # Start all apps in parallel (dev mode)
pnpm build            # Build all apps for production
pnpm preview          # Preview production builds

# Individual app development
pnpm dev:console      # Console app (port 3000)
pnpm dev:keystore     # Keystore app (port 3001)
pnpm dev:did          # DID module (port 3002)
pnpm dev:pds          # PDS module (port 3003)

# App-level commands (run from apps/<name>/)
pnpm dev              # Start Vite dev server
pnpm build            # Type-check and build (tsc -b && vite build)
pnpm lint             # Run ESLint
pnpm preview          # Preview built app
```

**Note**: No test framework is configured in this project.

## Code Style Guidelines

### TypeScript Configuration
- Target: ES2022
- Strict mode: enabled
- Module: ESNext with bundler resolution
- JSX: react-jsx transform

### Naming Conventions
- **Components**: PascalCase (e.g., `KeyManager`, `DidProvider`)
- **Functions/Variables**: camelCase (e.g., `handleSign`, `isConnected`)
- **Types/Interfaces**: PascalCase (e.g., `UserInfo`, `SessionData`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **File names**: PascalCase for components, camelCase for utilities

### Import Order
1. React and external libraries
2. Type-only imports (`import type {...}`)
3. Module Federation remotes (e.g., `keystore/KeystoreClient`)
4. Local absolute imports
5. Relative imports (siblings last)

Example:
```typescript
import { useState } from 'react'
import type { ReactNode } from 'react'
import { KeystoreClient } from 'keystore/KeystoreClient'
import { useKeystore } from '../contexts/KeystoreContext'
```

### Code Formatting
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Optional (project uses minimal/no semicolons)
- **Line length**: ~100 characters (no strict limit)
- **File extensions**: Include `.tsx` in imports

### React Patterns
- Use function declarations for components (not arrow functions)
- Destructure props in parameter list
- Use type annotations for useState hooks
- Custom hooks return objects with named properties
- Context providers use explicit return type annotations

Example:
```typescript
export function KeyManager() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const { client } = useKeystore()
  
  return <div>...</div>
}
```

### Error Handling
- Always annotate caught errors as `unknown`
- Log errors with `console.error()`
- Return null/empty values on failure for async functions
- Use try-catch for all async operations

Example:
```typescript
try {
  const result = await fetchData()
  return result
} catch (e: unknown) {
  console.error('Failed to fetch:', e)
  return null
}
```

### Type Definitions
- Define types inline for simple objects
- Export types used across modules
- Use discriminated unions for status states
- Prefer interface for object types with methods

Example:
```typescript
export type userInfo = {
  accessJwt: string
  handle: string
  did: string
}

export interface KeystoreContextType {
  client: KeystoreClient | null
  connected: boolean
}
```

### Module Federation
- Remote modules expose `./logic`, `./constants`, and `./ComponentName`
- Type declarations go in `src/remotes.d.ts`
- Always share `@ckb-ccc/ccc` and `web5-api` dependencies

### ESLint Rules
- TypeScript strict rules enabled
- React Hooks rules enforced
- React Refresh for Vite HMR
- No unused locals/parameters

## Project Structure

```
apps/
  console/      # Host application (ports: 3000)
  keystore/     # Wallet provider (ports: 3001)
  did/          # DID module (ports: 3002)
  pds/          # PDS module (ports: 3003)
```

Each app:
- `src/` - Source code
- `eslint.config.js` - ESLint configuration
- `vite.config.ts` - Vite + Federation config
- `tsconfig.app.json` - TypeScript config
