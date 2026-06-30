// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import rankRoutes from "./routes/rankRoutes.js";
import analyseRoutes from "./routes/analyseRoutes.js";
import stripeRoutes from "./routes/stripeRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rank", rankRoutes);
app.use("/api/analyse", analyseRoutes); // Add analysis routes
app.use("/api/stripe", stripeRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is running",
        timestamp: new Date().toISOString()
    });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Connected to MongoDB");
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`✅ Auth routes: http://localhost:${PORT}/api/auth`);
            console.log(`✅ Rank routes: http://localhost:${PORT}/api/rank`);
            console.log(`✅ Analyse routes: http://localhost:${PORT}/api/analyse`);
            console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    });

// Error handling middleware (optional)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: "Something went wrong!",
        error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
});

// Handle 404 routes (should be last)
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});