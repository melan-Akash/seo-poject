import KeywordTracking from "../models/KeywordTracking.js";
import { updateKeywordRanking, updateAllUserKeywords } from "../services/keywordTrackingservice.js";

// Add a keyword to track
export const addKeyword = async (req, res) => {
    try {
        const { keyword, url } = req.body;

        if (!keyword || !url) {
            return res.status(400).json({ 
                success: false, 
                message: "Keyword and URL are required" 
            });
        }

        // Extract domain from URL
        let domain;
        try {
            const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
            domain = urlObj.hostname.replace("www.", "");
        } catch {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid URL Format" 
            });
        }

        // Check if already tracking this keyword+domain
        const existing = await KeywordTracking.findOne({ 
            userId: req.user._id,
            keyword: keyword.toLowerCase().trim(),
            domain 
        });

        if (existing) {
            return res.status(400).json({ 
                success: false, 
                message: "Already tracking this keyword for this domain" 
            });
        }

        // Create tracking entry
        const tracking = await KeywordTracking.create({
            userId: req.user._id,
            keyword: keyword.toLowerCase().trim(),
            url: url.startsWith("http") ? url : `https://${url}`,
            domain,
            status: "pending"
        });

        // Trigger initial ranking check asynchronously
        updateKeywordRanking(tracking._id).then(result => {
            console.log(`Initial ranking check for ${keyword}:`, result);
        }).catch(error => {
            console.error(`Initial ranking check failed for ${keyword}:`, error);
        });

        res.status(201).json({ 
            success: true, 
            message: "Keyword tracking started", 
            tracking 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Get all tracking for user
export const getKeywords = async (req, res) => {
    try {
        const keywords = await KeywordTracking.find({ 
            userId: req.user._id 
        }).sort({ createdAt: -1 });

        // Format the response to ensure all fields are present
        const formattedKeywords = keywords.map(kw => ({
            _id: kw._id,
            keyword: kw.keyword,
            url: kw.url,
            domain: kw.domain,
            currentPosition: kw.currentPosition,
            currentPage: kw.currentPage,
            bestPosition: kw.bestPosition,
            positionChange: kw.positionChange,
            active: kw.active,
            lastChecked: kw.lastChecked,
            status: kw.status,
            createdAt: kw.createdAt,
            competitors: kw.competitors || [],
            rankHistory: kw.rankHistory || []
        }));

        res.status(200).json({ 
            success: true, 
            keywords: formattedKeywords 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Get single keyword with full history
export const getKeyword = async (req, res) => {
    try {
        const { id } = req.params;
        
        const keyword = await KeywordTracking.findOne({ 
            _id: id, 
            userId: req.user._id 
        });

        if (!keyword) {
            return res.status(404).json({ 
                success: false, 
                message: "Keyword not found" 
            });
        }

        // Format the response
        const formattedKeyword = {
            _id: keyword._id,
            keyword: keyword.keyword,
            url: keyword.url,
            domain: keyword.domain,
            currentPosition: keyword.currentPosition,
            currentPage: keyword.currentPage,
            bestPosition: keyword.bestPosition,
            positionChange: keyword.positionChange,
            active: keyword.active,
            lastChecked: keyword.lastChecked,
            status: keyword.status,
            createdAt: keyword.createdAt,
            competitors: keyword.competitors || [],
            rankHistory: keyword.rankHistory || []
        };

        res.status(200).json({ 
            success: true, 
            keyword: formattedKeyword 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Manually refresh a keyword ranking
export const refreshKeyword = async (req, res) => {
    try {
        const { id } = req.params;
        
        const keyword = await KeywordTracking.findOne({ 
            _id: id, 
            userId: req.user._id 
        });

        if (!keyword) {
            return res.status(404).json({ 
                success: false, 
                message: "Keyword not found" 
            });
        }

        // Update status to checking
        keyword.status = "checking";
        keyword.lastChecked = new Date();
        await keyword.save();

        // Trigger the ranking check asynchronously
        updateKeywordRanking(keyword._id).then(result => {
            console.log(`Refresh completed for ${keyword.keyword}:`, result);
        }).catch(error => {
            console.error(`Refresh failed for ${keyword.keyword}:`, error);
        });
        
        res.status(200).json({ 
            success: true, 
            message: "Keyword refresh initiated. Results will be available shortly.", 
            keyword 
        });
    } catch (error) {
        console.error("Error refreshing keyword:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Delete Keyword tracking
export const deleteKeyword = async (req, res) => {
    try {
        const { id } = req.params;
        
        const keyword = await KeywordTracking.findOneAndDelete({ 
            _id: id, 
            userId: req.user._id 
        });

        if (!keyword) {
            return res.status(404).json({ 
                success: false, 
                message: "Keyword not found" 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: "Keyword tracking deleted successfully" 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Toggle tracking active/inactive
export const toggleKeywordStatus = async (req, res) => {
    try {
        const { id } = req.params;
        
        const keyword = await KeywordTracking.findOne({ 
            _id: id, 
            userId: req.user._id 
        });

        if (!keyword) {
            return res.status(404).json({ 
                success: false, 
                message: "Keyword not found" 
            });
        }

        // Toggle the active status
        keyword.active = !keyword.active;
        await keyword.save();

        res.status(200).json({ 
            success: true, 
            message: `Keyword tracking ${keyword.active ? "activated" : "deactivated"}`,
            active: keyword.active
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Update all keywords for the user
export const updateAllKeywords = async (req, res) => {
    try {
        const result = await updateAllUserKeywords(req.user._id);
        
        res.status(200).json({
            success: true,
            message: "Update initiated for all keywords",
            result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get keyword metrics
export const getMetrics = async (req, res) => {
    try {
        const { id } = req.params;
        const { getKeywordMetrics } = await import("../services/keywordTrackingService.js");
        
        const result = await getKeywordMetrics(id);
        
        if (!result.success) {
            return res.status(404).json(result);
        }
        
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get keyword history with date range
export const getHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const { days = 30 } = req.query;
        const { getKeywordHistory } = await import("../services/keywordTrackingService.js");
        
        const result = await getKeywordHistory(id, parseInt(days));
        
        if (!result.success) {
            return res.status(404).json(result);
        }
        
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get dashboard stats
export const getDashboardStats = async (req, res) => {
    try {
        const stats = await KeywordTracking.aggregate([
            {
                $match: { userId: req.user._id }
            },
            {
                $group: {
                    _id: null,
                    totalKeywords: { $sum: 1 },
                    activeKeywords: {
                        $sum: { $cond: [{ $eq: ["$active", true] }, 1, 0] }
                    },
                    averagePosition: { $avg: "$currentPosition" },
                    keywordsInTop10: {
                        $sum: { $cond: [{ $lte: ["$currentPosition", 10] }, 1, 0] }
                    },
                    keywordsInTop30: {
                        $sum: { $cond: [{ $lte: ["$currentPosition", 30] }, 1, 0] }
                    },
                    improvedKeywords: {
                        $sum: { $cond: [{ $gt: ["$positionChange", 0] }, 1, 0] }
                    },
                    declinedKeywords: {
                        $sum: { $cond: [{ $lt: ["$positionChange", 0] }, 1, 0] }
                    }
                }
            }
        ]);
        
        res.status(200).json({
            success: true,
            stats: stats[0] || {
                totalKeywords: 0,
                activeKeywords: 0,
                averagePosition: null,
                keywordsInTop10: 0,
                keywordsInTop30: 0,
                improvedKeywords: 0,
                declinedKeywords: 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};