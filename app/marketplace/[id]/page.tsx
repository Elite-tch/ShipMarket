"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';

import {
    getAssociatedTokenAddress, getAccount,
    TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID,
    createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createTransferCheckedInstruction } from '@solana/spl-token';
import { getMint } from '@solana/spl-token';
import { SHIP_TOKEN_MINT } from '@/lib/anchor';
import { Product, DISCOUNT_TIERS, Purchase, PLATFORM_FEE_PCT } from '@/types/database';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ProductDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const wallet = useAnchorWallet();
    const { connection } = useConnection();


    const [product, setProduct] = useState<Product | null>(null);
    const [shipBalance, setShipBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [purchased, setPurchased] = useState(false);
    const [deliveryUrl, setDeliveryUrl] = useState<string | null>(null);

    const tier = [...DISCOUNT_TIERS].reverse().find(t => shipBalance >= t.minShip) || DISCOUNT_TIERS[0];
    const finalPrice = product ? Math.round(product.priceShip * (1 - tier.discount / 100)) : 0;
    const saved = product ? product.priceShip - finalPrice : 0;

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            try {
                const snap = await getDoc(doc(db, 'Products', id as string));
                if (snap.exists()) setProduct({ id: snap.id, ...snap.data() } as Product);
                else router.push('/marketplace');
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, [id]);

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

    // Check if already purchased
    useEffect(() => {
        const checkPurchase = async () => {
            if (!wallet?.publicKey || !id) return;
            const buyerId = wallet.publicKey.toBase58();
            try {
                const snap = await getDoc(doc(db, 'Purchases', `${buyerId}_${id}`));
                if (snap.exists()) {
                    setPurchased(true);
                    setDeliveryUrl(snap.data().deliveryUrl);
                }
            } catch { }
        };
        checkPurchase();
    }, [wallet?.publicKey, id]);

    const handlePurchase = async () => {
        if (!wallet?.publicKey || !product) return toast.error('Connect your wallet first.');
        const buyerId = wallet.publicKey.toBase58();
        if (shipBalance < finalPrice) return toast.error(`You need ${finalPrice.toLocaleString()} SHIP. You have ${shipBalance.toLocaleString()}.`);

        setPurchasing(true);
        const tid = toast.loading('Processing payment...');

        try {
            const mintAcc = await connection.getAccountInfo(SHIP_TOKEN_MINT);
            if (!mintAcc) return toast.error('Check your internet connection.');
            const programId = mintAcc.owner; // This is the Program ID

            const mintInfo = await getMint(connection, SHIP_TOKEN_MINT, 'confirmed', programId);
            const decimals = mintInfo.decimals;
            const sellerPubkey = new PublicKey(product.sellerId);

            const sellerAmountLamports = BigInt(Math.round(finalPrice * Math.pow(10, decimals)));

            const buyerAta = await getAssociatedTokenAddress(SHIP_TOKEN_MINT, wallet.publicKey, false, programId);
            const sellerAta = await getAssociatedTokenAddress(SHIP_TOKEN_MINT, sellerPubkey, false, programId);

            console.log('Final Transaction Params:', {
                buyer: wallet.publicKey.toBase58(),
                seller: sellerPubkey.toBase58(),
                program: programId.toBase58(),
                amount: finalPrice
            });

            const tx = new Transaction();

            // Ensure seller has ATA
            try {
                await getAccount(connection, sellerAta, 'confirmed', programId);
            } catch (e) {
                console.log('Creating ATA for seller...');
                tx.add(createAssociatedTokenAccountInstruction(
                    wallet.publicKey, sellerAta, sellerPubkey, SHIP_TOKEN_MINT, programId
                ));
            }

            // Transfer to seller
            tx.add(createTransferCheckedInstruction(
                buyerAta, SHIP_TOKEN_MINT, sellerAta, wallet.publicKey,
                sellerAmountLamports, decimals, [], programId
            ));

            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = wallet.publicKey;

            const signed = await wallet.signTransaction(tx);
            const sig = await connection.sendRawTransaction(signed.serialize());
            await connection.confirmTransaction(sig, 'confirmed');

            // Record purchase in Firestore
            const purchaseId = `${buyerId}_${product.id}`;
            const purchase: Purchase = {
                id: purchaseId,
                buyerId: buyerId,
                sellerId: product.sellerId,
                productId: product.id,
                productTitle: product.title,
                pricePaid: finalPrice,
                originalPrice: product.priceShip,
                discountApplied: tier.discount,
                txSignature: sig,
                purchasedAt: new Date(),
                deliveryUrl: product.deliveryUrl,
            };
            await setDoc(doc(db, 'Purchases', purchaseId), purchase);

            // Increment product sales
            await updateDoc(doc(db, 'Products', product.id), { totalSales: increment(1) });

            setPurchased(true);
            setDeliveryUrl(product.deliveryUrl);
            toast.success('Purchase complete! Access unlocked 🎉', { id: tid });
        } catch (err: any) {
            console.error(err);
            toast.error('Purchase failed: ' + (err.message || 'Unknown error'), { id: tid });
        } finally {
            setPurchasing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="text-4xl animate-bounce">🚢</div>
            </div>
        );
    }
    if (!product) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 md:p-10">
            <div className="max-w-5xl mx-auto">
                <Link href="/marketplace" className="inline-flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-brand transition-colors mb-8">
                    ← Back to Marketplace
                </Link>

                <div className="grid lg:grid-cols-5 gap-10">
                    {/* Left — Product Info */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Cover */}
                        <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-gray-100 dark:border-zinc-800 p-16 flex items-center justify-center text-8xl shadow-sm">
                            {product.icon}
                        </div>

                        {/* Details */}
                        <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-gray-100 dark:border-zinc-800 p-10 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-[10px] font-black px-3 py-1.5 bg-brand/10 text-brand rounded-full uppercase tracking-wider">
                                    {product.category}
                                </span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{product.totalSales} sold</span>
                            </div>

                            <h1 className="text-4xl font-black italic tracking-tighter uppercase text-gray-900 dark:text-white mb-6">
                                {product.title}
                            </h1>

                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium text-base mb-8">
                                {product.description}
                            </p>

                            <div className="flex flex-wrap gap-2 mb-8">
                                {product.tags.map(tag => (
                                    <span key={tag} className="text-[10px] font-bold px-3 py-1.5 bg-brand/5 text-brand rounded-xl border border-brand/10 uppercase tracking-wider">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <div className="p-5 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-700/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Sold by: <span className="font-mono text-gray-600 dark:text-gray-300 normal-case tracking-normal">
                                    {product.sellerId.slice(0, 6)}...{product.sellerId.slice(-6)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right — Purchase Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-zinc-900 rounded-[3rem] p-10 border border-white/5 sticky top-24">
                            <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-6">Marketplace Price</div>

                            <div className="mb-8">
                                <div className="text-5xl font-black text-white tabular-nums">
                                    {finalPrice.toLocaleString()}
                                    <span className="text-brand text-2xl ml-2">SHIP</span>
                                </div>
                                {saved > 0 && (
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-gray-500 line-through text-lg">{product.priceShip.toLocaleString()} SHIP</span>
                                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                            {tier.label} tier: -{tier.discount}%
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Tier status */}
                            <div className="p-5 bg-white/5 rounded-2xl border border-white/10 mb-6">
                                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Your Tier</div>
                                <div className="flex items-center justify-between">
                                    <span className="font-black text-white">{tier.label}</span>
                                    <span className="text-[10px] font-black text-brand">{tier.discount > 0 ? `${tier.discount}% OFF` : 'No discount'}</span>
                                </div>
                                <div className="text-[9px] text-gray-500 font-medium mt-1">
                                    Balance: {shipBalance.toLocaleString()} SHIP
                                </div>
                            </div>

                            {purchased && deliveryUrl ? (
                                <div className="space-y-4">
                                    <div className="p-5 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 text-center">
                                        <div className="text-2xl mb-2">🎉</div>
                                        <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Access Unlocked!</div>
                                    </div>
                                    <a
                                        href={deliveryUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block w-full py-5 bg-brand text-white font-black rounded-2xl text-center text-sm uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-lg shadow-brand/30"
                                    >
                                        Access Product →
                                    </a>
                                </div>
                            ) : (
                                <button
                                    onClick={handlePurchase}
                                    disabled={purchasing || !wallet?.publicKey}
                                    className="w-full py-6 bg-brand text-white font-black rounded-2xl text-sm uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-brand/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 cursor-pointer"
                                >
                                    {purchasing ? '🔄 Processing...' : !wallet?.publicKey ? 'Connect Wallet' : `Buy for ${finalPrice.toLocaleString()} SHIP`}
                                </button>
                            )}

                            <div className="mt-6 space-y-3">
                                {[
                                    '🔒 Non-custodial — direct transfer',
                                    '⚡ Instant delivery on-chain confirmation',
                                    '🛡️ Transaction recorded on Solana',
                                ].map(item => (
                                    <div key={item} className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
