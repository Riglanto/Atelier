import { useState } from 'react'

const C = { blue: '#3080ff', indigo: '#625fff', purple: '#ac4bff', green: '#00c758', red: '#fb2c36', bg: '#0c0c0e', surface: '#141416', surface2: '#1c1c1f', border: '#2a2a2e', text: '#a1a1aa', textBright: '#fafafa' }

type NFT = { name: string; style: string; owner: string; price: string; chain: string; status: 'Listed' | 'Sold' | 'Bridged'; gradient: string }

const nfts: NFT[] = [
  { name: 'Chromatic Drift #1', style: 'Abstract', owner: '0x2e5fEA809Cc4679DdEc0c6cEB5F9f5B34Ce6263F', price: '0.05 ETH', chain: 'Base', status: 'Listed', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ffd93d 30%, #6bff6b 60%, #4dabf7 100%)' },
  { name: 'Neural Bloom #2', style: 'Organic', owner: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', price: '0.08 ETH', chain: 'Arbitrum', status: 'Sold', gradient: 'radial-gradient(circle at 30% 40%, #ac4bff 0%, #625fff 40%, #0c0c0e 70%), radial-gradient(circle at 70% 60%, #ff6baa 0%, transparent 50%)' },
  { name: 'Pixel Storm #3', style: 'Geometric', owner: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', price: '0.03 ETH', chain: 'Base', status: 'Listed', gradient: 'repeating-conic-gradient(#3080ff 0% 25%, #0c0c0e 0% 50%) 0 0 / 40px 40px' },
  { name: 'Void Echo #4', style: 'Minimalist', owner: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', price: '0.12 ETH', chain: 'Optimism', status: 'Bridged', gradient: 'radial-gradient(ellipse at center, #1c1c1f 0%, #0c0c0e 60%), linear-gradient(0deg, transparent 49.5%, #2a2a2e 49.5%, #2a2a2e 50.5%, transparent 50.5%)' },
  { name: 'Solar Flare #5', style: 'Abstract', owner: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', price: '0.06 ETH', chain: 'Base', status: 'Listed', gradient: 'radial-gradient(circle at 50% 120%, #fb2c36 0%, #ffd93d 30%, #ff6b00 60%, #0c0c0e 80%)' },
  { name: 'Deep Current #6', style: 'Organic', owner: '0x2e5fEA809Cc4679DdEc0c6cEB5F9f5B34Ce6263F', price: '0.04 ETH', chain: 'Arbitrum', status: 'Sold', gradient: 'linear-gradient(180deg, #0c0c0e 0%, #003366 30%, #3080ff 50%, #00c758 70%, #0c0c0e 100%)' },
]

const stats = [
  { label: 'NFTs Minted', value: '12' }, { label: 'Total Sales', value: '0.38 ETH' }, { label: 'Styles Active', value: '6' },
  { label: 'Chains', value: '3' }, { label: 'Avg Price', value: '0.063 ETH' }, { label: 'Bridged', value: '4' },
]

const steps = ['Create Art', 'Mint ONFT', 'List on Gallery', 'Buy or Buy+Bridge', 'Agent Learns']

const styleWeights = [
  { style: 'Abstract', pct: 40, color: C.purple },
  { style: 'Organic', pct: 30, color: C.blue },
  { style: 'Geometric', pct: 15, color: C.indigo },
  { style: 'Minimalist', pct: 10, color: C.green },
  { style: 'Other', pct: 5, color: C.text },
]

const chainColor = (chain: string) => chain === 'Base' ? C.blue : chain === 'Arbitrum' ? C.indigo : C.red
const statusColor = (s: string) => s === 'Listed' ? C.green : s === 'Sold' ? C.purple : C.blue
const truncate = (addr: string) => addr.slice(0, 6) + '...' + addr.slice(-4)

export default function App() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number | null>(null)

  const filtered = search.trim()
    ? nfts.filter(n => n.owner.toLowerCase().includes(search.trim().toLowerCase()))
    : nfts

  return (
    <div style={{ background: C.bg, color: C.textBright, minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold tracking-tight">Atelier</span>
          <span className="text-sm" style={{ color: C.text }}>Autonomous AI Artist</span>
        </div>
        <a href="https://github.com/Riglanto/Atelier" target="_blank" rel="noreferrer" className="text-sm font-mono hover:underline" style={{ color: C.blue }}>GitHub</a>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col gap-16">
        {/* Hero */}
        <section className="text-center flex flex-col gap-4">
          <h1 className="text-4xl md:text-5xl font-bold">Art that learns what you love.</h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: C.text }}>
            An autonomous AI artist that creates generative art, mints omnichain NFTs via LayerZero V2, and adapts its style based on market demand.
          </p>
        </section>

        {/* Address Search */}
        <section className="flex gap-3 max-w-xl mx-auto w-full">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Look up NFT by owner address (0x...)"
            className="flex-1 px-4 py-3 text-sm font-mono outline-none"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textBright }}
          />
          <button
            onClick={() => {}}
            className="px-6 py-3 text-sm font-medium cursor-pointer"
            style={{ background: C.blue, color: '#fff' }}
          >Look up</button>
        </section>

        {/* NFT Gallery */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold">Gallery</h2>
          {filtered.length === 0 && <p style={{ color: C.text }}>No NFTs found for that address.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((nft) => {
              const realIdx = nfts.indexOf(nft)
              const active = selected === realIdx
              return (
                <div
                  key={nft.name}
                  onClick={() => setSelected(active ? null : realIdx)}
                  className="cursor-pointer transition-all duration-150 flex flex-col"
                  style={{
                    background: C.surface,
                    border: `1px solid ${active ? C.blue : C.border}`,
                    boxShadow: active ? `0 0 0 1px ${C.blue}` : 'none',
                  }}
                >
                  {/* Art placeholder */}
                  <div className="w-full aspect-square" style={{ background: nft.gradient }} />
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{nft.name}</span>
                      <span className="lz-pill px-2 py-0.5 text-xs font-mono" style={{ background: C.surface2, color: C.text }}>{nft.style}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs" style={{ color: C.text }}>
                      <span className="font-mono">{truncate(nft.owner)}</span>
                      <span className="font-bold" style={{ color: C.textBright }}>{nft.price}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="lz-pill px-2 py-0.5 text-xs font-medium" style={{ background: `${chainColor(nft.chain)}22`, color: chainColor(nft.chain) }}>{nft.chain}</span>
                      <span className="lz-pill px-2 py-0.5 text-xs font-medium" style={{ background: `${statusColor(nft.status)}22`, color: statusColor(nft.status) }}>{nft.status}</span>
                    </div>
                    {active && (
                      <div className="mt-2 pt-2 text-xs flex flex-col gap-1" style={{ borderTop: `1px solid ${C.border}`, color: C.text }}>
                        <span>Owner: <span className="font-mono" style={{ color: C.textBright }}>{nft.owner}</span></span>
                        <span>Chain: {nft.chain} | Style: {nft.style} | Status: {nft.status}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Creative Feedback Loop */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold">Creative Feedback Loop</h2>
          <div className="p-6 flex flex-col gap-6" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Epoch 1: Created 6 NFTs &rarr; 3 sold &rarr; Abstract &amp; Organic popular</p>
              <p className="text-sm" style={{ color: C.text }}>Epoch 2: Weights adjusted based on market demand</p>
            </div>
            <div className="flex flex-col gap-3">
              {styleWeights.map(w => (
                <div key={w.style} className="flex items-center gap-3">
                  <span className="text-xs w-20 text-right font-mono" style={{ color: C.text }}>{w.style}</span>
                  <div className="flex-1 h-6 relative" style={{ background: C.surface2 }}>
                    <div className="h-full transition-all duration-500" style={{ width: `${w.pct}%`, background: w.color }} />
                  </div>
                  <span className="text-xs w-10 font-mono font-bold">{w.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Market Stats */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold">Market Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map(s => (
              <div key={s.label} className="p-4 flex flex-col gap-1" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <span className="text-xs uppercase tracking-wider" style={{ color: C.text }}>{s.label}</span>
                <span className="text-xl font-bold font-mono">{s.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold">How It Works</h2>
          <div className="flex flex-col md:flex-row items-stretch gap-0">
            {steps.map((step, i) => (
              <div key={step} className="flex-1 flex items-center">
                <div className="p-4 flex-1 text-center flex flex-col gap-2" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  <span className="text-xs font-mono" style={{ color: C.blue }}>Step {i + 1}</span>
                  <span className="text-sm font-bold">{step}</span>
                </div>
                {i < steps.length - 1 && (
                  <span className="text-lg px-2 hidden md:block" style={{ color: C.text }}>&rarr;</span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-12 py-8 text-center text-sm" style={{ borderTop: `1px solid ${C.border}`, color: C.text }}>
        Atelier &mdash; Art that learns what you love. &mdash; Powered by LayerZero V2
      </footer>
    </div>
  )
}
