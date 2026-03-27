# Plan: Keystore 手动连接修改

## Goal
将 console 和 portal 应用的 keystore 连接方式从**自动打开**改为**用户手动点击 wifi 图标触发**，避免浏览器拦截弹窗。

## Problem
- 当前应用在页面加载时自动调用 `KeystoreClient.connect()`，触发 `window.open()` 打开 keystore
- 浏览器会拦截自动弹出的窗口，用户体验差
- 两个应用的 wifi 图标当前只是链接到 keystore URL，没有真正触发连接逻辑

## Solution
1. **移除自动连接**：删除 `KeystoreContext` 中的自动 `connect()` 调用
2. **暴露手动连接**：在 Context 中新增 `connect()` 函数和 `isConnecting` 状态
3. **修改 wifi 图标**：从 `<a>` 标签改为 `<button>`，点击时调用 `connect()`

## Files to Modify

### Console App
- `apps/console/src/contexts/KeystoreContext.tsx`
- `apps/console/src/Layout.tsx`

### Portal App
- `apps/portal/src/contexts/KeystoreContext.tsx`
- `apps/portal/src/Layout.tsx`

## Implementation Details

### KeystoreContext 修改要点
1. 移除 `useEffect` 中的 `c.connect()` 自动调用
2. 新增接口成员：`connect: () => Promise<void>` 和 `isConnecting: boolean`
3. 实现 `connect()` 函数：
   - 检查 `!client || isConnecting || connected`，满足任一条件则直接返回
   - 设置 `isConnecting = true`
   - 调用 `await client.connect()`
   - 成功后设置 `connected = true` 并自动获取 DID key
   - 添加 try-catch 错误处理
   - finally 中设置 `isConnecting = false`
4. 保持现有的 `disconnect()` 清理逻辑

### Layout 修改要点
1. 将 `<a href={KEY_STORE_URL}>` 改为 `<button type="button">`
2. 添加 `onClick={connect}` 处理器
3. 使用 `isConnecting` 状态禁用按钮或显示加载指示器
4. 保持原有的视觉样式和图标（Wifi/WifiOff）
5. 添加 `aria-label` 提升可访问性

## Acceptance Criteria
- [ ] Console 应用打开时不再自动弹出 keystore 窗口
- [ ] Portal 应用打开时不再自动弹出 keystore 窗口
- [ ] Console 的 wifi 图标点击后调用 connect() 并打开 keystore
- [ ] Portal 的 wifi 图标点击后调用 connect() 并打开 keystore
- [ ] 连接过程中按钮显示加载状态（禁用或 spinner）
- [ ] 连接成功后自动获取并显示 DID key
- [ ] 错误处理：连接失败时显示错误信息
- [ ] TypeScript 编译无错误
- [ ] ESLint 检查通过

## Task Breakdown

### Task 1: 修改 Console KeystoreContext
**Scope**: `apps/console/src/contexts/KeystoreContext.tsx`
**Changes**:
- 移除 useEffect 中的 `c.connect()` 调用
- 在 interface 中添加 `connect: () => Promise<void>` 和 `isConnecting: boolean`
- 添加 `isConnecting` state
- 实现 `connect` 函数，包含错误处理和 DID 自动获取
- 将 `connect` 加入 context value

**Verification**:
- `tsc --noEmit` 无错误
- 页面加载不自动打开 keystore
- `useKeystore()` 返回包含 `connect` 函数

### Task 2: 修改 Console Layout
**Scope**: `apps/console/src/Layout.tsx`
**Changes**:
- 从 `useKeystore()` 解构 `connect` 和 `isConnecting`
- 将 wifi 图标的 `<a>` 改为 `<button type="button">`
- 添加 `onClick={connect}`
- 根据 `isConnecting` 禁用按钮
- 保持原有样式（badge class）
- 添加 `aria-label`

**Verification**:
- 点击 wifi 图标触发连接
- 按钮在连接过程中禁用
- 视觉样式与之前一致

### Task 3: 修改 Portal KeystoreContext
**Scope**: `apps/portal/src/contexts/KeystoreContext.tsx`
**Changes**:
- 与 Console 相同的修改（两个文件结构几乎相同）

**Verification**:
- 同 Task 1

### Task 4: 修改 Portal Layout
**Scope**: `apps/portal/src/Layout.tsx`
**Changes**:
- 从 `useKeystore()` 解构 `connect` 和 `isConnecting`
- 将 wifi 图标的 `<a>` 改为 `<button>`
- 添加 `onClick={connect}`
- 根据 `isConnecting` 禁用按钮或显示 spinner
- 保持 shadcn/ui Badge 组件样式

**Verification**:
- 同 Task 2

### Task 5: 功能验证
**Steps**:
1. 启动 console (`pnpm dev:console`)
2. 确认页面加载时没有自动打开 keystore
3. 点击 wifi 图标，确认弹出 keystore 窗口
4. 验证连接成功后状态更新
5. 对 portal 重复步骤 1-4 (`pnpm dev:portal`)

**Verification**:
- 手动点击能正常打开 keystore（不被浏览器拦截）
- 连接流程完整工作

## Notes
- KeystoreClient 内部已有 `isConnected` 检查，可防止重复连接
- `connect()` 在失败时会 reject，需要 catch 处理
- 两个应用的 KeystoreContext 结构几乎相同，可以复制修改
- Layout 样式不同（console 使用自定义 CSS，portal 使用 shadcn/ui）
