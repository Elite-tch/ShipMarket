"use client";

import React, { useState, useEffect } from 'react';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    Timestamp,
    updateDoc,
    doc
} from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { Purchase, Product, User } from '@/types/database';
import Link from 'next/link';
import toast from 'react-hot-toast';


export default function MasterDashboard() {
    const wallet = useAnchorWallet();
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalSales: 0,
        totalRevenue: 0,
        totalHolders: 0,
        activeSellers: 0,
        inactiveProducts: 0
    });
    const [recentSales, setRecentSales] = useState<Purchase[]>([]);
    const [topProducts, setTopProducts] = useState<Product[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allSellers, setAllSellers] = useState<{ id: string, sales: number, listings: number }[]>([]);
    const [allBuyers, setAllBuyers] = useState<{ id: string, purchases: number, totalSpent: number }[]>([]);

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'users'>('overview');

    useEffect(() => {
        if (wallet?.publicKey) {
            fetchMasterData();
        }
    }, [wallet?.publicKey]);


    const fetchMasterData = async () => {
        setLoading(true);
        try {
            // 1. Fetch All Products
            const prodSnap = await getDocs(collection(db, 'Products'));
            const prods = prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
            setAllProducts(prods);

            // 2. Fetch All Purchases
            const purchSnap = await getDocs(collection(db, 'Purchases'));
            const allPurchases = purchSnap.docs.map(d => {
                const data = d.data();
                return {
                    ...data,
                    purchasedAt: data.purchasedAt?.toDate ? data.purchasedAt.toDate() : new Date(data.purchasedAt)
                } as Purchase;
            }).sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());

            // 3. Calculate Global Stats
            const totalRevenue = allPurchases.reduce((acc, p) => acc + (p.pricePaid || 0), 0);
            const sellerMap: Record<string, { id: string, sales: number, listings: number }> = {};
            const buyerMap: Record<string, { id: string, purchases: number, totalSpent: number }> = {};

            prods.forEach(p => {
                if (!sellerMap[p.sellerId]) sellerMap[p.sellerId] = { id: p.sellerId, sales: 0, listings: 0 };
                sellerMap[p.sellerId].listings++;
                sellerMap[p.sellerId].sales += p.totalSales || 0;
            });

            allPurchases.forEach(p => {
                if (!buyerMap[p.buyerId]) buyerMap[p.buyerId] = { id: p.buyerId, purchases: 0, totalSpent: 0 };
                buyerMap[p.buyerId].purchases++;
                buyerMap[p.buyerId].totalSpent += p.pricePaid || 0;
            });

            setStats({
                totalProducts: prods.length,
                totalSales: allPurchases.length,
                totalRevenue,
                totalHolders: Object.keys(buyerMap).length,
                activeSellers: Object.keys(sellerMap).length,
                inactiveProducts: prods.filter(p => !p.isActive).length
            });

            setRecentSales(allPurchases.slice(0, 50));
            setTopProducts([...prods].sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0)).slice(0, 10));
            setAllSellers(Object.values(sellerMap).sort((a, b) => b.sales - a.sales));
            setAllBuyers(Object.values(buyerMap).sort((a, b) => b.totalSpent - a.totalSpent));

        } catch (err) {
            console.error('Master fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleProductGlobal = async (productId: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, 'Products', productId), { isActive: !currentStatus });
            toast.success(`Asset protocol ${!currentStatus ? 'restored' : 'suspended'}`);
            fetchMasterData();
        } catch (error) {
            toast.error('Protocol override failed.');
        }
    };

    if (!wallet?.publicKey) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-10 text-center">
                <div className="text-6xl mb-8 animate-pulse text-zinc-800">🔌</div>
                <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white mb-2">Login Required</h1>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest max-w-xs">Connect your wallet to oversee global marketplace protocols.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-10 text-center">
                <div className="text-3xl mb-4 text-brand animate-spin">💠</div>
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Decrypting Marketplace Node...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 p-6 md:p-12 text-zinc-100">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Global Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-10">
                    <div>
                        <div className="text-[8px] md:text-[10px] font-black text-brand uppercase tracking-[0.4em] mb-3 md:mb-4">ShipQuest Nexus</div>
                        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">Global <span className="text-brand">Overwatch</span></h1>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex bg-zinc-900/80 p-1 rounded-2xl border border-white/10 overflow-x-auto scrollbar-hide">
                        {['overview', 'assets', 'users'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer whitespace-nowrap ${activeTab === tab
                                    ? 'bg-brand text-white shadow-glow'
                                    : 'text-zinc-500 hover:text-white'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Macro Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {[
                                { label: 'Active Sellers', value: stats.activeSellers, emoji: '⚓', color: 'text-brand' },
                                { label: 'Unique Buyers', value: stats.totalHolders, emoji: '👥', color: 'text-white' },
                                { label: 'Total Listings', value: stats.totalProducts, emoji: '📦', color: 'text-white' },
                                { label: 'Settled Sales', value: stats.totalSales, emoji: '⚡', color: 'text-emerald-500' },
                                { label: 'Market Cap', value: stats.totalRevenue.toLocaleString(), emoji: '💎', color: 'text-brand' },
                                { label: 'Failed Protocols', value: stats.inactiveProducts, emoji: '🚫', color: 'text-red-500' },
                            ].map((s, i) => (
                                <div key={i} className="bg-zinc-900/50 p-6 md:p-8 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-10 text-2xl group-hover:scale-110 transition-transform">{s.emoji}</div>
                                    <div className={`text-lg md:text-xl font-black tabular-nums tracking-tighter mb-1 ${s.color}`}>{s.value}{i === 4 && <span className="text-[10px] ml-1">SHIP</span>}</div>
                                    <div className="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-tight">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="grid lg:grid-cols-3 gap-12">
                            {/* Live Sale Stream */}
                            <div className="lg:col-span-2 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-black uppercase italic tracking-tighter">Live Transaction Feed</h2>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Network Active</span>
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                </div>

                                <div className="bg-zinc-900/30 rounded-2xl border border-white/5 overflow-x-auto scrollbar-hide">
                                    <table className="w-full text-left min-w-[600px]">
                                        <thead className="bg-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                            <tr>
                                                <th className="px-6 py-4">Product Descriptor</th>
                                                <th className="px-6 py-4">Settlement</th>
                                                <th className="px-6 py-4">On-Chain Sig</th>
                                                <th className="px-6 py-4 text-right">Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 font-medium">
                                            {recentSales.map(sale => (
                                                <tr key={sale.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-5">
                                                        <div className="text-xs font-black text-white group-hover:text-brand transition-colors">{sale.productTitle}</div>
                                                        <div className="text-[9px] text-zinc-500 font-mono mt-0.5">BUYER: {sale.buyerId.slice(0, 16)}...</div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="text-xs font-black text-brand">{sale.pricePaid.toLocaleString()} SHIP</div>
                                                        <div className="text-[9px] text-zinc-500 uppercase tracking-tighter">Instant Settle</div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <a href={`https://solscan.io/tx/${sale.txSignature}`} target="_blank" className="text-[10px] font-mono text-zinc-500 hover:text-white underline underline-offset-4 opacity-60 hover:opacity-100">
                                                            {sale.txSignature.slice(0, 12)}...
                                                        </a>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <div className="text-[10px] text-zinc-400 font-black">{new Date(sale.purchasedAt).toLocaleDateString()}</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Top Performing Assets */}
                            <div className="space-y-8">
                                <h2 className="text-xl font-black uppercase italic tracking-tighter">Macro Leaderboard</h2>
                                <div className="space-y-4">
                                    {topProducts.map((p, i) => (
                                        <div key={p.id} className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-brand/40 transition-all cursor-pointer group">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-black text-[9px] text-zinc-500 group-hover:text-brand transition-colors">#{i + 1}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-black text-white truncate uppercase">{p.title}</div>
                                                <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest leading-none mt-1">{p.totalSales} Units</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-black text-emerald-500">{(p.totalSales * p.priceShip).toLocaleString()}</div>
                                                <div className="text-[8px] text-zinc-500 font-black uppercase">Vol.</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'assets' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between border-b border-white/5 pb-6">
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Global Asset Protocol Control</h2>
                            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{allProducts.length} Total Registered Assets</div>
                        </div>

                        <div className="bg-zinc-900/30 rounded-2xl border border-white/5 overflow-x-auto scrollbar-hide">
                            <table className="w-full text-left min-w-[800px]">
                                <thead className="bg-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                    <tr>
                                        <th className="px-6 py-4">Asset Title</th>
                                        <th className="px-6 py-4">Uploader / Seller</th>
                                        <th className="px-6 py-4">Unit Price</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Master Override</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {allProducts.map(p => (
                                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center text-xl overflow-hidden">
                                                        {p.coverImage ? <img src={p.coverImage} className="w-full h-full object-cover" /> : p.icon}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-black text-white uppercase italic">{p.title}</div>
                                                        <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{p.category}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-[10px] font-mono text-zinc-400">{p.sellerId.slice(0, 16)}...</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-xs font-black text-brand tabular-nums">{p.priceShip.toLocaleString()} SHIP</div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${p.isActive
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                    }`}>
                                                    {p.isActive ? 'Active' : 'Suspended'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button
                                                    onClick={() => toggleProductGlobal(p.id, p.isActive)}
                                                    className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${p.isActive
                                                        ? 'bg-zinc-800 text-red-500 hover:bg-red-500 hover:text-white'
                                                        : 'bg-zinc-800 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                                                        }`}
                                                >
                                                    {p.isActive ? 'Suspend' : 'Unsuspend'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="grid lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Sellers Intelligence */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                                <h2 className="text-xl font-black uppercase italic tracking-tighter">Verified Sellers</h2>
                                <span className="bg-brand text-white text-[9px] font-black px-3 py-1 rounded-full uppercase">{allSellers.length}</span>
                            </div>
                            <div className="space-y-3">
                                {allSellers.map(seller => (
                                    <div key={seller.id} className="bg-zinc-900/30 p-6 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-white/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-black text-brand">⚓</div>
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-mono text-zinc-100 italic">{seller.id.slice(0, 24)}...</div>
                                                <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-1">{seller.listings} Active Listings</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-black text-brand tabular-nums">{seller.sales}</div>
                                            <div className="text-[8px] text-zinc-500 uppercase font-black">Total Sales</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Buyers Intelligence */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                                <h2 className="text-xl font-black uppercase italic tracking-tighter">Ecosystem Holders</h2>
                                <span className="bg-zinc-800 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase">{allBuyers.length}</span>
                            </div>
                            <div className="space-y-3">
                                {allBuyers.map(buyer => (
                                    <div key={buyer.id} className="bg-zinc-900/30 p-6 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-white/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-black text-white group-hover:text-brand transition-colors italic">S</div>
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-mono text-zinc-100 italic">{buyer.id.slice(0, 24)}...</div>
                                                <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-1">{buyer.purchases} Assets Decrypted</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-black text-emerald-500 tabular-nums">{buyer.totalSpent.toLocaleString()}</div>
                                            <div className="text-[8px] text-zinc-500 uppercase font-black">SHIP Expended</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
