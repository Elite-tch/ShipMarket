import * as admin from "firebase-admin";

// Create a new stringified private key by formatting string in .env
// Example: FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
if (!admin.apps.length) {
    try {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (privateKey) {
            // Handle quotes if present
            if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
                privateKey = privateKey.substring(1, privateKey.length - 1);
            }
            // Replace literal \n with actual newlines
            privateKey = privateKey.replace(/\\n/g, '\n');
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
        console.log("Firebase Admin Initialized Successfully");
    } catch (error) {
        console.error("Firebase admin initialization error:", error);
    }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth };
