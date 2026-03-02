"use client";

import Link from "next/link";
import { DISCOUNT_TIERS } from "@/types/database";

export default function Home() {
  return (
    <div className="flex flex-col page-fade-in bg-mesh overflow-hidden min-h-screen">
      {/* Hero Section */}
      <div className="relative flex flex-col items-center justify-center text-center px-6 w-full max-w-7xl mx-auto pt-32 pb-24 md:pt-20 md:pb-20">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-brand/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 space-y-12">
          <div className="inline-flex items-center gap-3 px-6 py-2 glass rounded-full border border-white/10">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse shadow-glow" />
            <span className="text-[10px] font-black text-brand uppercase tracking-[0.4em]">Powered by $SHIP</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-[0.8] title-reveal">
              Ship <span className="text-brand text-glow">Market</span>
            </h1>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mb-10 leading-relaxed">
              The digital marketplace powered by SHIP tokens. Buy premium Web3 resources, courses, and tools — and earn discounts just for holding SHIP.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 items-center justify-center pt-8">
            <Link
              href="/marketplace"
              className="px-10 py-5 bg-brand text-white font-black rounded-full hover:scale-105 transition-all shadow-xl shadow-brand/30 uppercase tracking-widest text-sm"
            >
              Browse Marketplace
            </Link>
            <a
              href="https://pump.fun/coin/4KWDP6DpqrhB7Cm1fgFZFC1JYyikdo4oCKyiZ56xpump"
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-5 glass text-white font-black rounded-full hover:bg-white/5 transition-all uppercase tracking-widest text-sm border border-white/10"
            >
              Buy $SHIP
            </a>
          </div>
        </div>
      </div>

      {/* Discount Tiers Section - Moved from Marketplace */}
      <div className="max-w-7xl mx-auto px-6 pb-32 w-full">
        <div className="bg-zinc-900/50 rounded-2xl p-8 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 blur-[120px] -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Hold More. Pay Less.</h2>
              <p className="text-gray-400 font-medium text-lg">
                Your <span className="text-white font-bold">$SHIP</span> balance determines your discount tier.
                The more you hold, the less you pay — automatically applied at checkout.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {DISCOUNT_TIERS.map((t, i) => {
                const icons = ['🧭', '⛵', '🚢', '⚓'];
                const colors = [
                  'border-white/10 bg-white/5',
                  'border-blue-500/30 bg-blue-500/5',
                  'border-purple-500/30 bg-purple-500/5',
                  'border-amber-500/30 bg-amber-500/5',
                ];
                const textColors = ['text-gray-400', 'text-blue-400', 'text-purple-400', 'text-amber-400'];
                return (
                  <div key={t.label} className={`p-6 rounded-2xl border ${colors[i]} hover:scale-105 transition-all duration-500`}>
                    <div className="text-5xl mb-6">{icons[i]}</div>
                    <div className={`text-xl font-black uppercase ${textColors[i]} mb-2`}>{t.label}</div>
                    {t.minShip > 0
                      ? <div className="text-xs text-gray-500 font-bold mb-4 uppercase tracking-widest">Hold {t.minShip.toLocaleString()}+ SHIP</div>
                      : <div className="text-xs text-gray-500 font-bold mb-4 uppercase tracking-widest">Entry Level</div>
                    }
                    <div className={`text-4xl font-black ${t.discount > 0 ? 'text-brand' : 'text-gray-600'}`}>
                      {t.discount > 0 ? `-${t.discount}%` : '0%'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-32 grid md:grid-cols-3 gap-10">
        {[
          { title: "Direct Settlement", desc: "Peer-to-peer logic. Transactions settle instantly on-chain via the SHIP protocol.", icon: "⚡" },
          { title: "Tier Privileges", desc: "HOLD SHIP to unlock dynamic discounts up to 40% across all listed resources.", icon: "⚓" },
          { title: "Verified Assets", desc: "Every listing is a cryptographic asset, unlocking only upon verified proof-of-payment.", icon: "💎" }
        ].map((item, i) => (
          <div key={i} className="glass p-8 rounded-2xl group hover:border-brand/30 transition-all duration-500">
            <div className="text-5xl mb-8 group-hover:scale-110 group-hover:rotate-6 transition-transform">{item.icon}</div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-4 text-white">{item.title}</h3>
            <p className="text-[11px] text-gray-400 font-medium leading-loose uppercase tracking-wide opacity-80">{item.desc}</p>
          </div>
        ))}
      </div>


    </div>
  );
}
