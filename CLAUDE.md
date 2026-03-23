# Atelier

## Project Overview

LayerZero V2 powered cross-chain NFT marketplace. An AI agent mints generative art as Omnichain NFTs (burn on source, mint on destination), with a Gallery contract enabling atomic buy+bridge in one transaction. Built for The Synthesis hackathon.

## Key Contracts

- `contracts/AgentONFT721.sol` — ERC-721 + OApp. Core functions:
  - `mint(address to, string uri)` — onlyOwner, auto-increments tokenId
  - `sendNFT(uint256 tokenId, uint32 dstEid, bytes options)` — burns locally, sends cross-chain to msg.sender on destination
  - `sendNFTTo(uint256 tokenId, address to, uint32 dstEid, bytes options)` — same but sends to arbitrary `to` address (used by Gallery for buyAndBridge)
  - `_lzReceive()` — decodes (tokenId, to, uri), mints on destination
  - `quoteSend()` — estimates LZ messaging fee
  - Payload: `abi.encode(uint256 tokenId, address to, string uri)`

- `contracts/Gallery.sol` — Marketplace:
  - `listForSale(tokenId, price)` — only token owner, stores Listing{seller, price}
  - `buy(tokenId)` payable — transfers NFT via transferFrom, pays seller, refunds excess
  - `buyAndBridge(tokenId, dstEid, options)` payable — atomically: transfers NFT to Gallery → calls `nft.sendNFTTo(tokenId, buyer, dstEid)` → pays seller. Buyer pays price + LZ fee.
  - `cancelListing(tokenId)` — only listing seller

- `contracts/mocks/SendLibMock.sol` — Mock LZ message library for EndpointV2Mock (returns zero fees, supports all EIDs).

## Tech Stack

- Solidity 0.8.27, EVM target: cancun
- Hardhat + hardhat-deploy
- @layerzerolabs/oapp-evm (OApp base class)
- @openzeppelin/contracts v5 (ERC721URIStorage, Ownable)
- ethers v6

## Commands

```bash
npm install --legacy-peer-deps
npx hardhat compile
npx hardhat test          # 9 tests
npx hardhat run scripts/demo.ts
```

## Testing Pattern

Tests use two approaches:
1. **SendLibMock** — registered with EndpointV2Mock so `sendNFT`/`quoteSend` work locally
2. **Endpoint impersonation** — for simulating `_lzReceive` on destination:
   - `hardhat_setBalance` on endpoint address
   - `hardhat_impersonateAccount` for endpoint
   - Call `contract.lzReceive(origin, guid, payload, executor, "0x")`

Setup in tests:
```typescript
const endpoint = await EndpointV2Mock.deploy(EID, owner);
const sendLib = await SendLibMock.deploy(await endpoint.getAddress());
await endpoint.registerLibrary(await sendLib.getAddress());
await endpoint.setDefaultSendLibrary(EID, await sendLib.getAddress());
await endpoint.setDefaultReceiveLibrary(EID, await sendLib.getAddress(), 0);
```

## Architecture Notes

- NFT bridging uses **burn-and-mint**: burned on source chain, minted on destination with same tokenId and URI.
- `sendNFTTo` is essential for the Gallery's `buyAndBridge` — the Gallery temporarily owns the NFT and sends it to the buyer's address on the destination chain.
- Gallery requires approval from the seller (`nft.approve(galleryAddr, tokenId)` or `setApprovalForAll`) before `buy` or `buyAndBridge` can transfer the token.
- Peers must be set on both AgentONFT721 instances via `setPeer(eid, bytes32Address)`.
- The `Ownable(_delegate)` constructor must be explicitly called alongside `OApp(_endpoint, _delegate)`.

## Deploy Flow

1. Deploy AgentONFT721 on each chain (Base, Arbitrum, Optimism)
2. Wire peers between all pairs via `setPeer`
3. Deploy Gallery on Base (primary minting chain)
4. Agent mints NFTs → lists on Gallery → buyers purchase locally or cross-chain

## Docs / Visualization Files

- `docs/banner.svg` — Animated SVG banner for GitHub README. CSS-only animations (no JS — GitHub strips it). Shows NFT traveling from Base to Arbitrum over a LayerZero bridge.
- `docs/architecture.html` — Interactive architecture visualization. Dark-themed. Has animated generative NFT gallery, clickable contract details, tabbed transaction flows, and hackathon track info.
- `docs/how-it-works.html` — Step-by-step flow page. 4 tabbed flows (Mint, Buy, Buy+Bridge, Direct Bridge), 6 procedurally generated NFT art pieces via canvas, inline SVG bridge animation, contract architecture with expandable function details.
- Both HTML files link to each other via nav.

## LZ Endpoint Addresses

- Testnet (all chains): `0x6EDCE65403992e310A62460808c4b910D972f10f`
- Mainnet (all chains): `0x1a44076050125825900e736c501f859c50fE728c`
