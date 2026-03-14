# Deployment Guide (Vercel)

This project is a Monorepo containing multiple applications that need to be deployed separately but work together via Module Federation.

## 1. Project Structure & Domains

We recommend deploying each app as a separate project in Vercel.

| App | Path | Recommended Domain | Environment Variables |
| :--- | :--- | :--- | :--- |
| **Keystore** | `apps/keystore` | `keystore.web5.fans` | `VITE_KEYSTORE_URL` |
| **Console** | `apps/console` | `console.web5.fans` | `VITE_DID_MODULE_URL`, `VITE_PDS_MODULE_URL`, `VITE_KEYSTORE_MODULE_URL` |
| **DID Module** | `apps/did` | `did-module.web5.fans` | None |
| **PDS Module** | `apps/pds` | `pds-module.web5.fans` | None |
| **Porta;** | `apps/portal` | `me.web5.fans` | `VITE_DID_MODULE_URL`, `VITE_PDS_MODULE_URL`, `VITE_KEYSTORE_MODULE_URL` |

## 2. Deployment Steps

### Step 1: Deploy Remote Modules DID

Since Console depends on these, deploy them first.

1.  **Import Project** in Vercel.
2.  Select the **Monorepo Root**.
3.  **Project Name**: `modules-did` (or similar).
4.  **Framework Preset**: Vite.
5.  **Root Directory**: Click "Edit" and select `apps/did`.
6.  **Build Command**: `cd ../.. && npx turbo run build --filter=@web5-modules/did` (or rely on default if Vercel detects it correctly).
7.   Ensure `Output Directory` is `dist`.
8.  **Install Command**: `npm install`
9.  **Deploy**.
10. **Assign Domain**: Go to Settings -> Domains and assign `did-module.web5.fans`.

### Step 2: Deploy PDS Module

1.  **Import Project** -> Root Directory: `apps/pds`.
2.  **Project Name**: `modules-pds` (or similar).
3.  **Framework Preset**: Vite.
4.  **Build Command**: `cd ../.. && npx turbo run build --filter=@web5-modules/pds` (or rely on default if Vercel detects it correctly).
5.  **Install Command**: `npm install`
6. **Environment Variables**:
    *   `VITE_KEYSTORE_MODULE_URL`: `https://keystore.web5.fans/assets/remoteEntry.js`
7.  **Deploy**.
8.  **Assign Domain**: Go to Settings -> Domains and assign `pds-module.web5.fans`.

### Step 3: Deploy Keystore

1.  **Import Project** -> Root Directory: `apps/keystore`.
3.  **Project Name**: `modules-keystore` (or similar).
4.  **Build Command**: `cd ../.. && npx turbo run build --filter=@web5-modules/keystore` (or rely on default if Vercel detects it correctly).
5.  **Install Command**: `npm install`
6. **Environment Variables**:
    *   `VITE_KEYSTORE_URL`: `https://keystore.web5.fans` (Your actual production domain).
7.  **Deploy**.
8.  **Assign Domain**: Go to Settings -> Domains and assign `keystore.web5.fans`.

### Step 4: Deploy Console

1.  **Import Project** -> Root Directory: `apps/console`.
2.  **Project Name**: `modules-console`.
3.  **Build Command**: `cd ../.. && npx turbo run build --filter=@web5-modules/console` (or rely on default if Vercel detects it correctly).
4.  **Install Command**: `npm install`
5. **Environment Variables**:
    *   `VITE_DID_MODULE_URL`: `https://did-module.web5.fans/assets/remoteEntry.js`
    *   `VITE_PDS_MODULE_URL`: `https://pds-module.web5.fans/assets/remoteEntry.js`
    *   `VITE_KEYSTORE_MODULE_URL`: `https://keystore.web5.fans/assets/remoteEntry.js`
6.  **Deploy**.
7.  **Assign Domain**: Go to Settings -> Domains and assign `console.web5.fans`.

### Step 5: Deploy Portal

1.  **Import Project** -> Root Directory: `apps/portal`.
2.  **Project Name**: `modules-portal`.
3.  **Build Command**: `cd ../.. && npx turbo run build --filter=@web5-modules/portal` (or rely on default if Vercel detects it correctly).
4.  **Install Command**: `npm install`
5. **Environment Variables**:
    *   `VITE_DID_MODULE_URL`: `https://did-module.web5.fans/assets/remoteEntry.js`
    *   `VITE_PDS_MODULE_URL`: `https://pds-module.web5.fans/assets/remoteEntry.js`
    *   `VITE_KEYSTORE_MODULE_URL`: `https://keystore.web5.fans/assets/remoteEntry.js`
6.  **Deploy**.
7.  **Assign Domain**: Go to Settings -> Domains and assign `me.web5.fans`.

## 3. Preview Deployments (Bugfix / Feature Branches)

Vercel automatically creates preview deployments for Pull Requests. To ensure the Preview Console connects to the Preview Remotes, you have two options:

### Option A: Cross-Project Env Vars (Advanced)
Use Vercel System Environment Variables to dynamically construct the URL.
*   Set `DID_MODULE_URL` to `https://web5-did-git-<branch>-<team>.vercel.app/assets/remoteEntry.js`.

### Option B: Stable Remotes (Simpler)
By default, your Preview Console will connect to **Production Remotes** (defined in your Env Vars). This is usually fine unless your changes involve breaking changes to the Remote interface.

If you need to test a change in `did` module on Console:
1.  Deploy the `did` module branch first.
2.  Manually update the `DID_MODULE_URL` variable in the Console's Vercel Preview deployment settings, or hardcode it temporarily in `vite.config.ts` for the PR.
