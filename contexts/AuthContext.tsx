"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { auth, db } from '@/lib/firebaseClient';
import { signInWithCustomToken, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { User as ShipUser } from '@/types/database';

interface AuthContextType {
    user: FirebaseUser | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { disconnect } = useWallet();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Monitor Firebase Auth state
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((firebaseUser: FirebaseUser | null) => {
            setUser(firebaseUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signOut = async () => {
        await firebaseSignOut(auth);
        await disconnect();
    };

    return (
        <AuthContext.Provider value={{ user, loading, signOut }}>
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
