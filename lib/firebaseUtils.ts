import { db } from './firebaseClient';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    getDocs,
    Timestamp
} from 'firebase/firestore';
import { User } from '@/types/database';

/**
 * Updates a user's role
 */
export async function updateUserRole(walletAddress: string, role: string) {
    const userRef = doc(db, 'Users', walletAddress);
    await setDoc(userRef, {
        role: role,
        updatedAt: Timestamp.now()
    }, { merge: true });
}

/**
 * Fetches a user by wallet address
 */
export async function getUserByWallet(walletAddress: string): Promise<User | null> {
    const userRef = doc(db, 'Users', walletAddress);
    const snap = await getDoc(userRef);
    if (snap.exists()) return snap.data() as User;
    return null;
}

/**
 * Returns platform-wide stats (total users, total purchases, etc.)
 */
export async function getGlobalStats() {
    const usersSnap = await getDocs(collection(db, 'Users'));
    const purchasesSnap = await getDocs(collection(db, 'Purchases'));

    let totalShipSpent = 0;
    purchasesSnap.forEach(d => {
        totalShipSpent += (d.data().pricePaid || 0);
    });

    return {
        totalUsers: usersSnap.size,
        totalPurchases: purchasesSnap.size,
        totalShipSpent,
    };
}
