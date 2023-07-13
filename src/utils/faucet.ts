import { ethers } from "ethers";
import ERC20 from "@/contract/abi/ERC20.json";
import ERC721 from "@/contract/abi/ERC721.json";
import ERC1155 from "@/contract/abi/ERC1155.json";
import { EOA } from "@/config";

export function getSigner(provider: ethers.providers.Provider) {
    return new ethers.Wallet(EOA.privateKey, provider);
}

export async function transferERC20(
  contractAddress: string,
  to: string,
  amount: number | string,
  provider: ethers.providers.Provider
) {
  const signer = getSigner(provider);
  const contract = new ethers.Contract(contractAddress, ERC20, signer);
  const decimals = await contract.decimals();
  const parseAmount = ethers.utils.parseUnits(amount.toString(), decimals);
  return contract.transfer(to, parseAmount);
}

async function searchERC721TokenId(
  contractAddress: string,
  provider: ethers.providers.Provider
) {
  const erc721 = new ethers.Contract(contractAddress, ERC721, provider);
  for (let i = 1; i <= 100; i++) {
    const res = await erc721.ownerOf(i);
      if (res === EOA.address) {
      return i;
    }
  }
  return false;
}

async function searchERC1155TokenId(
  contractAddress: string,
  provider: ethers.providers.Provider
) {
  const erc1155 = new ethers.Contract(contractAddress, ERC1155, provider);
  for (let i = 1; i <= 100; i++) {
      const res = await erc1155.balanceOf(EOA.address, i);
    if (res > 0) {
      return i;
    }
  }
  return false;
}

export async function transferERC721(
    contractAddress: string,
    to: string,
    provider: ethers.providers.Provider
) {
  const signer = getSigner(provider);
  const contract = new ethers.Contract(contractAddress, ERC721, signer);
  const tokenId = await searchERC721TokenId(contractAddress, provider);
  if (!tokenId) {
      throw new Error("master account balance not enough");
  }
  return contract.transferFrom(signer.address, to, tokenId);
}

export async function transferERC1155(
    contractAddress: string,
    to: string,
    provider: ethers.providers.Provider
) {
  const signer = getSigner(provider);
  const contract = new ethers.Contract(contractAddress, ERC1155, signer);
  const tokenId = await searchERC1155TokenId(contractAddress, provider);
  if (!tokenId) {
      throw new Error("master account balance not enough");
  }
    return contract.safeTransferFrom(signer.address, to, tokenId, 1, "0x");
}
