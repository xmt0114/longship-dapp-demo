import { defineConfig } from "umi";

export default defineConfig({
  routes: [
    { path: "/", component: "index" },
    {
      path: "/web3React",
      component: "Web3ReactDappDemo",
    },
  ],
  npmClient: 'npm',
  hash: true,
  base: '/dapp',
  publicPath: '/dapp/',
  esbuildMinifyIIFE: true,
});
