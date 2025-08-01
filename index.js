import express from "express";
import admin from "firebase-admin";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();
import { createRequire } from "module";
const required = createRequire(import.meta.url);
const serviceAccount = required("./serviceAccountKey.json");

import authroutes from "./routes/AuthRoutes.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK:", error);
  process.exit(1);
}

import userroutes from "./routes/userRoutes.js";
import studyRoutes from "./routes/studyRoutes.js";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGOURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected Successfully.');
    } catch (error) {
        console.error('MongoDB Connection Failed:', error.message);
        process.exit(1);
    }
};
connectDB();


const app = express();
const PORT = process.env.PORT || 5000;

// app.use(cors());
app.use(cors({
  origin: 'http://localhost:5173', // or '*'
  credentials: true
}));
app.use(express.static(path.join(__dirname, 'documents')));
app.use(express.json());
app.use("/auth", authroutes);
app.use("/users", userroutes);
app.use("/studies", studyRoutes);

app.use((_req, res, _next) => {
  res.status(404).json({ message: "Sorry, can't find that route!" });
});
app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err.name, err.message, err.stack);
  res.status(500).json({
    message: "Something broke on the server!",
    error:
      process.env.NODE_ENV === "production"
        ? {}
        : { name: err.name, message: err.message, stack: err.stack },
  });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
