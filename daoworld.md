# daoworld
定位是web5用户入口。console应用的用户易用版本。

## 功能和页面设计
使用 shadcn/ui 库，整体风格会更加统一。

### 用户注册
用户没有注册过账户的话，可以在这里注册。注册步骤包括：
1. 如果keystore中没有sign key，提醒用户创建或者导入sign key
2. 让用户选择pds（可选：web5.bbsfans.dev/web5.ccfdao.dev/web5.group）
3. 让用户选择自己的用户名，检查其格式是否合法以及该用户名在pds上是否可用
4. 提醒用户连接ckb钱包
5. 构造交易并发送上链
6. 等待交易上链完成后，在pds上注册账号

注册完成后把一些关键内容（didkey，did，metadata，username，pds，ckb wallet address等）存到local storage里。
下次用户进来直接就进入登录状态。

用户进入登录状态后，会有两个页面（需要导航栏），默认展示的是web5应用

### web5应用
展示一个类似app store, 每个web5应用一个图标，点击可以在新窗口打开

### 用户设置
用户设置页面分两个tab页。
1. 默认tab展示用户数据（对应consol中的browser）
2. 一个tab是管理操作（需要用户连ckb钱包）。
    - update signkey
    - modify displayname in profile。
    - 备份数据。（暂时只做导出，不做导入，导入类似git push -f有危险）