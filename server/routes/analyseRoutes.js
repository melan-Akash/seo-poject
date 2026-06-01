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
router.post("/analyze", analyzeUrl);
router.get("/analyses", getUserAnalyses);
router.get("/analyses/stats", getAnalysisStats);
router.get("/analyses/:id", getAnalysis);
router.put("/analyses/:id/rerun", rerunAnalysis);
router.delete("/analyses/:id", deleteAnalysis);

export default router;