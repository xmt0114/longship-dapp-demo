# longship-dapp-demo

## 启动

```
  npm install
  npm run dev
```

## SDK 使用示例

### 初始化
```
const longshipWallet = new LongshipSDK();
```

### 连接钱包
```
const account = await longshipWallet.login();
const { email, wallet_address } = account;
console.log('account', email, wallet_address);
```

### SignMessage和验签

#### 签名
```
try {
  const message = 'hello world';
  const sig = await longshipWallet.signMessage(message);
  console.log('sig', sig);
} catch (e) {
  console.log('sign error', e);
}
```
#### 验签
```
const result = await longshipWallet.isValidSignature(message, sig);
if (result) {
  console.log('verify signature success');
} else {
  console.log('verify signature failed');
}
```

## Paymaster
![流程图](./paymaster.png)

当前项目在本地启动时使用paymaster有跨域问题，可前往[线上demo](https://wallet-demo.blockservice.io/dapp-demo)体验
