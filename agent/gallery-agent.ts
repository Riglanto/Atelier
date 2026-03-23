/**
 * Autonomous Gallery Agent — Creative Feedback Loop
 *
 * An AI artist agent that:
 *   1. CREATES generative art with distinct styles
 *   2. MINTS as omnichain NFTs on Base
 *   3. PRICES adaptively based on demand signals
 *   4. LISTS on the Gallery marketplace
 *   5. MONITORS sales, bridges, and market activity
 *   6. LEARNS what sells → creates more of popular styles
 *   7. CURATES — delists stale pieces, reprices based on demand
 *
 * The agent IS the artist. It develops taste through market feedback.
 *
 * Usage:
 *   npx hardhat run agent/gallery-agent.ts                          # demo mode
 *   ONFT_ADDR=0x... GALLERY_ADDR=0x... \
 *     npx hardhat run agent/gallery-agent.ts --network base-sepolia # live
 */

import { ethers } from "hardhat";

// ============================================================
// CREATIVE ENGINE — the agent's artistic brain
// ============================================================

interface ArtStyle {
  name: string;
  description: string;
  tags: string[];
  basePrice: bigint;
  // Market feedback
  mintCount: number;
  soldCount: number;
  totalRevenue: bigint;
  avgSaleTime: number;    // blocks between list and sale
  popularity: number;     // 0-100 computed score
}

const STYLES: ArtStyle[] = [
  { name: "Genesis Fragment", description: "Abstract circles and curves on dark backgrounds", tags: ["abstract", "minimal", "dark"],
    basePrice: ethers.parseEther("0.001"), mintCount: 0, soldCount: 0, totalRevenue: 0n, avgSaleTime: 0, popularity: 50 },
  { name: "Quantum Drift", description: "Flowing particle streams with interference patterns", tags: ["flow", "particles", "dynamic"],
    basePrice: ethers.parseEther("0.001"), mintCount: 0, soldCount: 0, totalRevenue: 0n, avgSaleTime: 0, popularity: 50 },
  { name: "Neural Bloom", description: "Organic neural-network inspired growth patterns", tags: ["organic", "neural", "growth"],
    basePrice: ethers.parseEther("0.001"), mintCount: 0, soldCount: 0, totalRevenue: 0n, avgSaleTime: 0, popularity: 50 },
  { name: "Void Echo", description: "Deep space with resonating geometric echoes", tags: ["space", "geometric", "deep"],
    basePrice: ethers.parseEther("0.001"), mintCount: 0, soldCount: 0, totalRevenue: 0n, avgSaleTime: 0, popularity: 50 },
  { name: "Prismatic Wave", description: "Refracted light through crystalline structures", tags: ["light", "crystal", "prismatic"],
    basePrice: ethers.parseEther("0.001"), mintCount: 0, soldCount: 0, totalRevenue: 0n, avgSaleTime: 0, popularity: 50 },
  { name: "Entropy Garden", description: "Order emerging from chaos in botanical forms", tags: ["chaos", "botanical", "emergent"],
    basePrice: ethers.parseEther("0.001"), mintCount: 0, soldCount: 0, totalRevenue: 0n, avgSaleTime: 0, popularity: 50 },
];

// ============================================================
// AGENT STATE
// ============================================================

interface TokenRecord {
  id: number;
  styleIndex: number;
  price: bigint;
  listedAtBlock: number;
  soldAtBlock: number | null;
  bridged: boolean;
  stale: boolean;       // listed too long without sale
}

interface AgentState {
  tokens: Map<number, TokenRecord>;
  nextTokenId: number;
  totalMinted: number;
  totalListed: number;
  totalSold: number;
  totalBridged: number;
  totalRevenue: bigint;
  gasSpent: bigint;
  startBalance: bigint;
  epoch: number;         // creative cycle number
}

const state: AgentState = {
  tokens: new Map(),
  nextTokenId: 0,
  totalMinted: 0,
  totalListed: 0,
  totalSold: 0,
  totalBridged: 0,
  totalRevenue: 0n,
  gasSpent: 0n,
  startBalance: 0n,
  epoch: 0,
};

const conversationLog: any[] = [];

function log(phase: string, msg: string, data?: any) {
  const icons: Record<string, string> = {
    create:  "🎨 CREATE ",
    mint:    "⛏️  MINT  ",
    price:   "💰 PRICE  ",
    list:    "📋 LIST   ",
    monitor: "👁️  WATCH ",
    learn:   "🧠 LEARN  ",
    curate:  "✂️  CURATE",
    adapt:   "🔄 ADAPT  ",
    health:  "💊 HEALTH ",
    info:    "ℹ️  INFO  ",
    error:   "❌ ERROR  ",
  };
  conversationLog.push({ timestamp: new Date().toISOString(), phase, message: msg, data });
  console.log(`${icons[phase] || phase.padEnd(10)} ${msg}`);
}

// ============================================================
// STYLE SELECTION — the agent's artistic taste
// ============================================================

function selectStyle(): number {
  // Weighted random: styles with higher popularity get picked more often
  // But we also explore: 20% chance of picking a random style regardless
  if (Math.random() < 0.2) {
    const idx = Math.floor(Math.random() * STYLES.length);
    log("create", `Exploring: trying "${STYLES[idx].name}" (random exploration)`);
    return idx;
  }

  // Weighted by popularity
  const totalPop = STYLES.reduce((sum, s) => sum + s.popularity, 0);
  let roll = Math.random() * totalPop;
  for (let i = 0; i < STYLES.length; i++) {
    roll -= STYLES[i].popularity;
    if (roll <= 0) {
      log("create", `Selected "${STYLES[i].name}" (popularity: ${STYLES[i].popularity}/100)`);
      return i;
    }
  }
  return 0;
}

// ============================================================
// ADAPTIVE PRICING — learns from market
// ============================================================

function calculatePrice(styleIndex: number, tokenId: number): bigint {
  const style = STYLES[styleIndex];
  let price = style.basePrice;

  // Demand multiplier: if this style sells well, price goes up
  if (style.soldCount > 0 && style.mintCount > 0) {
    const sellRate = style.soldCount / style.mintCount;
    if (sellRate > 0.7) {
      price = price * 150n / 100n; // +50% for hot styles
      log("price", `Hot style "${style.name}" (${(sellRate*100).toFixed(0)}% sell rate) → +50% premium`);
    } else if (sellRate > 0.4) {
      price = price * 120n / 100n; // +20%
    } else if (sellRate < 0.2 && style.mintCount >= 3) {
      price = price * 70n / 100n;  // -30% for cold styles
      log("price", `Cold style "${style.name}" (${(sellRate*100).toFixed(0)}% sell rate) → -30% discount`);
    }
  }

  // Scarcity: later pieces in popular collections cost more
  const scarcity = 100n + BigInt(style.soldCount) * 10n;
  price = price * scarcity / 100n;

  // Edition: each successive mint is slightly more
  price = price * (100n + BigInt(tokenId % 10) * 3n) / 100n;

  return price;
}

// ============================================================
// MARKET LEARNING — update style popularity from sales data
// ============================================================

function updatePopularity() {
  log("learn", "Analyzing market data...");

  for (const style of STYLES) {
    if (style.mintCount === 0) continue;

    const sellRate = style.soldCount / style.mintCount;
    const revenue = Number(ethers.formatEther(style.totalRevenue));

    // Popularity formula: weighted combination of sell rate + revenue
    let newPop = 50; // base
    newPop += sellRate * 30;              // up to +30 for high sell rate
    newPop += Math.min(revenue * 100, 20); // up to +20 for revenue

    // Penalty for overproduction without sales
    if (style.mintCount > 3 && style.soldCount === 0) {
      newPop -= 20;
    }

    // Clamp
    newPop = Math.max(10, Math.min(95, newPop));

    const oldPop = style.popularity;
    // Smooth update (don't jump too fast)
    style.popularity = Math.round(oldPop * 0.6 + newPop * 0.4);

    if (Math.abs(style.popularity - oldPop) >= 3) {
      log("learn", `"${style.name}": popularity ${oldPop} → ${style.popularity} (sells: ${style.soldCount}/${style.mintCount})`);
    }
  }
}

// ============================================================
// CURATION — manage the gallery
// ============================================================

function identifyStaleListings(currentBlock: number): number[] {
  const staleThreshold = 100; // blocks
  const stale: number[] = [];

  for (const [id, token] of state.tokens) {
    if (token.soldAtBlock === null && !token.stale && token.listedAtBlock > 0) {
      const age = currentBlock - token.listedAtBlock;
      if (age > staleThreshold) {
        token.stale = true;
        stale.push(id);
      }
    }
  }

  return stale;
}

// ============================================================
// METADATA GENERATION
// ============================================================

function generateMetadata(tokenId: number, styleIndex: number) {
  const style = STYLES[styleIndex];
  const edition = style.mintCount + 1;
  const metadata = {
    name: `${style.name} #${tokenId}`,
    description: `AI-generated artwork: ${style.description}. Edition ${edition} of the "${style.name}" collection. Omnichain NFT — minted on Base, tradeable across all LayerZero chains. Created by an autonomous agent with adaptive taste.`,
    image: `ipfs://Qm${style.name.replace(/\s/g, '')}-${tokenId}`,
    attributes: [
      { trait_type: "Collection", value: style.name },
      { trait_type: "Edition", value: edition },
      { trait_type: "Style Tags", value: style.tags.join(", ") },
      { trait_type: "Agent Popularity Score", value: style.popularity },
      { trait_type: "Chain", value: "Base" },
      { trait_type: "Omnichain", value: "true" },
      { trait_type: "Autonomous Agent", value: "true" },
      { trait_type: "Creative Epoch", value: state.epoch },
    ],
  };
  return { metadata, uri: `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}` };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║       AUTONOMOUS GALLERY AGENT — CREATIVE LOOP          ║
║       create → mint → price → list → monitor → learn    ║
╚══════════════════════════════════════════════════════════╝
  `);

  const onftAddr = process.env.ONFT_ADDR;
  const galleryAddr = process.env.GALLERY_ADDR;

  if (!onftAddr || !galleryAddr) {
    console.log("Running in DEMO MODE\n");
    await runDemoMode();
    return;
  }

  // Live mode would connect to contracts and run the loop
  log("info", "Live mode — connect with ONFT_ADDR and GALLERY_ADDR env vars");
}

// ============================================================
// DEMO MODE — simulates multiple creative epochs with feedback
// ============================================================

async function runDemoMode() {
  const [deployer, buyer1, buyer2] = await ethers.getSigners();

  log("info", "Deploying contracts...");
  const EndpointV2Mock = await ethers.getContractFactory(
    require("@layerzerolabs/oapp-evm/artifacts/EndpointV2Mock.sol/EndpointV2Mock.json").abi,
    require("@layerzerolabs/oapp-evm/artifacts/EndpointV2Mock.sol/EndpointV2Mock.json").bytecode
  );
  const endpoint = await EndpointV2Mock.deploy(30184, deployer.address);
  const epAddr = await endpoint.getAddress();
  const SendLibMock = await ethers.getContractFactory("SendLibMock");
  const sendLib = await SendLibMock.deploy(epAddr);
  await endpoint.registerLibrary(await sendLib.getAddress());
  await endpoint.setDefaultSendLibrary(30184, await sendLib.getAddress());
  await endpoint.setDefaultReceiveLibrary(30184, await sendLib.getAddress(), 0);

  const onft = await (await ethers.getContractFactory("AgentONFT721")).deploy(epAddr, deployer.address, "CosmicNFT", "CNFT");
  const gallery = await (await ethers.getContractFactory("Gallery")).deploy(await onft.getAddress());
  const onftAddr = await onft.getAddress();
  const galleryAddr = await gallery.getAddress();

  log("info", `ONFT: ${onftAddr}`);
  log("info", `Gallery: ${galleryAddr}`);

  // ═══════════════════════════════════════════
  // EPOCH 1: Initial collection — no market data yet
  // ═══════════════════════════════════════════
  state.epoch = 1;
  console.log(`\n${"═".repeat(60)}`);
  log("info", "EPOCH 1 — First collection (no market data)\n");

  const epoch1Tokens: number[] = [];
  for (let i = 0; i < 6; i++) {
    const styleIdx = i % STYLES.length; // One of each style initially
    const tokenId = state.nextTokenId++;
    const { metadata, uri } = generateMetadata(tokenId, styleIdx);
    const price = calculatePrice(styleIdx, tokenId);

    log("create", `"${metadata.name}" — ${STYLES[styleIdx].tags.join(", ")}`);
    await onft.mint(deployer.address, uri);
    STYLES[styleIdx].mintCount++;
    state.totalMinted++;

    log("price", `${ethers.formatEther(price)} ETH`);
    await onft.approve(galleryAddr, tokenId);
    await gallery.listForSale(tokenId, price);
    log("list", `Listed on Gallery`);

    const block = await ethers.provider.getBlockNumber();
    state.tokens.set(tokenId, {
      id: tokenId, styleIndex: styleIdx, price, listedAtBlock: block,
      soldAtBlock: null, bridged: false, stale: false,
    });
    state.totalListed++;
    epoch1Tokens.push(tokenId);
  }

  // ═══════════════════════════════════════════
  // SIMULATE MARKET: Some styles sell, others don't
  // ═══════════════════════════════════════════
  console.log(`\n${"─".repeat(60)}`);
  log("monitor", "Simulating market activity...\n");

  // Genesis Fragment sells (token 0) — popular!
  log("monitor", `SALE: "Genesis Fragment #0" sold to ${buyer1.address.slice(0,10)}...`);
  await onft.connect(deployer).approve(buyer1.address, 0);
  // Simulate sale
  STYLES[0].soldCount++;
  STYLES[0].totalRevenue += state.tokens.get(0)!.price;
  state.tokens.get(0)!.soldAtBlock = await ethers.provider.getBlockNumber();
  state.totalSold++;

  // Quantum Drift sells (token 1) — also popular!
  log("monitor", `SALE: "Quantum Drift #1" sold to ${buyer2.address.slice(0,10)}...`);
  STYLES[1].soldCount++;
  STYLES[1].totalRevenue += state.tokens.get(1)!.price;
  state.tokens.get(1)!.soldAtBlock = await ethers.provider.getBlockNumber();
  state.totalSold++;

  // Neural Bloom sells (token 2)
  log("monitor", `SALE: "Neural Bloom #2" sold to ${buyer1.address.slice(0,10)}...`);
  STYLES[2].soldCount++;
  STYLES[2].totalRevenue += state.tokens.get(2)!.price;
  state.tokens.get(2)!.soldAtBlock = await ethers.provider.getBlockNumber();
  state.totalSold++;

  // Void Echo, Prismatic Wave, Entropy Garden — no sales
  log("monitor", `No buyers for "Void Echo #3", "Prismatic Wave #4", "Entropy Garden #5"\n`);

  // ═══════════════════════════════════════════
  // LEARN: Analyze what sold
  // ═══════════════════════════════════════════
  console.log(`${"─".repeat(60)}`);
  updatePopularity();

  // Show popularity rankings
  console.log();
  log("learn", "Style rankings after Epoch 1:");
  const ranked = [...STYLES].sort((a, b) => b.popularity - a.popularity);
  ranked.forEach((s, i) => {
    const bar = "█".repeat(Math.floor(s.popularity / 5)) + "░".repeat(20 - Math.floor(s.popularity / 5));
    const status = s.soldCount > 0 ? `${s.soldCount}/${s.mintCount} sold` : "no sales";
    log("learn", `  ${i+1}. ${s.name.padEnd(18)} ${bar} ${s.popularity}/100 (${status})`);
  });

  // ═══════════════════════════════════════════
  // CURATE: Handle stale listings
  // ═══════════════════════════════════════════
  console.log(`\n${"─".repeat(60)}`);
  log("curate", "Reviewing stale listings...");
  // Mark unsold tokens as stale for demo
  for (const [id, token] of state.tokens) {
    if (token.soldAtBlock === null) {
      token.stale = true;
      const style = STYLES[token.styleIndex];
      const newPrice = token.price * 70n / 100n;
      log("curate", `"${style.name} #${id}" stale — repricing ${ethers.formatEther(token.price)} → ${ethers.formatEther(newPrice)} ETH (-30%)`);
      token.price = newPrice;
    }
  }

  // ═══════════════════════════════════════════
  // EPOCH 2: Agent creates more of what sells
  // ═══════════════════════════════════════════
  state.epoch = 2;
  console.log(`\n${"═".repeat(60)}`);
  log("info", "EPOCH 2 — Adapting to market demand\n");

  for (let i = 0; i < 4; i++) {
    const styleIdx = selectStyle(); // Now weighted by popularity!
    const tokenId = state.nextTokenId++;
    const { metadata, uri } = generateMetadata(tokenId, styleIdx);
    const price = calculatePrice(styleIdx, tokenId);

    log("create", `"${metadata.name}" — ${STYLES[styleIdx].tags.join(", ")}`);
    await onft.mint(deployer.address, uri);
    STYLES[styleIdx].mintCount++;
    state.totalMinted++;

    log("price", `${ethers.formatEther(price)} ETH${price > STYLES[styleIdx].basePrice ? " (demand premium)" : ""}`);
    await onft.approve(galleryAddr, tokenId);
    await gallery.listForSale(tokenId, price);
    log("list", `Listed on Gallery`);

    const block = await ethers.provider.getBlockNumber();
    state.tokens.set(tokenId, {
      id: tokenId, styleIndex: styleIdx, price, listedAtBlock: block,
      soldAtBlock: null, bridged: false, stale: false,
    });
    state.totalListed++;
  }

  // ═══════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════
  console.log(`\n${"═".repeat(60)}`);
  console.log("📋 GALLERY AGENT — FINAL STATUS");
  console.log(`${"═".repeat(60)}`);
  console.log(`   Epochs completed: ${state.epoch}`);
  console.log(`   Total minted: ${state.totalMinted} | Listed: ${state.totalListed} | Sold: ${state.totalSold}`);
  console.log(`   Revenue: ${ethers.formatEther(state.totalRevenue)} ETH`);
  console.log(`   Active styles: ${STYLES.filter(s => s.mintCount > 0).length}/${STYLES.length}`);
  console.log();
  console.log("   Style Performance:");
  for (const s of ranked) {
    if (s.mintCount > 0) {
      console.log(`     ${s.name.padEnd(18)} minted:${s.mintCount} sold:${s.soldCount} pop:${s.popularity} rev:${ethers.formatEther(s.totalRevenue)} ETH`);
    }
  }
  console.log();
  console.log(`   Key decisions:`);
  console.log(`     • Epoch 1: Minted 1 of each style to test market`);
  console.log(`     • Learned: Genesis Fragment, Quantum Drift, Neural Bloom sell well`);
  console.log(`     • Epoch 2: Weighted selection toward popular styles`);
  console.log(`     • Repriced stale Void Echo, Prismatic Wave, Entropy Garden -30%`);
  console.log(`\n   Conversation log: ${conversationLog.length} entries`);
  console.log(`${"═".repeat(60)}`);
}

main().catch(console.error);
