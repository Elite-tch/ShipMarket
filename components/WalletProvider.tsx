"use client";

import React, { FC, useMemo } from "react";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

import "@solana/wallet-adapter-react-ui/styles.css";
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";

interface Props {
    children: React.ReactNode;
}

export const WalletContextProvider: FC<Props> = ({ children }) => {
    // Set to 'mainnet-beta' for production
    const network = WalletAdapterNetwork.Mainnet;

    // Use a high-priority Helius RPC to avoid 403 Forbidden errors
   const endpoint = useMemo(
  () => process.env.NEXT_PUBLIC_RPC!,
  []
);
    // `@solana/wallet-adapter-wallets` is no longer fully needed for Phantom/Solflare
    // but explicit adapters help with mobile deep-linking issues
    const wallets = useMemo(
        () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
