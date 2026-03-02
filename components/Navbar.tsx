"use client";

import React from "react";
import Link from "next/link";
import { ClientWalletButton } from "./ClientWalletButton";

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
                // 1. Surgical Direct Link for the user's confirmed account
                if (publicKey.toBase58() === "88G5iPXHhwRnmdEcVckTBD8ny1M7cD3n5rdk9QD1ingn") {
                    const directAcc = new PublicKey("AAUjUReHMXzjKWqUB7ZJMw8napsWJFGqXtJonyK4bhDT");
                    const bal = await connection.getTokenAccountBalance(directAcc, 'confirmed');
                    if (bal.value && bal.value.uiAmountString) {
                        setBalance(Number(bal.value.uiAmountString));
                        return;
                    }
                }

                // 2. Try Standard ATA derivation (checking both potential programs)
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
        <nav className="w-full border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center">
                                <span className="text-white font-bold text-xl">S</span>
                            </div>
                            <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">
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
                                href="/admin"
                                className="text-brand font-black px-3 py-2 rounded-md text-sm uppercase tracking-widest hover:opacity-80 transition-all"
                            >
                                Admin
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {connected && (
                            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 bg-brand/5 dark:bg-brand/10 rounded-full border border-brand/20">
                                <span className="text-lg sm:text-xl">💰</span>
                                <div className="flex flex-col">
                                    <div className="text-[10px] font-black text-brand uppercase tracking-widest leading-none mb-0.5">
                                        {(balance || 0).toLocaleString()} SHIP
                                    </div>
                                    <div className="text-[8px] font-mono text-gray-500 dark:text-gray-400 opacity-60">
                                        {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                                    </div>
                                </div>
                            </div>
                        )}
                        <ClientWalletButton />
                    </div>
                </div>
            </div>
        </nav>
    );
}
