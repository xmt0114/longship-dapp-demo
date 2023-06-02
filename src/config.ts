import { MessageTypes, TypedMessage } from "@/longship-wallet-core/src/types";

export const eip712DemoData: TypedMessage<MessageTypes> = {
  domain: {
    chainId: 9527,
    name: "Ether Mail",
    verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
    version: "1",
  },
  message: {
    contents: "Hello, Bob!",
    from: {
      name: "Cow",
      wallets: [
        "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        "0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF",
      ],
    },
    to: [
      {
        name: "Bob",
        wallets: [
          "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
          "0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57",
          "0xB0B0b0b0b0b0B000000000000000000000000000",
        ],
      },
    ],
  },
  primaryType: "Mail",
  types: {
    // EIP712Domain: [
    //   { name: "name", type: "string" },
    //   { name: "version", type: "string" },
    //   { name: "chainId", type: "uint256" },
    //   { name: "verifyingContract", type: "address" },
    // ],
    // Group: [
    //   { name: "name", type: "string" },
    //   { name: "members", type: "Person[]" },
    // ],
    Mail: [
      { name: "from", type: "Person" },
      { name: "to", type: "Person[]" },
      { name: "contents", type: "string" },
    ],
    Person: [
      { name: "name", type: "string" },
      { name: "wallets", type: "address[]" },
    ],
  },
};
export const CHAIN_CONFIGS = {
  intranet: {
    name: 'Intranet',
    rpc: "http://192.168.8.89:9545",
    nativeToken: "ETH",
    usdmc: {
      contract: "0xeB6F84D5695792b2637E7B37957B40F7479cF653",
      decimals: 6,
    },
  },
  out: {
    name: 'Out',
    rpc: "https://wallet-demo.blockservice.io/rpc/testnet",
    nativeToken: "ETH",
    usdmc: {
      contract: "0xcf5193b77e2872e71b9f9cfa9014c2f1d81d6473",
      decimals: 6,
    },
  }
}

export const paymaster = {
  address: "0x8ac2d44F2A66c1d354c025fFc71c277F30a88aA3",
  validUntil: 0,
  validAfter: 0,
}

export const token = {
  USDMCToken: {
    address: '0x21A2A9Fc5aFEdC8Ed70A071efF25CB6f5A93a412',
    decimal: 6
  },
  ERC721Address: '0x06694bA4D176696342595a3Be8008B244e55c461',
  ERC1155Address: '0x5926b9C2fD0c1b8336DA9a613ebB34581281b269',
}

export const EOA = {
  address: '0xfb299eCe9215807944287068Cb7fa443f496b26F',
  privateKey: '0x025877bbd1c534975e728255e3223a28cc239269f39831799755f62b824669c7',
}

export const AddressZero = '0x0000000000000000000000000000000000000000';
