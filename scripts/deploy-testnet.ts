import { ethers } from "hardhat";

const LZ_ENDPOINT_TESTNET = "0x6EDCE65403992e310A62460808c4b910D972f10f";

async function deploy(name: string, args: any[]) {
  console.log(`Deploying ${name}...`);
  const F = await ethers.getContractFactory(name);
  const c = await F.deploy(...args);
  const tx = c.deploymentTransaction();
  console.log(`  tx: ${tx?.hash}`);
  await c.waitForDeployment();
  const addr = await c.getAddress();
  console.log(`  ${name}: ${addr}`);
  await new Promise(r => setTimeout(r, 3000));
  return addr;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  const chain = process.env.CHAIN;

  if (chain === "base") {
    const onft = await deploy("AgentONFT721", [LZ_ENDPOINT_TESTNET, deployer.address, "CosmicNFT", "CNFT"]);
    const gallery = await deploy("Gallery", [onft]);
    console.log(`\n  ONFT_ADDR=${onft}`);
    console.log(`  GALLERY_ADDR=${gallery}`);
  } else if (chain === "arb") {
    const onft = await deploy("AgentONFT721", [LZ_ENDPOINT_TESTNET, deployer.address, "CosmicNFT", "CNFT"]);
    console.log(`\n  ONFT_ARB_ADDR=${onft}`);
  } else {
    console.log("Set CHAIN=base or CHAIN=arb");
  }
}

main().catch(console.error);
