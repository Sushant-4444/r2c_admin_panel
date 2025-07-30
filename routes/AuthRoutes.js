import express from "express";
import admin from "firebase-admin";


const router = express.Router();


router.post("/google-signin", async (req, res) => {
  const idToken = req.headers['id-token'];
  console.log("Received ID token:", idToken);
  if (!idToken) {
    return res.status(400).json({ message: "ID token is required." });
  }

  try {
    // Get Firebase services inside the route handler to ensure Firebase is initialized
    const auth = admin.auth();
    const db = admin.firestore();
    const FieldValue = admin.firestore.FieldValue;
    
    const decodedToken = await auth.verifyIdToken(idToken);
    const { uid, email: rawEmail, name, picture } = decodedToken;
    const email = rawEmail ? rawEmail.toLowerCase() : null;
    console.log("UUID:", uid);

    if (!email) {
      return res
        .status(400)
        .json({ message: "Email not available from Google token." });
    }

    // Check if user exists in the database
    const userProfileRef = db.collection("users").doc(uid);
    const userProfileSnap = await userProfileRef.get();

    if (!userProfileSnap.exists) {
      // No new user registration allowed for admin panel
      return res
        .status(403)
        .json({
          message: "Access denied. Only existing admin users can sign in. Please contact the system administrator."
        });
    }

    const userProfileData = userProfileSnap.data();

    // Check if user has admin role
    if (userProfileData.role !== "admin") {
      return res
        .status(403)
        .json({
          message: "Access denied. Admin privileges required."
        });
    }

    // Update last login time for existing admin user
    const updates = {
      lastLoginAt: FieldValue.serverTimestamp(),
      displayName: name || userProfileData.displayName,
      photoURL: picture || userProfileData.photoURL,
      email,
    };

    await userProfileRef.update(updates);

    const updatedUserProfile = {
      ...userProfileData,
      ...updates,
      lastLoginAt: new Date(),
    };

    res.status(200).json({
      message: "Admin sign-in successful",
      uid,
      userProfile: updatedUserProfile,
    });

  } catch (error) {
    console.error("Authentication error:", error);
    if (error.code === "auth/id-token-expired") {
      return res
        .status(401)
        .json({ message: "Token expired, please sign in again." });
    }
    res
      .status(403)
      .json({ message: "Authentication failed", error: error.message });
  }
});

export default router;
