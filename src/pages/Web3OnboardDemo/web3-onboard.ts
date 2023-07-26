import longshipModule from '@traitsniper/web3-onboard';
import { init } from "@web3-onboard/react";
import injectedModule from "@web3-onboard/injected-wallets";

export function getLongshipModule(option?: any) {
  return longshipModule({
    appKey: '2462e054-4233-4ca1-bd79-be9512fc27b9', // 必填，用于区分不同dapp
    env: window.origin.includes('traitsniper') ? 'prod' : 'test', // 必填 test|prod
    chainType: window.origin.includes('traitsniper') ? 'bsc' : 'testnet', // 必填，env为test支持bsc、testnet, env为prod支持bsc
    connectType: 'twitter', // 选填， 用于连接时直接通过Twitter登陆
    // 选填，用于信息展示
    appSetting: {
      appName: 'traitsniper',
      appIcon: 'https://wallet-demo.blockservice.io/static/img/coins/128x128/ETH.png'
    },
    ...option
  });
}

const longship = getLongshipModule();

export const injected = injectedModule();

export default init({
  wallets: [injected, longship],
  chains: [
    {
      id: '0x2537', // 9527
      // token: "ETH",
      // label: "Ethereum Testnet",
    },
    {
      id: '0x61', // 97
    }
  ],
  appMetadata: {
    name: 'Web3-Onboard Demo',
    icon: '<svg>App Icon</svg>',
    description: 'A demo of Web3-Onboard.'
  }
});
