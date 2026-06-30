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

// Root endpoint
app.get("/", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SEO Analyzer API</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: #0d0e12;
                    color: #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                }
                .card {
                    background: rgba(21, 23, 30, 0.8);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    padding: 40px;
                    border-radius: 24px;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                    max-width: 400px;
                    width: 90%;
                }
                .icon {
                    font-size: 48px;
                    color: #10b981;
                    margin-bottom: 20px;
                }
                h1 {
                    font-size: 24px;
                    margin: 0 0 10px 0;
                    color: #ffffff;
                    font-weight: 600;
                }
                p {
                    color: #94a3b8;
                    font-size: 15px;
                    line-height: 1.5;
                    margin: 0 0 24px 0;
                }
                .badge {
                    display: inline-block;
                    padding: 6px 16px;
                    background-color: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    color: #10b981;
                    border-radius: 99px;
                    font-size: 13px;
                    font-weight: 500;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">✓</div>
                <h1>It is working!</h1>
                <p>The SEO Analyzer backend API is online and running successfully on Vercel.</p>
                <div class="badge">Status: Online</div>
            </div>
        </body>
        </html>
    `);
});

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