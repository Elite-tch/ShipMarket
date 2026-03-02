"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { auth, db } from '@/lib/firebaseClient';
import { signInWithCustomToken, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { User as ShipUser } from '@/types/database';

interface AuthContextType {
    user: FirebaseUser | null;
    shipUser: ShipUser | null;
    loading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { publicKey, signMessage, disconnect } = useWallet();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [shipUser, setShipUser] = useState<ShipUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Monitor Firebase Auth state
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
            setUser(firebaseUser);
            setLoading(false);

            if (firebaseUser) {
                const userRef = doc(db, 'Users', firebaseUser.uid);
                const unsubStore = onSnapshot(userRef, (snapshot: DocumentSnapshot) => {
                    if (snapshot.exists()) {
                        setShipUser(snapshot.data() as ShipUser);
                    }
                });
                return () => unsubStore();
            } else {
                setShipUser(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const signIn = async () => {
        if (!publicKey || !signMessage) return;

        try {
            setLoading(true);
            const message = `Sign in to ShipMarket with your wallet: ${publicKey.toBase58()}`;
            const encodedMessage = new TextEncoder().encode(message);
            const signature = await signMessage(encodedMessage);

            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signature: Array.from(signature),
                    message,
                    publicKey: publicKey.toBase58(),
                }),
            });

            const { token, error } = await response.json();
            if (error) throw new Error(error);

            await signInWithCustomToken(auth, token);
        } catch (err) {
            console.error('Sign in failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
        await disconnect();
    };

    return (
        <AuthContext.Provider value={{ user, shipUser, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
