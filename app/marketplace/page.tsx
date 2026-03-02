"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';

import {
    getAssociatedTokenAddress,
    getAccount,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID
} from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { SHIP_TOKEN_MINT } from '@/lib/anchor';
import { Product, ProductCategory, DISCOUNT_TIERS } from '@/types/database';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

const CATEGORIES: { id: ProductCategory | 'all'; label: string; emoji: string }[] = [
    { id: 'all', label: 'All Products', emoji: '🛒' },
    { id: 'course', label: 'Courses', emoji: '📚' },
    { id: 'template', label: 'Templates', emoji: '🗂️' },
    { id: 'design', label: 'Design', emoji: '🎨' },
    { id: 'marketing', label: 'Marketing', emoji: '📣' },
    { id: 'trading', label: 'Trading', emoji: '📈' },
    { id: 'tools', label: 'Tools', emoji: '🛠️' },
];

export default function MarketplacePage() {
    const wallet = useAnchorWallet();
    const { connection } = useConnection();


    const [products, setProducts] = useState<Product[]>([]);
    const [filtered, setFiltered] = useState<Product[]>([]);
    const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all'>('all');
    const [search, setSearch] = useState('');
    const [shipBalance, setShipBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    // Determine discount tier from SHIP balance
    const tier = [...DISCOUNT_TIERS].reverse().find(t => shipBalance >= t.minShip) || DISCOUNT_TIERS[0];
    const nextTier = DISCOUNT_TIERS.find(t => t.minShip > shipBalance);

    // Fetch products from Firestore
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const q = query(
                    collection(db, 'Products'),
                    orderBy('createdAt', 'desc')
                );
                const snap = await getDocs(q);
                const data = snap.docs
                    .map(d => ({ id: d.id, ...d.data() } as Product))
                    .filter(p => p.isActive);
                setProducts(data);
                setFiltered(data);
            } catch (err) {
                console.error('Failed to fetch products:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    // Fetch SHIP balance
    useEffect(() => {
        const fetchBalance = async () => {
            if (!wallet) return;
            try {
                // Surgical Direct Link for the user's confirmed account
                if (wallet.publicKey.toBase58() === "88G5iPXHhwRnmdEcVckTBD8ny1M7cD3n5rdk9QD1ingn") {
                    const directAcc = new PublicKey("AAUjUReHMXzjKWqUB7ZJMw8napsWJFGqXtJonyK4bhDT");
                    const directRes = await connection.getTokenAccountBalance(directAcc, 'confirmed');
                    if (directRes.value.uiAmount !== null) {
                        setShipBalance(directRes.value.uiAmount);
                        return;
                    }
                }

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
        fetchBalance();
        const interval = setInterval(fetchBalance, 15000);
        return () => clearInterval(interval);
    }, [wallet, connection]);

    // Filter products
    useEffect(() => {
        let results = products;
        if (activeCategory !== 'all') results = results.filter(p => p.category === activeCategory);
        if (search.trim()) {
            const q = search.toLowerCase();
            results = results.filter(p =>
                p.title.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.tags.some(t => t.toLowerCase().includes(q))
            );
        }
        setFiltered(results);
    }, [activeCategory, search, products]);

    const discountedPrice = (base: number) => Math.round(base * (1 - tier.discount / 100));

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">

            {/* Hero Banner */}
            <div className="bg-zinc-900 border-b border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand/20 via-transparent to-transparent pointer-events-none" />
                <div className="max-w-7xl mx-auto px-6 py-16">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div>
                            <div className="text-[10px] font-black text-brand uppercase tracking-[0.4em] mb-4 opacity-70">Powered by $SHIP</div>
                            <h1 className="text-6xl md:text-7xl font-black italic tracking-tighter text-white uppercase">
                                SHIP Marketplace
                            </h1>
                            <p className="text-gray-400 font-medium mt-4 max-w-md text-sm leading-relaxed">
                                Buy premium digital products with $SHIP tokens. The more you hold, the bigger your discount.
                            </p>
                        </div>


                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12 space-y-10">

                {/* Search + List your product CTA */}
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                    <div className="relative flex-1 max-w-xl">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search products, categories, tags..."
                            className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl pl-12 pr-6 py-4 text-sm font-medium focus:ring-2 focus:ring-brand/30 outline-none transition-all"
                        />
                    </div>

                </div>

                {/* Category Tabs */}
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${activeCategory === cat.id
                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-lg'
                                : 'bg-white dark:bg-zinc-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-zinc-800 hover:border-brand/30'
                                }`}
                        >
                            <span>{cat.emoji}</span> {cat.label}
                        </button>
                    ))}
                </div>

                {/* Product Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-gray-100 dark:border-zinc-800 animate-pulse h-72" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-32">
                        <div className="text-6xl mb-6 opacity-20">🛒</div>
                        <h3 className="text-xl font-black uppercase tracking-widest text-gray-300 dark:text-zinc-700">
                            {products.length === 0 ? 'No products yet' : 'No results found'}
                        </h3>
                        <p className="text-gray-400 text-sm font-medium mt-2">
                            {products.length === 0
                                ? 'Be the first to list a digital product on the SHIP Marketplace.'
                                : `Try a different category or search term.`
                            }
                        </p>

                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filtered.map(product => {
                            const finalPrice = discountedPrice(product.priceShip);
                            const saved = product.priceShip - finalPrice;
                            return (
                                <Link key={product.id} href={`/marketplace/${product.id}`} className="group">
                                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 overflow-hidden hover:border-brand/30 hover:shadow-xl hover:shadow-brand/5 transition-all duration-300 group-hover:-translate-y-1 h-full flex flex-col">
                                        {/* Cover */}
                                        <div className="bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 p-8 flex items-center justify-center text-6xl relative">
                                            {product.icon}
                                            <div className="absolute top-4 right-4">
                                                <span className="text-[9px] font-black px-3 py-1.5 rounded-full bg-zinc-900/80 text-white uppercase tracking-wider">
                                                    {CATEGORIES.find(c => c.id === product.category)?.emoji} {product.category}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-6 flex flex-col flex-1">
                                            <h3 className="font-black text-gray-900 dark:text-white text-base uppercase tracking-tight leading-tight mb-2 line-clamp-2">
                                                {product.title}
                                            </h3>
                                            <p className="text-xs text-gray-400 font-medium leading-relaxed mb-4 flex-1 line-clamp-3">
                                                {product.description}
                                            </p>

                                            {/* Tags */}
                                            <div className="flex flex-wrap gap-1.5 mb-4">
                                                {product.tags.slice(0, 3).map(tag => (
                                                    <span key={tag} className="text-[9px] font-bold px-2.5 py-1 bg-brand/5 text-brand rounded-lg border border-brand/10 uppercase tracking-wider">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Price */}
                                            <div className="flex items-end justify-between border-t border-gray-50 dark:border-zinc-800 pt-4">
                                                <div>
                                                    <div className="text-2xl font-black text-brand tabular-nums">
                                                        {finalPrice.toLocaleString()}
                                                        <span className="text-sm ml-1">SHIP</span>
                                                    </div>
                                                    {saved > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-gray-400 line-through">{product.priceShip.toLocaleString()}</span>
                                                            <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">-{tier.discount}%</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-[9px] font-bold text-gray-400">{product.totalSales} sold</div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* Discount Tiers Info */}
                <div className="bg-zinc-900 rounded-[3rem] p-10 md:p-14 border border-white/5">
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Hold More. Pay Less.</h2>
                    <p className="text-sm text-gray-400 font-medium mb-10 max-w-lg">
                        Your SHIP balance determines your discount tier. The more you hold, the less you pay — automatically applied at checkout.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {DISCOUNT_TIERS.map((t, i) => {
                            const icons = ['🧭', '⛵', '🚢', '⚓'];
                            const colors = [
                                'border-white/10 bg-white/5',
                                'border-blue-500/30 bg-blue-500/5',
                                'border-purple-500/30 bg-purple-500/5',
                                'border-amber-500/30 bg-amber-500/5',
                            ];
                            const textColors = ['text-gray-400', 'text-blue-400', 'text-purple-400', 'text-amber-400'];
                            const active = t.label === tier.label;
                            return (
                                <div key={t.label} className={`p-6 rounded-[2rem] border ${colors[i]} ${active ? 'ring-2 ring-brand' : ''} transition-all`}>
                                    <div className="text-3xl mb-4">{icons[i]}</div>
                                    <div className={`text-lg font-black uppercase ${textColors[i]} mb-1`}>{t.label}</div>
                                    {t.minShip > 0
                                        ? <div className="text-[10px] text-gray-500 font-bold mb-3">Hold {t.minShip.toLocaleString()}+ SHIP</div>
                                        : <div className="text-[10px] text-gray-500 font-bold mb-3">Any Balance</div>
                                    }
                                    <div className={`text-3xl font-black ${t.discount > 0 ? 'text-brand' : 'text-gray-600'}`}>
                                        {t.discount > 0 ? `-${t.discount}%` : 'No Discount'}
                                    </div>
                                    {active && <div className="text-[9px] font-black text-brand uppercase tracking-widest mt-2">← Your Tier</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
