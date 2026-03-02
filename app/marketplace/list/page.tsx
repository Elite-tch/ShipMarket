"use client";

import React, { useState } from 'react';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/contexts/AuthContext';
import { Product, ProductCategory, PLATFORM_FEE_PCT } from '@/types/database';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CATEGORIES: { id: ProductCategory; label: string; emoji: string }[] = [
    { id: 'course', label: 'Course / Tutorial', emoji: '📚' },
    { id: 'template', label: 'Template / Starter Kit', emoji: '🗂️' },
    { id: 'design', label: 'Design Asset', emoji: '🎨' },
    { id: 'marketing', label: 'Marketing Resource', emoji: '📣' },
    { id: 'trading', label: 'Trading Guide', emoji: '📈' },
    { id: 'tools', label: 'Tool / Script', emoji: '🛠️' },
    { id: 'other', label: 'Other', emoji: '📦' },
];

export default function ListProductPage() {
    const wallet = useAnchorWallet();
    const { user } = useAuth();
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('📦');
    const [category, setCategory] = useState<ProductCategory>('course');
    const [priceShip, setPriceShip] = useState('100');
    const [deliveryUrl, setDeliveryUrl] = useState('');
    const [tags, setTags] = useState('');
    const [isListing, setIsListing] = useState(false);

    const handleList = async () => {
        if (!wallet || !user) return toast.error('Connect wallet and sign in first.');
        if (!title.trim()) return toast.error('Product name is required.');
        if (!description.trim()) return toast.error('Description is required.');
        if (!deliveryUrl.trim()) return toast.error('Delivery URL is required (where buyers get access).');
        if (!priceShip || parseInt(priceShip) < 1) return toast.error('Price must be at least 1 SHIP.');

        setIsListing(true);
        const tid = toast.loading('Listing your product...');

        try {
            const slug = `${Date.now()}-${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)}`;
            const product: Product = {
                id: slug,
                sellerId: wallet.publicKey.toBase58(),
                title: title.trim(),
                description: description.trim(),
                category,
                icon,
                priceShip: parseInt(priceShip),
                deliveryUrl: deliveryUrl.trim(),
                tags: tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 5),
                isActive: true,
                totalSales: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await setDoc(doc(db, 'Products', slug), product);
            toast.success('Product listed successfully!', { id: tid });
            router.push('/marketplace');
        } catch (err: any) {
            console.error(err);
            toast.error('Listing failed: ' + (err.message || 'Unknown error'), { id: tid });
            setIsListing(false);
        }
    };

    if (!wallet || !user) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-10 text-center">
                <div className="text-5xl mb-6">🔐</div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-3">Connect to List</h1>
                <p className="text-gray-400 text-sm font-medium mb-6">You need a connected and verified wallet to list products.</p>
                <Link href="/marketplace" className="px-8 py-4 bg-brand text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-105 transition-all">
                    ← Back to Marketplace
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
            <div className="max-w-2xl mx-auto px-6 py-12 space-y-10">

                {/* Top Nav */}
                <div className="flex items-center justify-between">
                    <Link href="/marketplace" className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-brand transition-colors">
                        ← Marketplace
                    </Link>
                    <span className="text-[10px] font-black text-brand uppercase tracking-[0.3em] opacity-60">List Product</span>
                </div>

                <div>
                    <h1 className="text-5xl font-black italic tracking-tighter uppercase text-gray-900 dark:text-white">New Listing</h1>
                    <p className="text-sm text-gray-400 font-medium mt-2 leading-relaxed">
                        List your digital product on the SHIP Marketplace. Buyers pay using SHIP tokens. You receive payment directly to your wallet minus the 5% platform fee.
                    </p>
                </div>

                {/* 01 — Product Identity */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 border border-gray-100 dark:border-zinc-800 space-y-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-brand/10 text-brand text-[10px] font-black flex items-center justify-center">01</span>
                        <h2 className="text-sm font-black uppercase tracking-widest">Product Identity</h2>
                    </div>

                    <div className="grid grid-cols-5 gap-4">
                        <div className="col-span-4 space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Product Name</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 p-5 rounded-2xl text-base font-bold focus:ring-2 focus:ring-brand/40 outline-none transition-all"
                                placeholder="e.g. Web3 Marketing Playbook 2025" />
                        </div>
                        <div className="col-span-1 space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Icon</label>
                            <input type="text" value={icon} onChange={e => setIcon(e.target.value)} maxLength={2}
                                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 p-5 rounded-2xl text-3xl text-center focus:ring-2 focus:ring-brand/40 outline-none transition-all" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} minLength={50}
                            className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 p-5 rounded-2xl text-sm font-medium min-h-[120px] focus:ring-2 focus:ring-brand/40 outline-none resize-none transition-all leading-relaxed"
                            placeholder="What does this product include? Who is it for? What will buyers learn or get?" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Category</label>
                        <div className="grid grid-cols-2 gap-3">
                            {CATEGORIES.map(cat => (
                                <button key={cat.id} onClick={() => setCategory(cat.id)}
                                    className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all cursor-pointer ${category === cat.id
                                        ? 'bg-brand/10 border-brand/40 text-brand'
                                        : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500 hover:border-brand/20'
                                        }`}>
                                    <span className="text-xl">{cat.emoji}</span>
                                    <span className="text-[10px] font-black uppercase tracking-wider">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                            Tags <span className="normal-case font-medium">(comma-separated, up to 5)</span>
                        </label>
                        <input type="text" value={tags} onChange={e => setTags(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 p-5 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/40 outline-none transition-all"
                            placeholder="e.g. web3, marketing, beginner, solana, defi" />
                    </div>
                </div>

                {/* 02 — Pricing & Delivery */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 border border-gray-100 dark:border-zinc-800 space-y-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-brand/10 text-brand text-[10px] font-black flex items-center justify-center">02</span>
                        <h2 className="text-sm font-black uppercase tracking-widest">Pricing & Delivery</h2>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Base Price (SHIP)</label>
                        <div className="relative">
                            <input type="number" value={priceShip} onChange={e => setPriceShip(e.target.value)} min={1}
                                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 p-5 pr-20 rounded-2xl text-3xl font-black text-brand focus:ring-2 focus:ring-brand/40 outline-none transition-all"
                                placeholder="100" />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-brand">SHIP</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-3">
                            {[
                                { tier: 'Sailor (100+ SHIP)', label: '5% off', price: Math.round(parseInt(priceShip || '0') * 0.95) },
                                { tier: 'Captain (1K+ SHIP)', label: '15% off', price: Math.round(parseInt(priceShip || '0') * 0.85) },
                                { tier: 'Admiral (10K+ SHIP)', label: '40% off', price: Math.round(parseInt(priceShip || '0') * 0.60) },
                            ].map(({ tier, label, price }) => (
                                <div key={tier} className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 text-center border border-gray-100 dark:border-zinc-700">
                                    <div className="text-[8px] font-bold text-gray-400 uppercase mb-1">{label}</div>
                                    <div className="text-base font-black text-brand">{price.toLocaleString()} SHIP</div>
                                    <div className="text-[7px] text-gray-400 mt-0.5">{tier}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Delivery URL</label>
                        <input type="url" value={deliveryUrl} onChange={e => setDeliveryUrl(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 p-5 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/40 outline-none transition-all"
                            placeholder="https://notion.so/your-product or Google Drive link" />
                        <p className="text-[10px] text-gray-400 font-medium px-1 leading-relaxed">
                            This link is revealed to buyers after payment. Use Google Drive, Notion, Gumroad, or any accessible URL.
                        </p>
                    </div>

                    {/* Revenue breakdown */}
                    <div className="p-6 bg-zinc-900 rounded-2xl border border-white/10 space-y-3">
                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Revenue Breakdown (per sale)</div>
                        {[
                            { label: 'Sale Price', value: `${parseInt(priceShip || '0').toLocaleString()} SHIP`, color: 'text-white' },
                            { label: `Platform Fee (${PLATFORM_FEE_PCT}%)`, value: `-${Math.round(parseInt(priceShip || '0') * PLATFORM_FEE_PCT / 100).toLocaleString()} SHIP`, color: 'text-amber-400' },
                            { label: 'You Receive', value: `${Math.round(parseInt(priceShip || '0') * (1 - PLATFORM_FEE_PCT / 100)).toLocaleString()} SHIP`, color: 'text-brand' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
                                <span className={`text-sm font-black ${color}`}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <button onClick={handleList} disabled={isListing}
                    className="w-full py-8 bg-brand text-white font-black rounded-[2rem] shadow-2xl shadow-brand/30 hover:scale-[1.02] active:scale-[0.98] transition-all text-base uppercase tracking-[0.3em] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 cursor-pointer">
                    {isListing ? 'Listing...' : 'List Product on Marketplace 🚀'}
                </button>

                <p className="text-center text-[10px] text-gray-400 pb-10">
                    By listing, you agree that your delivery URL works and is accessible to buyers after payment.
                </p>
            </div>
        </div>
    );
}
