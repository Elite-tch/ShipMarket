const admin = require('firebase-admin');
const fs = require('fs');

// Raw key from your input
const privateKey = "-----BEGIN PRIVATE KEY-----" +
    "\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC65GV/qJwvzXjB" +
    "\nqu/aFDT0uBquJOG6x2PpFLabmdcc4AG5EznfGQ8zWnqyO/fsSxiQywYLaldbnkcV" +
    "\nDyw8kB1z3Uus4TQeJs2nBPv8bbZoKZD/31aRar1FzCOfjWmGEmNMZa+XYoK+AXwc" +
    "\nLlRiN9oh5/siP8kvM+KR/S9AzS2+x0R6Q5wOYZkh5607xbM6ZT0W/DMZZ/IzKbY6" +
    "\nDflk1/zVvmdhs/H0mDspyp0PIsiQLl5JeKNtvDdVshoRvs2GnQW6h3ILvppjCVvO" +
    "\nKzTwQlh7/NMD/nY/I3FWmAs8pz8g9L4Hx/yRa0yQkwaitzZ6eY7NuqEG/nf0iKX1" +
    "\nkAaKs37xAgMBAAECggEADO4bVZiJQcdnSOLg2EeDSGu/sM0CxFo3f9s717UY4bm1" +
    "\nH3mvNyUJMluFV0p4gyPI7c+WD051VR80uhtuyzvfRce0N3WXQP9x7/xoy1Sd2kQH" +
    "\nRk9Mh8qzkJ4ogsk/rpPGxJ+DuqdeoJ2tWVfH5R8JxkRsprh0sgGBdennOIZZhAmF" +
    "\nWfpt9GS0pORVf2K7ISX1UJxo3tPYnHnREi2gEUi8UFE/99Y1bDCTXMbPNBh7VGZS" +
    "\nQJask1Ul6fFn9fYRXrlqwxO1LDSvF8EkTayxRqOEiJ+7UHMsYgb0TnJoA4T/winD" +
    "\n/5CLrX/Mb5Wsnj40T93Pr8xg1FZnmvHJN8pMT9XVtwKBgQDjNzGIAD5jFeSf0lsd" +
    "\ncQ8/3PufmL6O0GF+iz0c+t7TOLo7AcyNzJdZodUcTcIApDZidto6TcCW+nPOvWUe" +
    "\njIer2z0N1oGDoccF580uRHKOR8I+oNoXhsTLa+f+9o4B2SuUxJdKavStZPFbarut" +
    "\nAF8ma7zvE6pheiAtUBTK3aut0wKBgQDSkXpdOAWftOnz4R4vJgxKttxZPbdDF11f" +
    "\nkoJBJ0ulOHdrtWv0XuumJK7OdZt+jvONaRR6fteefPNqJTuP5dq8mkdzaPlDaLT0" +
    "\ntsft7ED7m61beXtw6tN7q9hJmAMhAOYM32AgqyfVz8ry19dCG3WgKMY5o/N1mnIs" +
    "\nWt5JapsxqwKBgQDIVgneGBjp1IvYPukHdIA1luplNZAO67yKjso7mxaMth+9l0B8" +
    "\Zj+sT/xPEGBVoHQzLQgNEDEW7YzeZC+cV9vns06JvPBE14dbtZ47hS5cNPkXr0uc" +
    "\nIr+xfFr5evqKtqiuawfaHaPOnooQSHNhfkpm3eegBH7do4hra4hptjmA8QKBgEMz" +
    "\nAD0NquXMA7m8Bzj+yH9zmiC0zG6R30+n3v/R/ZctzRbHoDstq8CrBkqHR+d80Yc4" +
    "\nmLt7DW7b64bdeQO0VDlKdzECuEHmAZHzXxy0AA0MIqgFvfpMRs+6CN17sMvwkHpd" +
    "\nMz1Zwe2/UcJsVZsYTlKdkJ1GkGTgtD0phrUhW4PfAoGBAN2WHQvyw0pSK6/KIWl9" +
    "\nRNxP8Til2lS4s2jP0RbPLgCB/b5JnVV85v/H8Qt9Sk8HD/Lex7lIL/Pb1FlJ7QuM" +
    "\nGZ1JDrTRzHksQiYAweXfRa6W5R9uaTWM/beLcnk1LvChtTPKzjSfc2FAanw8Kzhh" +
    "\n7Z1/kmsQDXh+x3IYKIDdrcN3" +
    "\n-----END PRIVATE KEY-----\n";

const serviceAccount = {
    projectId: "shipmarket-8de8f",
    clientEmail: "firebase-adminsdk-fbsvc@shipmarket-8de8f.iam.gserviceaccount.com",
    privateKey: privateKey
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// THE ACTION: Create your admin user directly
// Replace this with your actual wallet address if different
const walletAddress = "6heYLiVhJT4q51iv81Q9QEgktT6y3YyJxZmxHSTUAaXb";

async function seed() {
    console.log('🌱 Seeding user role...');
    try {
        await db.collection('Users').doc(walletAddress).set({
            id: walletAddress,
            walletAddress: walletAddress,
            role: 'steward',
            level: 1,
            xp: 0,
            totalTokensEarned: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('✅ Success! User', walletAddress, 'is now a Steward.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

seed();
