import { ethers } from "ethers";
import { paymaster, AddressZero } from "./config";
import PaymasterAbi from '@/contract/abi/Paymaster.json';

const privateKey = '0x025877bbd1c534975e728255e3223a28cc239269f39831799755f62b824669c7';

// mock server's signature
export async function getServerSignature(op: any) {
  const provider = new ethers.providers.JsonRpcProvider('https://wallet-demo.blockservice.io/rpc/testnet');
  const contract = new ethers.Contract(paymaster.address, PaymasterAbi, provider);

  const hash = await contract.getHash(op, paymaster.validUntil, paymaster.validAfter);
  console.log("hash", hash);

  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(ethers.utils.arrayify(hash));

  return signature;
}

export function getPaymasterAndData(
  address: string = AddressZero,
  validUntil: number = 0,
  validAfter: number = 0,
  signature?: string
): string {
  const abiCoder = ethers.utils.defaultAbiCoder;
  const encodeResult = abiCoder.encode(
    ["uint48", "uint48"],
    [validUntil, validAfter]
  );

  const paymasterAndData = ethers.utils.hexConcat([
    ethers.utils.arrayify(address),
    ethers.utils.arrayify(encodeResult),
    signature || "0x" + "00".repeat(65),
  ]);
  return paymasterAndData;
}
