import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const LZ_ENDPOINTS: Record<string, string> = {
  "base-sepolia": "0x6EDCE65403992e310A62460808c4b910D972f10f",
  "arb-sepolia": "0x6EDCE65403992e310A62460808c4b910D972f10f",
  "op-sepolia": "0x6EDCE65403992e310A62460808c4b910D972f10f",
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const networkName = hre.network.name;

  const endpoint = LZ_ENDPOINTS[networkName];
  if (!endpoint) {
    console.log(`No endpoint configured for ${networkName}, skipping`);
    return;
  }

  await deploy("AgentONFT721", {
    from: deployer,
    args: [endpoint, deployer, "AgentArt", "AART"],
    log: true,
  });
};

func.tags = ["AgentONFT721"];
export default func;
