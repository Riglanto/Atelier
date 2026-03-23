import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();

  console.log("Deploying contracts with:", deployerAddr);

  // Deploy a mock endpoint for local demo
  const EndpointV2MockArtifact = require("@layerzerolabs/oapp-evm/artifacts/EndpointV2Mock.sol/EndpointV2Mock.json");
  const endpointFactory = new ethers.ContractFactory(
    EndpointV2MockArtifact.abi,
    EndpointV2MockArtifact.bytecode,
    deployer
  );
  const endpoint = await endpointFactory.deploy(30184, deployerAddr);
  await endpoint.waitForDeployment();
  const endpointAddr = await endpoint.getAddress();

  // Deploy AgentONFT721
  const AgentONFT721 = await ethers.getContractFactory("AgentONFT721");
  const onft = await AgentONFT721.deploy(endpointAddr, deployerAddr, "AgentArt", "AART");
  await onft.waitForDeployment();
  const onftAddr = await onft.getAddress();
  console.log("AgentONFT721 deployed to:", onftAddr);

  // Deploy Gallery
  const Gallery = await ethers.getContractFactory("Gallery");
  const gallery = await Gallery.deploy(onftAddr);
  await gallery.waitForDeployment();
  const galleryAddr = await gallery.getAddress();
  console.log("Gallery deployed to:", galleryAddr);

  // Mint 3 NFTs
  console.log("\n--- Minting 3 NFTs ---");
  await onft.mint(deployerAddr, "ipfs://QmAbstract1");
  console.log("Minted token #0: ipfs://QmAbstract1");

  await onft.mint(deployerAddr, "ipfs://QmAbstract2");
  console.log("Minted token #1: ipfs://QmAbstract2");

  await onft.mint(deployerAddr, "ipfs://QmAbstract3");
  console.log("Minted token #2: ipfs://QmAbstract3");

  // List token #1 for sale
  console.log("\n--- Listing token #1 for 0.1 ETH ---");
  await onft.approve(galleryAddr, 1);
  await gallery.listForSale(1, ethers.parseEther("0.1"));

  const listing = await gallery.listings(1);
  console.log("Listing seller:", listing.seller);
  console.log("Listing price:", ethers.formatEther(listing.price), "ETH");

  // Show gallery state
  console.log("\n--- Gallery State ---");
  for (let i = 0; i < 3; i++) {
    const ownerOfToken = await onft.ownerOf(i);
    const uri = await onft.tokenURI(i);
    const tokenListing = await gallery.listings(i);
    const isListed = tokenListing.seller !== ethers.ZeroAddress;
    console.log(`Token #${i}: owner=${ownerOfToken}, uri=${uri}, listed=${isListed}`);
  }

  console.log("\nDemo complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
