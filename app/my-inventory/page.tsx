"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import {
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID
} from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { SHIP_TOKEN_MINT } from '@/lib/anchor';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { Purchase, DISCOUNT_TIERS } from '@/types/database';
import toast from 'react-hot-toast';

export default function BuyerInventoryPage() {
    const wallet = useAnchorWallet();
    const { connection } = useConnection();

    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [shipBalance, setShipBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const tier = [...DISCOUNT_TIERS].reverse().find(t => shipBalance >= t.minShip) || DISCOUNT_TIERS[0];
    const nextTier = DISCOUNT_TIERS.find(t => t.minShip > shipBalance);

    useEffect(() => {
        if (wallet) {
            fetchData();
            fetchBalance();
        } else {
            setLoading(false);
        }
    }, [wallet]);

    const fetchData = async () => {
        if (!wallet) return;
        try {
            const q = query(
                collection(db, 'Purchases'),
                where('buyerId', '==', wallet.publicKey.toBase58())
            );
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                purchasedAt: d.data().purchasedAt?.toDate ? d.data().purchasedAt.toDate() : new Date(d.data().purchasedAt)
            } as Purchase)).sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
            setPurchases(data);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBalance = async () => {
        if (!wallet) return;
        try {
            const [ataStandard, ata2022] = await Promise.all([
                getAssociatedTokenAddress(SHIP_TOKEN_MINT, wallet.publicKey, false, TOKEN_PROGRAM_ID),
                getAssociatedTokenAddress(SHIP_TOKEN_MINT, wallet.publicKey, false, TOKEN_2022_PROGRAM_ID)
            ]);

            const [stdRes, t22Res] = await Promise.all([
                connection.getTokenAccountBalance(ataStandard, 'confirmed').then(res => res.value.uiAmount || 0).catch(() => 0),
                connection.getTokenAccountBalance(ata2022, 'confirmed').then(res => res.value.uiAmount || 0).catch(() => 0)
            ]);

            setShipBalance(Math.max(stdRes, t22Res));
        } catch (e) {
            const res = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, { mint: SHIP_TOKEN_MINT }, 'confirmed');
            if (res.value.length > 0) setShipBalance(res.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0);
        }
    };

    if (!wallet) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-10 text-center">
                <div className="text-8xl mb-8 animate-pulse">🛰️</div>
                <h1 className="text-3xl font-black italic tracking-tighter uppercase mb-4">Inventory Locked</h1>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.3em] max-w-sm mb-10">Connect your Solana wallet to access your purchased assets and check your status.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6 md:p-12">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="text-[10px] font-black text-brand uppercase tracking-[0.4em] mb-3 opacity-60">Personal Terminal</div>
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-gray-900 dark:text-white">My Digital Inventory</h1>
                    </div>
                    <Link href="/marketplace" className="px-8 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-brand transition-all">
                        Browse Assets
                    </Link>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Tier Card */}
                    <div className="bg-zinc-900 p-6 rounded-xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            {tier.label === 'Admiral' ? '⚓' : tier.label === 'Captain' ? '🚢' : tier.label === 'Sailor' ? '⛵' : '🧭'}
                        </div>
                        <div className="relative z-10">
                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Active Profile</div>
                            <div className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">{tier.label} Tier</div>
                            <div className="text-2xl font-black text-brand tabular-nums">-{tier.discount}% <span className="text-[10px] uppercase font-bold text-gray-400">Trading Level</span></div>
                        </div>
                    </div>

                    {/* Balance Card */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Available $SHIP</div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums mb-2">{shipBalance.toLocaleString()}</div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Live On-Chain Balance</div>
                    </div>

                    {/* Next Tier Progress */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
                        {nextTier ? (
                            <>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Next Milestone: {nextTier.label}</div>
                                <div className="text-2xl font-black text-gray-900 dark:text-white uppercase mb-4">
                                    +{(nextTier.minShip - shipBalance).toLocaleString()} SHIP
                                </div>
                                <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-brand transition-all duration-1000"
                                        style={{ width: `${Math.min(100, (shipBalance / nextTier.minShip) * 100)}%` }}
                                    ></div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center">
                                <div className="text-brand font-black text-xl italic uppercase">Max Level Achieved</div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">Admiral of the Fleet</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* My Assets */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-6">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">My Decrypted Holdings</h2>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{purchases.length} Items</span>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 animate-pulse"></div>)}
                        </div>
                    ) : purchases.length === 0 ? (
                        <div className="py-24 text-center glass rounded-xl border-dashed">
                            <div className="text-6xl mb-6 opacity-20">📦</div>
                            <h3 className="text-xl font-black text-gray-300 dark:text-zinc-700 uppercase tracking-widest">No Items Found</h3>
                            <p className="text-gray-400 text-sm mt-3 font-medium">Digital resources purchased in the marketplace will appear here.</p>
                            <Link href="/marketplace" className="inline-block mt-8 px-10 py-4 bg-brand text-white font-black rounded-full uppercase text-xs tracking-widest shadow-glow">
                                Start Exploring
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {purchases.map(p => (
                                <div key={p.id} className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:border-brand/30 transition-all group">
                                    <div className="flex flex-col h-full">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-16 h-16 rounded-2xl bg-brand/5 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">💎</div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase truncate italic">{p.productTitle}</h3>
                                                <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Purchased {new Date(p.purchasedAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 mb-8">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-gray-400">Price Paid</span>
                                                <span className="text-brand">{p.pricePaid.toLocaleString()} SHIP</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-gray-400">Transaction</span>
                                                <a href={`https://solscan.io/tx/${p.txSignature}`} target="_blank" className="text-gray-900 dark:text-zinc-400 hover:text-brand flex items-center gap-1">
                                                    Verify <span className="text-[8px] opacity-60">↗</span>
                                                </a>
                                            </div>
                                        </div>

                                        <a
                                            href={p.deliveryUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[9px] text-center hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                                        >
                                            Access Resource
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Hub */}
                <div className="bg-zinc-900/40 rounded-xl p-8 border border-white/5 relative overflow-hidden">
                    <div className="text-center max-w-2xl mx-auto relative z-10">
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-4">Security Protocol</h3>
                        <p className="text-gray-400 text-sm font-medium leading-relaxed uppercase tracking-wider opacity-60">
                            All purchases are recorded permanently on the Solana blockchain. <br /> If you hold $SHIP in your wallet, your discounts are automatically unlocked site-wide.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
