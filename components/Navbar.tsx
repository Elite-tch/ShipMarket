"use client";

import React from "react";
import Link from "next/link";
import { ClientWalletButton } from "./ClientWalletButton";
import Image from "next/image";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { SHIP_TOKEN_MINT } from "@/lib/anchor";
import { PublicKey } from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    getAccount,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";
import { useState, useEffect } from "react";

// Admin check
const MASTER_ADMIN = "4KWDP6DpqrhB7Cm1fgFZFC1JYyikdo4oCKyiZ56xpump";

export function Navbar() {
    const { connected, publicKey } = useWallet();
    const { connection } = useConnection();
    const [balance, setBalance] = useState<number>(0);

    useEffect(() => {
        const fetchBalance = async () => {
            if (!connected || !publicKey) return;

            // Debugging as per user suggestion
            console.log("Wallet:", publicKey.toBase58());
            console.log("Mint in code:", SHIP_TOKEN_MINT.toBase58());

            try {
                // Try Standard ATA derivation (checking both potential programs)
                const [ataStd, ata2022] = await Promise.all([
                    getAssociatedTokenAddress(SHIP_TOKEN_MINT, publicKey, false, TOKEN_PROGRAM_ID),
                    getAssociatedTokenAddress(SHIP_TOKEN_MINT, publicKey, false, TOKEN_2022_PROGRAM_ID)
                ]);

                const [resStd, res2022] = await Promise.all([
                    connection.getTokenAccountBalance(ataStd, 'confirmed').catch(() => null),
                    connection.getTokenAccountBalance(ata2022, 'confirmed').catch(() => null)
                ]);

                const balStd = Number(resStd?.value?.uiAmountString || 0);
                const bal2022 = Number(res2022?.value?.uiAmountString || 0);

                setBalance(Math.max(balStd, bal2022));
            } catch (err: any) {
                if (err?.message?.includes('403')) return;

                // 3. Last resort scan
                try {
                    const res = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: SHIP_TOKEN_MINT }, 'confirmed');
                    if (res.value.length > 0) {
                        const info = res.value[0].account.data.parsed.info;
                        setBalance(Number(info.tokenAmount.uiAmountString || 0));
                    }
                } catch { /* Silent */ }
            }
        };
        fetchBalance();
        const timer = setInterval(fetchBalance, 10000);
        return () => clearInterval(timer);
    }, [connected, publicKey, connection]);

    return (
        <>
            <nav className="w-full border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <Link href="/" className="flex items-center  flex-shrink-0">
                                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
                                    <Image src="/logo.png" alt="Ship" width={28} height={28} />
                                </div>
                                <span className="font-bold text-lg md:text-xl tracking-tight text-gray-900 dark:text-white">
                                    ShipMarket
                                </span>
                            </Link>
                            <div className="hidden md:ml-10 md:flex md:space-x-8">
                                <Link
                                    href="/marketplace"
                                    className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    Marketplace
                                </Link>
                                <Link
                                    href="/my-inventory"
                                    className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    My Inventory
                                </Link>

                                <Link
                                    href="/creators-hub"
                                    className="hidden md:flex text-brand font-black px-3 py-2 rounded-md text-sm uppercase tracking-widest hover:opacity-80 transition-all border border-brand/20 ml-4 shadow-sm"
                                >
                                    Creator Hub
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4">
                            {connected && (
                                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-brand/5 dark:bg-brand/10 rounded-full border border-brand/20">
                                    <span className="text-base">💰</span>
                                    <div className="flex flex-col">
                                        <div className="text-[9px] font-black text-brand uppercase tracking-widest leading-none">
                                            {(balance || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <ClientWalletButton />
                        </div>
                    </div>
                </div>
            </nav>

            {/* Bottom Mobile Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-t border-gray-200 dark:border-zinc-800 px-6 py-4 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-center max-w-lg mx-auto">
                    <Link href="/" className="flex flex-col items-center gap-1 group">
                        <span className="text-xl group-active:scale-90 transition-transform">🛰️</span>
                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-500 dark:text-gray-400">Home</span>
                    </Link>
                    <Link href="/marketplace" className="flex flex-col items-center gap-1 group">
                        <span className="text-xl group-active:scale-90 transition-transform">🛸</span>
                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-500 dark:text-gray-400">Market</span>
                    </Link>
                    <Link href="/my-inventory" className="flex flex-col items-center gap-1 group">
                        <span className="text-xl group-active:scale-90 transition-transform">📦</span>
                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-500 dark:text-gray-400">Inventory</span>
                    </Link>
                    <Link href="/creators-hub" className="flex flex-col items-center gap-1 group">
                        <span className="text-xl group-active:scale-90 transition-transform text-brand">⚓</span>
                        <span className="text-[10px] font-black uppercase tracking-tighter text-brand">Creator Hub</span>
                    </Link>
                </div>
            </div>
        </>
    );
}
