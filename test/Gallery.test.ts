import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Contract, Signer } from "ethers";

describe("Gallery", function () {
  let owner: Signer;
  let buyer: Signer;
  let other: Signer;
  let ownerAddr: string;
  let buyerAddr: string;

  let srcEndpoint: Contract;
  let dstEndpoint: Contract;
  let srcONFT: Contract;
  let dstONFT: Contract;
  let gallery: Contract;

  const SRC_EID = 30184; // Base
  const DST_EID = 30110; // Arbitrum

  async function deployEndpoint(eid: number): Promise<Contract> {
    const EndpointV2MockArtifact = require("@layerzerolabs/oapp-evm/artifacts/EndpointV2Mock.sol/EndpointV2Mock.json");
    const factory = new ethers.ContractFactory(
      EndpointV2MockArtifact.abi,
      EndpointV2MockArtifact.bytecode,
      owner
    );
    const endpoint = await factory.deploy(eid, await owner.getAddress());
    await endpoint.waitForDeployment();
    return endpoint;
  }

  async function deploySendLibMock(
    endpointAddr: string
  ): Promise<Contract> {
    const SendLibMock = await ethers.getContractFactory("SendLibMock");
    const lib = await SendLibMock.deploy(endpointAddr);
    await lib.waitForDeployment();
    return lib;
  }

  async function deliverToDestination(
    endpoint: Contract,
    receiver: Contract,
    srcEid: number,
    senderBytes32: string,
    nonce: number,
    payload: string
  ) {
    const endpointAddr = await endpoint.getAddress();

    // Fund the endpoint address
    await network.provider.send("hardhat_setBalance", [
      endpointAddr,
      "0xDE0B6B3A7640000",
    ]);

    // Impersonate endpoint
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [endpointAddr],
    });

    const endpointSigner = await ethers.getSigner(endpointAddr);

    const origin = {
      srcEid: srcEid,
      sender: senderBytes32,
      nonce: nonce,
    };

    const guid = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint32", "bytes32", "uint64"],
        [srcEid, senderBytes32, nonce]
      )
    );

    await receiver
      .connect(endpointSigner)
      .lzReceive(origin, guid, payload, endpointAddr, "0x");

    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [endpointAddr],
    });
  }

  function addressToBytes32(addr: string): string {
    return ethers.zeroPadValue(addr, 32);
  }

  beforeEach(async function () {
    [owner, buyer, other] = await ethers.getSigners();
    ownerAddr = await owner.getAddress();
    buyerAddr = await buyer.getAddress();

    // Deploy endpoints
    srcEndpoint = await deployEndpoint(SRC_EID);
    dstEndpoint = await deployEndpoint(DST_EID);

    const srcEndpointAddr = await srcEndpoint.getAddress();
    const dstEndpointAddr = await dstEndpoint.getAddress();

    // Deploy and register SendLibMock for both endpoints
    const srcLib = await deploySendLibMock(srcEndpointAddr);
    const dstLib = await deploySendLibMock(dstEndpointAddr);
    const srcLibAddr = await srcLib.getAddress();
    const dstLibAddr = await dstLib.getAddress();

    await srcEndpoint.registerLibrary(srcLibAddr);
    await srcEndpoint.setDefaultSendLibrary(DST_EID, srcLibAddr);
    await srcEndpoint.setDefaultReceiveLibrary(DST_EID, srcLibAddr, 0);

    await dstEndpoint.registerLibrary(dstLibAddr);
    await dstEndpoint.setDefaultSendLibrary(SRC_EID, dstLibAddr);
    await dstEndpoint.setDefaultReceiveLibrary(SRC_EID, dstLibAddr, 0);

    // Deploy ONFTs
    const AgentONFT721 = await ethers.getContractFactory("AgentONFT721");
    srcONFT = await AgentONFT721.deploy(
      srcEndpointAddr,
      ownerAddr,
      "AgentArt",
      "AART"
    );
    await srcONFT.waitForDeployment();

    dstONFT = await AgentONFT721.deploy(
      dstEndpointAddr,
      ownerAddr,
      "AgentArt",
      "AART"
    );
    await dstONFT.waitForDeployment();

    const srcONFTAddr = await srcONFT.getAddress();
    const dstONFTAddr = await dstONFT.getAddress();

    // Set peers
    await srcONFT.setPeer(DST_EID, addressToBytes32(dstONFTAddr));
    await dstONFT.setPeer(SRC_EID, addressToBytes32(srcONFTAddr));

    // Deploy Gallery
    const Gallery = await ethers.getContractFactory("Gallery");
    gallery = await Gallery.deploy(srcONFTAddr);
    await gallery.waitForDeployment();
  });

  it("should mint NFT with correct URI and ownership", async function () {
    await srcONFT.mint(ownerAddr, "ipfs://art1");
    expect(await srcONFT.ownerOf(0)).to.equal(ownerAddr);
    expect(await srcONFT.tokenURI(0)).to.equal("ipfs://art1");
  });

  it("should only allow owner to mint", async function () {
    await expect(
      srcONFT.connect(buyer).mint(buyerAddr, "ipfs://art1")
    ).to.be.revertedWithCustomError(srcONFT, "OwnableUnauthorizedAccount");
  });

  it("should list NFT for sale and buy it", async function () {
    await srcONFT.mint(ownerAddr, "ipfs://art1");

    const galleryAddr = await gallery.getAddress();
    await srcONFT.approve(galleryAddr, 0);

    await gallery.listForSale(0, ethers.parseEther("1"));

    await gallery
      .connect(buyer)
      .buy(0, { value: ethers.parseEther("1") });

    expect(await srcONFT.ownerOf(0)).to.equal(buyerAddr);
  });

  it("should reject buying unlisted NFT", async function () {
    await expect(
      gallery.connect(buyer).buy(99, { value: ethers.parseEther("1") })
    ).to.be.revertedWithCustomError(gallery, "NotListed");
  });

  it("should reject insufficient payment", async function () {
    await srcONFT.mint(ownerAddr, "ipfs://art1");

    const galleryAddr = await gallery.getAddress();
    await srcONFT.approve(galleryAddr, 0);

    await gallery.listForSale(0, ethers.parseEther("1"));

    await expect(
      gallery
        .connect(buyer)
        .buy(0, { value: ethers.parseEther("0.5") })
    ).to.be.revertedWithCustomError(gallery, "InsufficientPayment");
  });

  it("should cancel listing", async function () {
    await srcONFT.mint(ownerAddr, "ipfs://art1");

    const galleryAddr = await gallery.getAddress();
    await srcONFT.approve(galleryAddr, 0);

    await gallery.listForSale(0, ethers.parseEther("1"));

    await gallery.cancelListing(0);

    await expect(
      gallery.connect(buyer).buy(0, { value: ethers.parseEther("1") })
    ).to.be.revertedWithCustomError(gallery, "NotListed");
  });

  it("should burn NFT on sendNFT", async function () {
    await srcONFT.mint(ownerAddr, "ipfs://art1");

    const options = "0x00030100110100000000000000000000000000030d40";

    await srcONFT.sendNFT(0, DST_EID, options, {
      value: ethers.parseEther("0.1"),
    });

    await expect(srcONFT.ownerOf(0)).to.be.revertedWithCustomError(
      srcONFT,
      "ERC721NonexistentToken"
    );
  });

  it("should mint NFT on destination via lzReceive", async function () {
    const tokenId = 0;
    const uri = "ipfs://art1";

    const payload = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "address", "string"],
      [tokenId, buyerAddr, uri]
    );

    const srcONFTAddr = await srcONFT.getAddress();
    const senderBytes32 = addressToBytes32(srcONFTAddr);

    await deliverToDestination(
      dstEndpoint,
      dstONFT,
      SRC_EID,
      senderBytes32,
      1,
      payload
    );

    expect(await dstONFT.ownerOf(tokenId)).to.equal(buyerAddr);
    expect(await dstONFT.tokenURI(tokenId)).to.equal(uri);
  });

  it("should buy and bridge in one transaction", async function () {
    await srcONFT.mint(ownerAddr, "ipfs://art1");

    const galleryAddr = await gallery.getAddress();
    await srcONFT.approve(galleryAddr, 0);

    await gallery.listForSale(0, ethers.parseEther("1"));

    const options = "0x00030100110100000000000000000000000000030d40";

    // buyAndBridge with enough to cover price + bridge fee
    await gallery
      .connect(buyer)
      .buyAndBridge(0, DST_EID, options, {
        value: ethers.parseEther("2"),
      });

    // Token should be burned on source chain
    await expect(srcONFT.ownerOf(0)).to.be.revertedWithCustomError(
      srcONFT,
      "ERC721NonexistentToken"
    );
  });
});
