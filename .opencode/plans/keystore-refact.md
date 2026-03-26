# Keystore 通信方案

## 最终方案：新标签页 + postMessage

### 架构
- **Keystore 主页面** (`index.html`)：作为全功能的密钥管理界面，持续运行
- **通信方式**：`window.open()` 打开新标签页 + `postMessage` 跨标签页通信
- **安全验证**：通过白名单验证调用来源

### 工作流程

```
┌─────────────────┐     window.open()      ┌─────────────────┐
│   App (Console) │ ─────────────────────► │  Keystore 页面  │
│  localhost:3000 │                        │  localhost:3001 │
└─────────────────┘                        └─────────────────┘
         │                                            │
         │  postMessage({                             │  处理请求
         │    source: 'keystore-client',              │  (访问 localStorage)
         │    type: 'signMessage',                    │
         │    ...                                     │
         │  })                                       │
         │ ─────────────────────────────────────────►│
         │                                            │
         │  postMessage({                             │
         │    source: 'keystore-auth',                │
         │    ok: true,                               │
         │    signature: '...'                        │
         │  })                                       │
         │ ◄─────────────────────────────────────────│
         │                                            │
```

### 优点
1. **绕过 Storage Partitioning**：Keystore 页面直接访问 localStorage，不受第三方存储分区限制
2. **用户体验**：用户可以在 keystore 页面进行完整的密钥管理操作
3. **功能完整**：支持所有密钥操作（创建、导入、签名、验证等）
4. **静态提示**：顶部显示简单提示，告知用户不要关闭页面

### 缺点
1. **多应用不共享**：每个应用打开自己的 keystore 标签页（浏览器安全限制）
2. **用户需手动管理**：用户需要自己判断何时关闭 keystore 页面

---

## 尝试过的其他方案

### 方案 1：iframe + postMessage
**尝试结果**：❌ 失败

```
App ── iframe ──► Bridge.html ── localStorage
```

**问题**：
- iframe 中的第三方 localStorage 被 Storage Partitioning 阻止
- 即使同域名，跨 iframe 的存储访问也被限制

### 方案 2：OAuth 风格重定向
**尝试结果**：❌ 放弃

```
App ──► Keystore/auth ──► 重定向回 App
```

**问题**：
- 每次操作都要重定向，用户体验差
- 页面跳转导致上下文丢失
- 复杂的 URL 参数传递

### 方案 3：Popup 窗口 + window.opener.postMessage
**尝试结果**：❌ 放弃

**问题**：
- 浏览器会拦截弹窗
- 弹窗大小/位置每次不同，窗口无法复用
- 用户体验不佳

### 方案 4：共享窗口（window.open(name)）
**尝试结果**：❌ 浏览器不支持

**尝试方式**：
- 使用 `window.open(url, 'shared-name')`
- 期望浏览器复用同名窗口

**问题**：
- URL query 参数不同导致无法复用
- 移除 query 参数后仍然无法可靠复用
- 浏览器对 `window.open` 的行为不一致
- 跨域限制导致无法检测窗口是否已存在

### 方案 5：心跳检测父窗口
**尝试结果**：❌ 跨域限制

**尝试方式**：
- 轮询检查 `window.opener.closed`
- 父窗口关闭时更新提示状态

**问题**：
- 跨域访问 `window.opener.closed` 被浏览器阻止
- 无法可靠检测父窗口状态

---

## 技术细节

### 已删除的文件
- `auth.html` / `auth.ts` - 不再需要的授权页面
- `bridge.html` / `bridge.ts` - 不再需要的桥接页面

### 简化的代码
- `KeystoreClient.ts` - 移除共享窗口管理逻辑
- `useClientConnection.ts` - 移除复杂的状态管理
- `constants.ts` - 只保留 `KEY_STORE_URL`

### 安全考虑
- 使用白名单验证调用来源
- 通过 postMessage 的 `targetOrigin` 限制消息发送目标
- 验证消息来源防止 XSS

---

## 结论

当前方案是经过多次尝试后，在浏览器安全限制下的**最优可行方案**：

1. **可靠性**：100% 可靠，不受 Storage Partitioning 影响
2. **功能性**：完整支持所有密钥操作
3. **用户体验**：虽然不是最完美，但可接受
4. **代码简洁**：移除了复杂的共享逻辑，代码更易维护

**未来可能的改进**：
- 使用 Chrome Extension 作为密钥管理器（绕过浏览器限制）
- 使用原生应用作为密钥存储后端
- 等待浏览器 Storage Access API 的更广泛支持
