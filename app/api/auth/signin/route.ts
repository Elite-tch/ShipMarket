import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

export async function POST(req: NextRequest) {
    try {
        const { signature, message, publicKey } = await req.json();

        if (!signature || !message || !publicKey) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        // Verify the signature
        const signatureUint8 = new Uint8Array(signature);
        const messageUint8 = new Uint8Array(new TextEncoder().encode(message));
        const pubKeyUint8 = bs58.decode(publicKey);

        const verified = nacl.sign.detached.verify(messageUint8, signatureUint8, pubKeyUint8);
        if (!verified) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // Create Firebase custom token
        const customToken = await adminAuth.createCustomToken(publicKey);

        // Upsert user in Firestore
        const userRef = adminDb.collection('Users').doc(publicKey);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            await userRef.set({
                id: publicKey,
                walletAddress: publicKey,
                level: 1,
                xp: 0,
                role: 'explorer',
                totalTokensEarned: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        return NextResponse.json({ token: customToken });
    } catch (error: any) {
        console.error('Auth error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
