import express from "express";
import {
    addKeyword,
    getKeywords,
    getKeyword,
    refreshKeyword,
    deleteKeyword,
    toggleKeywordStatus,
    updateAllKeywords,
    getMetrics,
    getHistory,
    getDashboardStats
} from "../controllers/rankController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(auth);

// Basic CRUD operations
router.post("/keywords", addKeyword);
router.get("/keywords", getKeywords);
router.get("/keywords/:id", getKeyword);
router.put("/keywords/:id/refresh", refreshKeyword);
router.put("/keywords/:id/toggle", toggleKeywordStatus);
router.delete("/keywords/:id", deleteKeyword);

// Additional routes
router.post("/keywords/update-all", updateAllKeywords);
router.get("/keywords/:id/metrics", getMetrics);
router.get("/keywords/:id/history", getHistory);
router.get("/dashboard/stats", getDashboardStats);

export default router;