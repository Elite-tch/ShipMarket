import * as admin from "firebase-admin";

// Create a new stringified private key by formatting string in .env
// Example: FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Format the private key cleanly on Vercel/Local
                privateKey: process.env.FIREBASE_PRIVATE_KEY
                    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/['"]/g, "").trim()
                    : undefined,
            }),
        });
    } catch (error) {
        console.log("Firebase admin initialization error", error);
    }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth };
