# Web5 Modules

[English](#english) | [中文](#中文)

---

<a id="english"></a>

## English

### Overview

Web5 Modules is a monorepo of reusable micro-app modules for building Web5 applications. Unlike traditional Web2 apps where one frontend talks to a fixed backend, Web5 apps must resolve each user's Personal Data Server (PDS) dynamically based on their DID — making frontends significantly more complex.

This project extracts common Web5 capabilities — key management, DID operations, PDS interaction — into independent, standards-compliant modules. Each module runs as a standalone micro-app via **Module Federation**, loaded at runtime by any Web5 host application.

### Architecture

```
┌─────────────────────────────────────────────────┐
│              Console (Host :3000)                │
│  Loads remotes at runtime via Module Federation  │
├────────────┬───────────────┬────────────────────┤
│ DID Module │  PDS Module   │  Keystore Module   │
│   (:3002)  │   (:3003)     │     (:3001)        │
│  remote    │  remote       │  remote + iframe   │
└────────────┴───────┬───────┴─────────┬──────────┘
                     │                 │
              ┌──────┴──────┐   ┌──────┴──────┐
              │  web5-api   │   │ postMessage  │
              │  (ATProto)  │   │   bridge     │
              └─────────────┘   └─────────────┘
```

- **Module Federation**: Each module exposes federated entries (`remoteEntry.js`). The host loads them at runtime — no build-time coupling.
- **iframe Bridge**: Keystore runs in an isolated iframe. The host communicates with it via `postMessage`, keeping private keys sandboxed in the keystore's origin.
- **Shared Libraries**: `@ckb-ccc/ccc` and `web5-api` are declared as shared singletons to avoid duplication.

### Modules

#### `apps/keystore` — Key Management

Manages Secp256k1 signing keys (generate, import, sign, verify). Analogous to a crypto wallet but lighter — keys are stored in `localStorage` and signing does not prompt the user.

| Component | What it does |
|-----------|-------------|
| **Web UI** (`index.html`) | Visual key manager: create/import keypairs, view active key, manage origin whitelist |
| **Bridge** (`bridge.html`) | Headless iframe; handles `postMessage` requests (`getDIDKey`, `signMessage`, `verifySignature`) from whitelisted origins |
| **KeystoreClient** (federated) | TypeScript client that other modules import to talk to the bridge iframe |

**Crypto stack**: `@atproto/crypto` (Secp256k1Keypair), AES-GCM encryption for key export, PBKDF2 key derivation.

#### `apps/did` — DID Operations

Pure-logic module (no UI) for `did:ckb` identities on the Nervos CKB blockchain.

| Function | What it does |
|----------|-------------|
| `buildCreateTransaction` | Builds a CKB transaction that creates a new DID cell on-chain |
| `fetchDidCkbCellsInfo` | Queries all DID cells owned by the current signer |
| `updateDidKey` | Updates the signing key associated with a DID |
| `updateHandle` | Updates the on-chain DID document's `alsoKnownAs` (handle) and PDS service endpoint |
| `destroyDidCell` / `transferDidCell` | Removes or transfers DID ownership |

**Stack**: `@ckb-ccc/ccc` (CKB SDK), `@scure/base` (base32 encoding).

#### `apps/pds` — Personal Data Server Interaction

Pure-logic module (no UI) for ATProto PDS operations. Depends on the keystore remote for signing.

| Function | What it does |
|----------|-------------|
| `pdsCreateAccount` | Creates an account on a PDS |
| `pdsLogin` | Authenticates with a PDS using signed challenges |
| `pdsDeleteAccount` | Removes an account from a PDS |
| `writePDS` | Writes a record to the user's repo (signs the commit via keystore) |
| `fetchUserProfile` / `fetchRepoRecords` | Reads profile and repo data from any PDS |
| `exportRepoCar` / `importRepoCar` | Exports/imports full repo as CAR files |

**Stack**: `web5-api` (ATProto agent), `@atproto/repo`, `@ipld/dag-cbor`, `multiformats`.

#### `apps/console` — Demo Host Application

A full Web5 demo app that composes all three modules above. It has no business logic of its own — it exists to demonstrate module integration.

| Route | What it shows |
|-------|-------------|
| `/` | Redirects to keys page |
| `/keys` | Key management - sign message and verify signature by keypairs via keystore |
| `/dids` | DID management - create/list/destory/transfer/update DID cells on CKB blockchain |
| `/pds` | PDS management - account management and record read/write |
| `/browser` | PDS browser - browse repos and records on any PDS |
| `/relayer` | Relayer - firehose relay for ATProto events |

**Stack**: React 19, React Router, `@ckb-ccc/connector-react`, Sonner (toasts).

### Getting Started

**Prerequisites**: Node.js, pnpm >= 9.0.0

```bash
# Install dependencies
pnpm install

# Development — start all apps with hot reload
pnpm dev

# Or start a single app
pnpm dev:console    # host app at :3000
pnpm dev:keystore   # keystore at :3001
pnpm dev:did        # did module at :3002
pnpm dev:pds        # pds module at :3003

# Build all
pnpm build

# Build + preview (all modules serving, console in dev mode)
pnpm build && \
  (pnpm --filter @web5-modules/keystore preview & \
   pnpm --filter @web5-modules/did preview & \
   pnpm --filter @web5-modules/pds preview &) && \
  pnpm dev:console
```

### Contributing

#### General Workflow

1. Fork and clone the repo
2. `pnpm install` at the root
3. Create a feature branch from `main`
4. Make changes, ensure `pnpm build` passes
5. Submit a pull request

#### Per-Module Guide

| Module | How to contribute |
|--------|-------------------|
| **keystore** | UI changes go in `apps/keystore/src/` (React components). Bridge protocol changes require updating both `bridge.ts` and `KeystoreClient.ts`. Crypto functions are in `crypto.ts`. Test signing flows by running console + keystore together. |
| **did** | All logic is in `apps/did/src/logic.ts`. CKB transaction building uses `@ckb-ccc/ccc`. You need a CKB testnet wallet (via CCC connector) to test. |
| **pds** | Logic is split across `account.ts`, `records.ts`, `repo.ts`, `utils.ts` in `apps/pds/src/`. PDS operations require a running PDS instance (defaults listed in `constants.ts`). Changes to signing flow must stay compatible with keystore's bridge protocol. |
| **console** | Routes are in `apps/console/src/pages/`. Federated module types are declared in `remotes.d.ts`. When adding a new remote function, update both the type declaration and the corresponding module's `vite.config.ts` exposes. |
| **utils** | Add new utilities in `packages/utils/src/`. Export them from `index.ts`. No build step — consumers import source directly. |

#### Environment Variables

Remote URLs default to localhost but can be overridden via environment variables in each app's Vite config (e.g., `VITE_KEY_STORE_URL`, `VITE_DID_MODULE_URL`, `VITE_PDS_MODULE_URL`).

---

<a id="中文"></a>

## 中文

### 概述

Web5 Modules 是一个单仓库（monorepo）项目，提供构建 Web5 应用所需的可复用微应用模块。与传统 Web2 应用（一个前端对应固定后端）不同，Web5 应用需要根据用户的 DID 动态解析其个人数据服务器（PDS），前端逻辑因此变得非常复杂。

本项目将 Web5 的通用能力——密钥管理、DID 操作、PDS 交互——抽取为独立的、符合标准的模块。每个模块通过 **Module Federation** 作为独立微应用运行，可被任意 Web5 应用在运行时加载。

### 架构

```
┌─────────────────────────────────────────────────┐
│            Console（应用 :3000）                │
│       运行时通过 Module Federation 加载远程模块     │
├────────────┬───────────────┬────────────────────┤
│  DID 模块   │   PDS 模块    │   Keystore 模块     │
│  (:3002)   │   (:3003)     │     (:3001)        │
│   远程模块  │   远程模块     │  远程模块 + iframe   │
└────────────┴───────┬───────┴─────────┬──────────┘
                     │                 │
              ┌──────┴──────┐   ┌──────┴──────┐
              │  web5-api   │   │ postMessage │
              │  (ATProto)  │   │    桥接      │
              └─────────────┘   └─────────────┘
```

- **Module Federation**：每个模块暴露联邦入口（`remoteEntry.js`），Web5 应用在运行时加载，无需构建时耦合。
- **iframe 桥接**：Keystore 运行在隔离的 iframe 中，宿主通过 `postMessage` 与之通信，私钥始终沙箱化在 keystore 的源中。
- **共享库**：`@ckb-ccc/ccc` 和 `web5-api` 声明为共享单例，避免重复加载。

### 模块说明

#### `apps/keystore` — 密钥管理

管理 Secp256k1 签名密钥（生成、导入、签名、验证）。类似加密钱包但更轻量——密钥存储在 `localStorage` 中，签名时不会提示用户确认。

| 组件 | 功能 |
|------|------|
| **Web UI**（`index.html`） | 可视化密钥管理器：创建/导入密钥对、查看活跃密钥、管理来源白名单 |
| **桥接**（`bridge.html`） | 无界面 iframe；处理来自白名单来源的 `postMessage` 请求（`getDIDKey`、`signMessage`、`verifySignature`） |
| **KeystoreClient**（联邦导出） | TypeScript 客户端，其他模块导入后可通过它与桥接 iframe 通信 |

**加密栈**：`@atproto/crypto`（Secp256k1Keypair）、AES-GCM 加密导出、PBKDF2 密钥派生。

#### `apps/did` — DID 操作

纯逻辑模块（无 UI），用于 Nervos CKB 区块链上的 `did:ckb` 身份管理。

| 函数 | 功能 |
|------|------|
| `buildCreateTransaction` | 构建 CKB 交易，在链上创建新的 DID Cell |
| `fetchDidCkbCellsInfo` | 查询当前签名者拥有的所有 DID Cell |
| `updateDidKey` | 更新 DID 关联的签名密钥 |
| `updateHandle` | 更新链上 DID 文档中的 `alsoKnownAs`（handle）和 PDS 服务端点 |
| `destroyDidCell` / `transferDidCell` | 销毁或转移 DID 所有权 |

**技术栈**：`@ckb-ccc/ccc`（CKB SDK）、`@scure/base`（base32 编码）。

#### `apps/pds` — 个人数据服务器交互

纯逻辑模块（无UI），用于 PDS 操作。依赖 keystore 远程模块进行签名。

| 函数 | 功能 |
|------|------|
| `pdsCreateAccount` | 在 PDS 上创建账户 |
| `pdsLogin` | 使用签名挑战进行 PDS 认证 |
| `pdsDeleteAccount` | 从 PDS 删除账户 |
| `writePDS` | 向用户仓库写入记录（通过 keystore 签名提交） |
| `fetchUserProfile` / `fetchRepoRecords` | 从任意 PDS 读取用户资料和仓库数据 |
| `exportRepoCar` / `importRepoCar` | 以 CAR 文件格式导出/导入完整仓库 |

**技术栈**：`web5-api`（ATProto agent）、`@atproto/repo`、`@ipld/dag-cbor`、`multiformats`。

#### `apps/console` — 演示宿主应用

完整的 Web5 演示应用，组合以上三个模块。本身不含业务逻辑，仅用于展示模块集成。

| 路由 | 展示内容 |
|------|---------|
| `/` | 重定向到密钥管理页面 |
| `/keys` | 密钥管理 - 通过 keystore 中密钥对进行签名/验签  |
| `/dids` | DID 管理 - 在 CKB 区块链上创建/查看/销毁/转移/更新 DID |
| `/pds` | PDS 管理 - 账户管理和记录读写 |
| `/browser` | PDS 浏览器 - 浏览任意 PDS 上的仓库和记录 |
| `/relayer` | 中继 - ATProto 事件流的 firehose 中继 |

**技术栈**：React 19、React Router、`@ckb-ccc/connector-react`

### 快速开始

**前置要求**：Node.js、pnpm >= 9.0.0

```bash
# 安装依赖
pnpm install

# 开发模式 — 启动所有应用并支持热更新
pnpm dev

# 或启动单个应用
pnpm dev:console    # 宿主应用 :3000
pnpm dev:keystore   # 密钥管理 :3001
pnpm dev:did        # DID 模块 :3002
pnpm dev:pds        # PDS 模块 :3003

# 构建全部
pnpm build

# 构建 + 预览（所有模块提供服务，console 以开发模式运行）
pnpm build && \
  (pnpm --filter @web5-modules/keystore preview & \
   pnpm --filter @web5-modules/did preview & \
   pnpm --filter @web5-modules/pds preview &) && \
  pnpm dev:console
```

### 贡献指南

#### 通用流程

1. Fork 并克隆仓库
2. 在根目录执行 `pnpm install`
3. 从 `main` 创建分支
4. 进行修改，确保 `pnpm build` 通过
5. 提交PR

#### 各模块贡献指引

| 模块 | 如何贡献 |
|------|---------|
| **keystore** | UI 修改在 `apps/keystore/src/`（React 组件）。桥接协议变更需同时更新 `bridge.ts` 和 `KeystoreClient.ts`。加密函数在 `crypto.ts`。测试签名流程需同时运行 console 和 keystore。 |
| **did** | 所有逻辑在 `apps/did/src/logic.ts`。CKB 交易构建使用 `@ckb-ccc/ccc`。测试需要 CKB 测试网钱包（通过 CCC connector）。 |
| **pds** | 逻辑分布在 `apps/pds/src/` 下的 `account.ts`、`records.ts`、`repo.ts`、`utils.ts`。PDS 操作需要运行中的 PDS 实例（默认地址见 `constants.ts`）。签名流程的修改必须与 keystore 桥接协议保持兼容。 |
| **console** | 路由在 `apps/console/src/pages/`。联邦模块类型声明在 `remotes.d.ts`。添加新的远程函数时，需同时更新类型声明和对应模块 `vite.config.ts` 中的 exposes 配置。 |
| **utils** | 在 `packages/utils/src/` 中添加新工具函数，从 `index.ts` 导出。无构建步骤——消费者直接导入源码。 |

#### 环境变量

远程模块 URL 默认指向 localhost，可通过各应用 Vite 配置中的环境变量覆盖（如 `VITE_KEY_STORE_URL`、`VITE_DID_MODULE_URL`、`VITE_PDS_MODULE_URL`）。
