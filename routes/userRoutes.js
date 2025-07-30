import express from 'express';
import admin from 'firebase-admin';
import verifyAdmin from '../middleware/verifyadmin.js';

const router = express.Router();

// Make sure Firebase Admin is initialized elsewhere in your app
// Example: admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

router.get('/users',verifyAdmin, async (req, res) => {
    try {
        const usersRef = admin.firestore().collection('users');
        const snapshot = await usersRef.get();
        const users = [];
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users', details: error.message });
    }
});

export default router;
