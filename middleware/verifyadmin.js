import admin from 'firebase-admin';

const getTokenFromHeader = (req) => {
    const authHeader = req.headers['id-token'];
    return authHeader;
};

async function verifyAdmin(req, res, next) {
    const idToken = getTokenFromHeader(req);
    if (!idToken) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uuid = decodedToken.uid;

        // Fetch user document from Firestore
        const userDoc = await admin.firestore().collection('users').doc(uuid).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        console.log("User Data:", userData);

        if (userData && userData.role === 'admin') {
            req.user = {
                uid: uuid,
                email: userData.email,
                displayName: userData.displayName,
                photoURL: userData.photoURL,
                role: userData.role,
            };
            return next();
        } else {
            return res.status(403).json({ error: 'Access denied: Admins only' });
        }
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

export default verifyAdmin;