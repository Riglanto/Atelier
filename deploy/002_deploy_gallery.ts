import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  const onft = await get("AgentONFT721");

  await deploy("Gallery", {
    from: deployer,
    args: [onft.address],
    log: true,
  });
};

func.tags = ["Gallery"];
func.dependencies = ["AgentONFT721"];
export default func;
