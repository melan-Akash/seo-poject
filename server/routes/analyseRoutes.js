import express from "express";
import {
    analyzeUrl,
    getAnalysis,
    getUserAnalyses,
    deleteAnalysis,
    getAnalysisStats,
    rerunAnalysis
} from "../controllers/analyseController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(auth);

// Analysis routes
router.post("/analyze", analyzeUrl);                          // Start a new analysis
router.get("/analyses", getUserAnalyses);                    // Get all analyses for user
router.get("/analyses/stats", getAnalysisStats);             // Get analysis statistics
router.get("/analyses/:id", getAnalysis);                    // Get specific analysis by ID
router.put("/analyses/:id/rerun", rerunAnalysis);            // Re-run analysis
router.delete("/analyses/:id", deleteAnalysis);              // Delete analysis

export default router;