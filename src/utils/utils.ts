import { ethers } from "ethers";
import ERC721ABI from "@/contract/abi/ERC721.json";
import ERC1155ABI from "@/contract/abi/ERC1155.json";
import { token, EOA } from "../config";

const ethersProvider = new ethers.providers.JsonRpcProvider('https://api-wallet-demo.blockservice.io/rpc/testnet');

export function showOmitAccount(account: string) {
  return account
    ? account.slice(0, 6) +
        "..." +
        account.slice(account.length - 4, account.length)
    : "";
}

export async function searchERC721TokenId() {
  const erc721 = new ethers.Contract(
    token.ERC721Address,
    ERC721ABI,
    ethersProvider
  );
  for (let i = 1; i <= 100; i++) {
    const res = await erc721.ownerOf(i);
    if (res === EOA.address) {
      return i;
    }
  }
  return false;
}
export async function searchERC1155TokenId() {
  const erc1155 = new ethers.Contract(
    token.ERC1155Address,
    ERC1155ABI,
    ethersProvider
  );
  for (let i = 1; i <= 100; i++) {
    const res = await erc1155.balanceOf(EOA.address, i);
    if (res > 0) {
      return i;
    }
  }
  return false;
}
