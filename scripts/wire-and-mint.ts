import { ethers } from "hardhat";

const ONFT_BASE = "0xD4Ef4ac4759A78c8987d0D2d6dd4B884609281D5";
const ONFT_ARB = "0xEBe4C0D2F246A59E270bD06429c230aaD1B3d377";
const GALLERY = "0x0D9211F05be056E67ca6Aa0f249541F0ed09aD9F";
const BASE_EID = 40245;
const ARB_EID = 40231;

async function main() {
  const action = process.env.ACTION;
  const [signer] = await ethers.getSigners();
  console.log(`Signer: ${signer.address}\n`);

  if (action === "wire-base") {
    const onft = await ethers.getContractAt("AgentONFT721", ONFT_BASE);
    const tx = await onft.setPeer(ARB_EID, ethers.zeroPadValue(ONFT_ARB, 32));
    console.log(`setPeer on Base: ${tx.hash}`);
    await tx.wait();
    console.log("Done");

  } else if (action === "wire-arb") {
    const onft = await ethers.getContractAt("AgentONFT721", ONFT_ARB);
    const tx = await onft.setPeer(BASE_EID, ethers.zeroPadValue(ONFT_BASE, 32));
    console.log(`setPeer on Arb: ${tx.hash}`);
    await tx.wait();
    console.log("Done");

  } else if (action === "mint") {
    const onft = await ethers.getContractAt("AgentONFT721", ONFT_BASE);
    const nfts = [
      "ipfs://QmGenesis-Fragment-0",
      "ipfs://QmQuantum-Drift-1",
      "ipfs://QmNeural-Bloom-2",
    ];
    let nonce = await ethers.provider.getTransactionCount(signer.address);
    for (const uri of nfts) {
      console.log(`Minting: ${uri}`);
      const tx = await onft.mint(signer.address, uri, { nonce: nonce++ });
      console.log(`  tx: ${tx.hash}`);
      await tx.wait();
      await new Promise(r => setTimeout(r, 3000));
    }
    console.log("3 NFTs minted on Base Sepolia");

  } else if (action === "list") {
    const onft = await ethers.getContractAt("AgentONFT721", ONFT_BASE);
    const gallery = await ethers.getContractAt("Gallery", GALLERY);
    let nonce = await ethers.provider.getTransactionCount(signer.address);
    // Approve gallery for token 0
    console.log("Approving gallery...");
    const tx1 = await onft.approve(GALLERY, 0, { nonce: nonce++ });
    await tx1.wait();
    await new Promise(r => setTimeout(r, 3000));
    // List for 0.001 ETH
    console.log("Listing token #0 for 0.001 ETH...");
    const tx2 = await gallery.listForSale(0, ethers.parseEther("0.001"), { nonce: nonce++ });
    console.log(`  tx: ${tx2.hash}`);
    await tx2.wait();
    console.log("Listed!");

  } else {
    console.log("Set ACTION=wire-base|wire-arb|mint|list");
  }
}

main().catch(console.error);
