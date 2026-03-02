"use client";

import React, { useState, useEffect } from 'react';

import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { getGlobalStats } from '@/lib/firebaseUtils';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { Purchase, Product, ProductCategory } from '@/types/database';
import toast from 'react-hot-toast';

const CATEGORIES: { id: ProductCategory; label: string; emoji: string }[] = [
    { id: 'course', label: 'Course', emoji: '📚' },
    { id: 'template', label: 'Template', emoji: '🗂️' },
    { id: 'design', label: 'Design', emoji: '🎨' },
    { id: 'marketing', label: 'Marketing', emoji: '📣' },
    { id: 'trading', label: 'Trading', emoji: '📈' },
    { id: 'tools', label: 'Tool', emoji: '🛠️' },
    { id: 'other', label: 'Other', emoji: '📦' },
];

export default function AdminDashboard() {

    const wallet = useAnchorWallet();

    const [stats, setStats] = useState({ totalUsers: 0, totalPurchases: 0, totalShipSpent: 0 });
    const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priceShip, setPriceShip] = useState('');
    const [category, setCategory] = useState<ProductCategory>('course');
    const [icon, setIcon] = useState('📦');
    const [deliveryUrl, setDeliveryUrl] = useState('');
    const [tags, setTags] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Image Upload State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);



    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        if (!wallet?.publicKey) return;
        setLoading(true);
        const walletAddr = wallet.publicKey.toBase58();
        try {
            // Fetch products and filter in-memory to avoid index errors
            const prSnap = await getDocs(collection(db, 'Products'));
            const userProducts = prSnap.docs
                .map(d => ({ id: d.id, ...d.data() } as Product))
                .filter(p => p.sellerId === walletAddr)
                .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());
            setProducts(userProducts);

            // Fetch purchases and filter in-memory
            const pSnap = await getDocs(collection(db, 'Purchases'));
            const userSales = pSnap.docs
                .map(d => {
                    const data = d.data();
                    return {
                        ...data,
                        purchasedAt: data.purchasedAt?.toDate ? data.purchasedAt.toDate() : new Date(data.purchasedAt)
                    } as unknown as Purchase;
                })
                .filter(p => p.sellerId === walletAddr)
                .sort((a, b) => new Date(b.purchasedAt as any).getTime() - new Date(a.purchasedAt as any).getTime());

            setRecentPurchases(userSales.slice(0, 50));

            // Calculate Seller Stats
            const totalShip = userSales.reduce((acc, p) => acc + (p.pricePaid || 0), 0);
            setStats({
                totalUsers: userProducts.length,
                totalPurchases: userSales.length,
                totalShipSpent: totalShip
            });

        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const uploadToCloudinary = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'blog_upload');

        const res = await fetch(`https://api.cloudinary.com/v1_1/dibwnfwk9/image/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        return data.secure_url;
    };

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet) return toast.error('Connect wallet first.');
        if (!title.trim() || !description.trim() || !priceShip || !deliveryUrl.trim()) {
            return toast.error('Please fill all required fields.');
        }

        setIsAdding(true);
        const tid = toast.loading('Listing product...');
        try {
            let coverImageUrl = '';
            if (imageFile) {
                try {
                    coverImageUrl = await uploadToCloudinary(imageFile);
                } catch (err) {
                    toast.error('Image upload failed. Proceeding without image.', { id: tid });
                }
            } else {
                toast.error('Please upload a product image.', { id: tid });
                setIsAdding(false);
                return;
            }

            const slug = title.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '') + '-' + Math.random().toString(36).substring(2, 6);

            const newProduct: Product = {
                id: slug,
                sellerId: wallet.publicKey.toBase58(),
                title: title.trim(),
                description: description.trim(),
                category,
                icon: '📦', // Default icon since we shifted to coverImage
                coverImage: coverImageUrl,
                priceShip: Math.floor(Number(priceShip)),
                deliveryUrl: deliveryUrl.trim(),
                tags: tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
                isActive: true,
                totalSales: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await setDoc(doc(db, 'Products', slug), {
                ...newProduct,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            toast.success('Product listed successfully!', { id: tid });
            setTitle(''); setDescription(''); setPriceShip(''); setDeliveryUrl(''); setTags('');
            setImageFile(null); setImagePreview('');
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error('Failed to list product.', { id: tid });
        } finally {
            setIsAdding(false);
        }
    };

    const toggleProductStatus = async (id: string, current: boolean) => {
        try {
            await updateDoc(doc(db, 'Products', id), { isActive: !current, updatedAt: serverTimestamp() });
            toast.success(`Product ${!current ? 'Activated' : 'Paused'}`);
            fetchData();
        } catch { toast.error('Failed to update status.'); }
    };



    if (!wallet?.publicKey) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-10 text-center">
                <div className="text-8xl mb-8 animate-pulse">🔌</div>
                <h1 className="text-5xl font-black italic tracking-tighter uppercase mb-4">Connection Required</h1>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.3em] max-w-sm">Connect your Solana wallet to access your Seller Dashboard and product inventory.</p>
            </div>
        );
    }



    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="text-[10px] font-black text-brand uppercase tracking-[0.4em] mb-3 opacity-60">Control Center</div>
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-gray-900 dark:text-white">Creator Dashboard</h1>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { label: 'Your Listings', value: stats.totalUsers, emoji: '📦', color: 'text-gray-900 dark:text-white' },
                        { label: 'Your Sales', value: stats.totalPurchases, emoji: '📈', color: 'text-brand' },
                        { label: 'Total Revenue', value: stats.totalShipSpent.toLocaleString() + ' SHIP', emoji: '💰', color: 'text-emerald-500' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                            <div className="text-3xl mb-4">{s.emoji}</div>
                            <div className={`text-2xl font-black tabular-nums tracking-tighter mb-2 ${s.color}`}>{s.value}</div>
                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{s.label}</div>
                        </div>
                    ))}
                </div>

                <div className="grid  gap-12">
                    {/* Add Product Form */}
                    <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-xl space-y-8">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-2">Deploy New Product</h2>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Digital Resource Marketplace</p>
                        </div>

                        <form onSubmit={handleAddProduct} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Product Title</label>
                                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
                                            className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800/50 p-5 rounded-3xl text-sm font-bold focus:ring-2 focus:ring-brand/40 outline-none transition-all"
                                            placeholder="e.g. Pro DeFi Trading Course" />
                                    </div>

                                    <div className="space-y-2 flex flex-col">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Category</label>
                                        <select value={category} onChange={e => setCategory(e.target.value as ProductCategory)}
                                            className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800/50 p-5 rounded-3xl text-[10px] uppercase font-black tracking-widest focus:ring-2 focus:ring-brand/40 outline-none cursor-pointer">
                                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2 flex flex-col">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Product Image</label>
                                    <label className="relative group cursor-pointer block h-[142px]">
                                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                        <div className={`w-full h-full rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden ${imagePreview ? 'border-brand/50' : 'border-gray-200 dark:border-zinc-800 group-hover:border-brand/40'}`}>
                                            {imagePreview ? (
                                                <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                            ) : (
                                                <>
                                                    <span className="text-2xl mb-2">📸</span>
                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Click to Upload</span>
                                                </>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2 flex flex-col">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Description</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} required
                                    className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800/50 p-5 rounded-3xl text-sm font-medium h-32 resize-none focus:ring-2 focus:ring-brand/40 outline-none transition-all"
                                    placeholder="Briefly explain what's inside..." />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2 flex flex-col">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Base Price ($SHIP)</label>
                                    <input type="number" value={priceShip} onChange={e => setPriceShip(e.target.value)} required min="1"
                                        className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800/50 p-5 rounded-3xl text-sm font-black text-brand focus:ring-2 focus:ring-brand/40 outline-none transition-all"
                                        placeholder="1000" />
                                </div>
                            </div>

                            <div className="space-y-2 flex flex-col">
                                <label className="text-[9px] font-black text-gray -400 uppercase tracking-[0.2em] px-2">Unlockable Delivery URL</label>
                                <input type="url" value={deliveryUrl} onChange={e => setDeliveryUrl(e.target.value)} required
                                    className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800/50 p-5 rounded-3xl text-sm font-medium focus:ring-2 focus:ring-brand/40 outline-none transition-all"
                                    placeholder="https://gdrive.link/123..." />
                                <p className="text-[8px] text-gray-400 font- bold uppercase px-3 tracking-widest mt-1 opacity-60">This remains encrypted until purchase.</p>
                            </div>

                            <div className="space-y-2 flex flex-col">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Tags (Comma separated)</label>
                                <input type="text" value={tags} onChange={e => setTags(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800/50 p-5 rounded-3xl text-sm font-medium focus:ring-2 focus:ring-brand/40 outline-none transition-all"
                                    placeholder="defi, beginner, toolkit..." />
                            </div>

                            <button type="submit" disabled={isAdding}
                                className="w-full bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white py-6 rounded-full font-black uppercase tracking-[0.3em] text-[10px] hover:scale-[1.02] shadow-2xl transition-all active:scale-95 disabled:opacity-50 mt-4">
                                {isAdding ? 'Initializing...' : 'List on Marketplace'}
                            </button>
                        </form>
                    </div>

                    {/* Management List */}
                    <div className="space-y-10">


                        {/* Recent Transactions */}
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm h-[600px] flex flex-col">
                            <div className="p-10 border-b border-gray-50 dark:border-zinc-800">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sales History</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-zinc-800">
                                {recentPurchases.length === 0 ? (
                                    <div className="p-20 text-center text-[10px] font-black text-gray-300 uppercase italic">Silence in the sector.</div>
                                ) : recentPurchases.map(p => (
                                    <div key={p.id} className="p-8 flex items-center justify-between gap-4 group hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-all">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] font-black uppercase truncate text-gray-900 dark:text-white">{p.productTitle}</div>
                                            <div className="text-[8px] font-mono text-gray-400 mt-1 uppercase tracking-tighter">Buyer: {p.buyerId.slice(0, 4)}...{p.buyerId.slice(-4)}</div>
                                        </div>
                                        <div className="text-sm font-black text-brand text-right">
                                            {p.pricePaid.toLocaleString()}
                                            <div className="text-[7px] text-gray-400 uppercase tracking-widest mt-0.5">{new Date(p.purchasedAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Listing Management */}
                <div className="bg-zinc-900 rounded-2xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none text-9xl font-black italic select-none">LISTINGS</div>
                    <div className="flex items-center justify-between mb-12 relative z-10">
                        <h3 className="text-xl font-black text-white uppercase italic tracking-[0.1em] border-l-4 border-brand pl-6">Your Marketplace Inventory</h3>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{products.length} Items Listed</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                        {products.map(p => (
                            <div key={p.id} className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${p.isActive
                                ? 'bg-white/5 border-white/10 hover:border-brand/30'
                                : 'bg-zinc-900/50 border-white/5 opacity-50 gray-scale'
                                }`}>
                                <div className="flex items-center gap-5 mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                                        {p.coverImage ? (
                                            <img src={p.coverImage} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <span className="text-3xl">{p.icon}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-black text-white uppercase truncate italic">{p.title}</div>
                                        <div className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">{p.category}</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 mt-4">
                                    <div className="px-4 py-2 bg-black/40 rounded-xl border border-white/5">
                                        <div className="text-[8px] font-black text-gray-500 uppercase mb-0.5">Sales</div>
                                        <div className="text-xs font-black text-brand tabular-nums">{p.totalSales}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => toggleProductStatus(p.id, p.isActive)}
                                            className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${p.isActive ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'
                                                }`}>
                                            {p.isActive ? 'Pause' : 'Activate'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
