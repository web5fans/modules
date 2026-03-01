# web5 cli
console应用的cli版本。
可以通过命令行与web5应用交互。

目的是验证web5 cli + skills架构是否可以代替传统的web架构。
让用户仅通过跟AI Agent对话就能完成web5相关的操作（注册，登录，读取内容，发布内容等）。

这种架构的好处是可以借助AI Agent的能力，形成一种柔性架构，灵活性和容错性都大大增加。
对话界面看似没有传统web界面直观，但是可能会更符合非技术人员的习惯。

## 技术选型
web5部分操作需要用到ckb钱包。

为了彻底cli化，需要集成一个简单的命令行版本的钱包。
这部分暂时先直接用ccc封装一下，私钥也直接明文存在配置文件里。

因此，本项目只是为了技术验证，安全，隐私等方面没有太多考虑。
切勿用于生产环境。

为了便于AI Agent理解，所有输出都统一json格式。

尽量复用已有的代码，只是提供一个cli界面，方便后期代码维护。

## 子命令

### keystore

简单起见，keystore只保存一个keypair
私钥明文存在 ~/.web5-cli/signkey 中

#### 创建新的keypair
```bash
web5-cli keystore new
```
输出: 
1. 正常返回 did:key:zQ3shfUziAxyEvv4ZTL1E8PTwV91GxygvE7nutD1yrQ6Keeqx
2. 如果已经存在keypair，则返回报错


#### 导入已有的private key
```bash
web5-cli keystore import --sk 0x1875648040911feb3d62828fdaa0057f1c16923ba58df713fd8849f2314ba09f
```
输出:
1. 正常返回 did:key:zQ3shfUziAxyEvv4ZTL1E8PTwV91GxygvE7nutD1yrQ6Keeqx
2. 如果已经存在keypair，则返回报错

#### 删除keypair
```bash
web5-cli keystore clean
```
输出:
1. 成功 or 失败

#### 获取did key
```bash
web5-cli keystore get
```
输出: 
1. 正常返回 did:key:zQ3shfUziAxyEvv4ZTL1E8PTwV91GxygvE7nutD1yrQ6Keeqx
2. 如果没有keypair，则返回报错

#### 签名
message要转化为二进制，以hex string的形式传递参数。
```bash
web5-cli keystore sign --message 0x3435
```
输出: 
1. 正常返回签名(十六进制字符串), 例如0xd88c639bf3c6543da2d9c03578adc84105d2f43204d9afe1999ffa0d4ba51b61750df05f1b2fd7d7baf735c02d9f3e2e84a083aa7ee1a1df8ff509c5d27788a7
2. 如果没有keypair，则返回报错

#### 验签
```bash
web5-cli keystore verify --message 0x3435 --signature 0xd88c639bf3c6543da2d9c03578adc84105d2f43204d9afe1999ffa0d4ba51b61750df05f1b2fd7d7baf735c02d9f3e2e84a083aa7ee1a1df8ff509c5d27788a7
```
输出: 
1. 有效 or 无效

### wallet
ckb钱包
简单起见，wallet只保存一个ckb账号
私钥明文存在 ~/.web5-cli/ckb-sk 中

通过环境变量 CKB_NETWORK（ckb_testnet/ckb） 来选择是主网还是测试网，默认是测试网。

#### 创建新的账户
```bash
web5-cli wallet new
```
输出: 
1. 正常返回 ckb地址
2. 如果已经存在账户，则返回报错

#### 导入已有的private key
```bash
web5-cli wallet import --sk 0x88179b7e387921a193f459859d8ff461e973a93a449b4930179928dbc53a04ba
```
输出:
1. 正常返回ckb地址 ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwu8lmjcalepgp5k6d4j0mtxwww68v9m6qz0q8ah
2. 如果已经存在账户，则返回报错

#### 删除账户
```bash
web5-cli wallet clean
```
输出:
1. 成功 or 失败

#### 获取ckb地址
```bash
web5-cli wallet get
```
输出: 
1. 正常返回 ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwu8lmjcalepgp5k6d4j0mtxwww68v9m6qz0q8ah
2. 如果已经存在账户，则返回报错

#### 发送交易
```bash
web5-cli wallet send-tx --tx-path ./tx.json
```
输出: 
1. 正常返回tx hash，例如 0x1d539fb1ead0046991f93d0722bef560bd71a59930cb1bc8c54bc12986439b8d
2. 如果报错，则返回错误信息

#### 检查交易状态
```bash
web5-cli wallet check-tx --tx-hash 0x1d539fb1ead0046991f93d0722bef560bd71a59930cb1bc8c54bc12986439b8d
```
输出: 
1. 正常返回交易状态：
```
export type TransactionStatus =
  | "sent"
  | "pending"
  | "proposed"
  | "committed"
  | "unknown"
  | "rejected";
```
2. 如果报错，则返回错误信息

#### 查询账户余额
```bash
web5-cli wallet balance
```
输出: 
1. 账户余额 100.01 单位ckb
2. 如果报错，则返回错误信息

### did
按照目前的设计，一个钱包地址只能创建一个did

#### 构建did创建交易
```bash
web5-cli did build-create-tx --username david --pds web5.bbsfans.dev --didkey did:key:zQ3shfUziAxyEvv4ZTL1E8PTwV91GxygvE7nutD1yrQ6Keeqx --output-path ./create-tx.json
```
输出: 
1. 成功
2. 失败返回报错信息（没有wallet账户，账号余额不足等）

#### 构建销毁did交易
```bash
web5-cli did build-destory-tx --args 0x3d1683dba9efe420be199c052be4129f24b05cae --output-path ./destory-tx.json
```
输出: 
1. 成功
2. 失败返回报错信息（没有wallet账户等）

#### 构建更新did中didkey交易
```bash
web5-cli did build-update-didkey-tx --args 0x3d1683dba9efe420be199c052be4129f24b05cae --new-didkey did:key:zQ3shfUziAxyEvv4ZTL1E8PTwV91GxygvE7nutD1yrQ6Keeqx --output-path ./update-didkey-tx.json
```
输出: 
1. 成功
2. 失败返回报错信息（没有wallet账户，余额不足等）

#### 构建更新did中handle交易
```bash
web5-cli did build-update-handle-tx --args 0x3d1683dba9efe420be199c052be4129f24b05cae --new-handle david1.web5.bbsfans.dev --output-path ./update-handle-tx.json
```
输出: 
1. 成功
2. 失败返回报错信息（没有wallet账户，余额不足等）

#### 构建转移did交易
```bash
web5-cli did build-transfer-tx --args 0x3d1683dba9efe420be199c052be4129f24b05cae --receiver ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwu8lmjcalepgp5k6d4j0mtxwww68v9m6qz0q8ah --output-path ./update-handle-tx.json
```
输出: 
1. 成功
2. 失败返回报错信息（没有wallet账户，余额不足等）

#### 查询某个ckb地址下的did cells列表
```bash
web5-cli did list --ckb-addr ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwu8lmjcalepgp5k6d4j0mtxwww68v9m6qz0q8ah
```
输出: 
1. 成功:didCkbCellInfo列表
```
export interface didCkbCellInfo {
  txHash: string;
  index: number;
  args: string;
  capacity: string;
  did: string;
  didMetadata: string;
}
```
2. 失败返回报错信息

### pds
与pds服务器交互

#### 检查用户名是否合法
```bash
web5-cli pds check-username --username david
```
输出: 
1. 合法 or 非法

#### 根据用户名获取did
```bash
web5-cli pds get-did-by-username --username david
```
输出: 
1. 正常: did:ckb:hulihw5j57scbpqztqcsxzast4slaxfo
2. 用户不存在时返回空字符串
3. 报错返回错误码

#### 在指定pds上创建账户
```bash
web5-cli pds create-account --pds web5.bbsfans.dev --username david --didkey did:key:zQ3shfUziAxyEvv4ZTL1E8PTwV91GxygvE7nutD1yrQ6Keeqx --did did:ckb:hulihw5j57scbpqztqcsxzast4slaxfo --ckb-address ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwu8lmjcalepgp5k6d4j0mtxwww68v9m6qz0q8ah 
```
输出: 
1. 正常返回userInfo
```
export type userInfo = {
    accessJwt: string;
    refreshJwt: string;
    handle: string;
    /** The DID of the new account. */
    did: string;
}
```
2. 报错返回错误码

#### 在指定pds上删除账户
```bash
web5-cli pds delete-account --pds web5.bbsfans.dev --didkey did:key:zQ3shfUziAxyEvv4ZTL1E8PTwV91GxygvE7nutD1yrQ6Keeqx --did did:ckb:hulihw5j57scbpqztqcsxzast4slaxfo --ckb-address ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwu8lmjcalepgp5k6d4j0mtxwww68v9m6qz0q8ah 
```
输出: 
1. true false or null（未知错误）

#### 在pds上登录账户
```bash
web5-cli pds login --pds web5.bbsfans.dev --didkey did:key:zQ3shfUziAxyEvv4ZTL1E8PTwV91GxygvE7nutD1yrQ6Keeqx --did did:ckb:hulihw5j57scbpqztqcsxzast4slaxfo --ckb-address ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwu8lmjcalepgp5k6d4j0mtxwww68v9m6qz0q8ah 
```
输出: 
1. 正常返回sessionInfo
```
export type sessionInfo = {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
  didMetadata: string;
}
```
2. 返回错误

#### 向pds写入数据
需要先登录
```bash
web5-cli pds write --pds web5.bbsfans.dev --accessJwt eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJpYXQiOjE3NzIzNjY4NTcsImV4cCI6MTc3MjM3NDA1NywibmJmIjoxNzcyMzY2ODU3LCJzdWIiOiJkaWQ6Y2tiOnhkaWY2eXhrN3YzN3VzZmR1NHhocGFjb3V0enIybWxzIiwiYXVkIjoiZGlkOndlYjp3ZWI1LmJic2ZhbnMuZGV2Iiwic2NvcGUiOiJjb20uYXRwcm90by5hY2Nlc3MifQ.wJuJ9Q4HV7ooUKCr82rKUi4iJNSc5VrElEJM7Z17yv14VINwtpysWJgr-UyU-mX0RGVDAYzvfPFB27d6fv3kSg --didkey did:key:zQ3shQmJ8bD79MGya89W1gdtWfHtohXKrrdxd3CEXQyJnzQmW --did did:ckb:xdif6yxk7v37usfdu4xhpacoutzr2mls --rkey self --data '{"$type": "app.actor.profile",  "description": "test", "displayName": "david2", "handle": "david2.web5.bbsfans.dev" }'
```
输出: 
1. true false or null（未知错误）

#### 查询用户的repo信息
```bash
web5-cli pds repo --pds web5.bbsfans.dev --did did:ckb:hulihw5j57scbpqztqcsxzast4slaxfo
```
输出：
1. 正常返回 RepoInfo
```
export type RepoInfo = {
  handle: string;
  did: string;
  didDoc: {
    verificationMethods: Record<string, string>;
    alsoKnownAs: string[];
    services: Record<string, {
      type: string;
      endpoint: string;
    }>;
  };
  collections: string[];
  handleIsCorrect: boolean;
};
```
2. 报错返回错误信息

#### 查询用户的records信息
```bash
web5-cli pds records --pds web5.bbsfans.dev --did did:ckb:hulihw5j57scbpqztqcsxzast4slaxfo --collection app.actor.profile --limit 20 --cursor 3ltlqcmqdk225
```
其中 limit 和 cursor 为可选参数
输出：
1. 正常返回RepoRecords
```
export type RepoRecords = {
  cursor?: string;
  records: {
    uri: string;
    cid: string;
    value: Record<string, any>;
  }[];
};
```
2. 出错返回错误信息

#### 查询用户的blobs信息
```bash
web5-cli pds blobs --pds web5.bbsfans.dev --did did:ckb:hulihw5j57scbpqztqcsxzast4slaxfo --limit 20 --cursor 3ltlqcmqdk225
```
其中 limit 和 cursor 为可选参数
输出：
1. 正常返回RepoRecords
```
export type RepoRecords = {
  cursor?: string;
  records: {
    uri: string;
    cid: string;
    value: Record<string, any>;
  }[];
};
```
2. 出错返回错误信息

#### 导出用户数据
```bash
web5-cli pds export --pds web5.bbsfans.dev --did did:ckb:hulihw5j57scbpqztqcsxzast4slaxfo --since bafyreiaoy4e5d4rhkagogxwmi7hg2fpft6u3buc7tmidmt3ry4eqdut2di --data-file ./backup.car
```
其中 since 为可选参数
输出：
1. 成功或失败

#### 导入用户数据
```bash
web5-cli pds import --pds web5.bbsfans.dev --did did:ckb:hulihw5j57scbpqztqcsxzast4slaxfo --accessJwt "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJpYXQiOjE3NzIzNTIyNDcsImV4cCI6MTc3MjM1OTQ0NywibmJmIjoxNzcyMzUyMjQ3LCJzdWIiOiJkaWQ6Y2tiOmh1bGlodzVqNTdzY2JwcXp0cWNzeHphc3Q0c2xheGZvIiwiYXVkIjoiZGlkOndlYjp3ZWI1LmJic2ZhbnMuZGV2Iiwic2NvcGUiOiJjb20uYXRwcm90by5hY2Nlc3MifQ.pv6vNFzhjhiNaSjhMe_op1yQep1ytkrpdp3kAvFUgkdxnjdhDHh6coopXKu9IUdoa3hDKS_PvlPKBBkVUHuRXw" --data-file ./backup.car
```
输出：
1. 成功或失败

