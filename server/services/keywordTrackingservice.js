import KeywordTracking from "../models/KeywordTracking.js";
import { rankTracker, checkKeywordRanking } from "./rankTrackerservice.js";

// Update a single keyword's ranking
export const updateKeywordRanking = async (keywordId) => {
    try {
        const keywordDoc = await KeywordTracking.findById(keywordId);
        
        if (!keywordDoc) {
            throw new Error("Keyword not found");
        }

        // Update status to checking
        keywordDoc.status = "checking";
        keywordDoc.lastChecked = new Date();
        await keywordDoc.save();

        // Get current ranking
        const ranking = await checkKeywordRanking(keywordDoc.keyword, keywordDoc.domain);

        if (ranking.error) {
            keywordDoc.status = "failed";
            await keywordDoc.save();
            return {
                success: false,
                message: ranking.error,
                keywordId
            };
        }

        // Create rank history entry
        const rankHistoryEntry = {
            date: new Date(),
            position: ranking.position,
            page: ranking.page,
            title: ranking.title,
            snippet: ranking.snippet || ""
        };

        // Update keyword document
        const oldPosition = keywordDoc.currentPosition;
        keywordDoc.rankHistory.push(rankHistoryEntry);
        keywordDoc.currentPosition = ranking.position;
        keywordDoc.currentPage = ranking.page;
        keywordDoc.lastChecked = new Date();
        
        // Update position change
        if (oldPosition && ranking.position) {
            keywordDoc.positionChange = oldPosition - ranking.position;
        } else if (ranking.position) {
            keywordDoc.positionChange = 0;
        }
        
        // Update best position
        if (!keywordDoc.bestPosition || (ranking.position && ranking.position < keywordDoc.bestPosition)) {
            keywordDoc.bestPosition = ranking.position;
        }
        
        // Update competitors
        if (ranking.competitors && ranking.competitors.length > 0) {
            keywordDoc.competitors = ranking.competitors;
        }
        
        keywordDoc.status = "completed";
        await keywordDoc.save();

        return {
            success: true,
            message: "Keyword ranking updated successfully",
            keywordId,
            position: ranking.position,
            page: ranking.page,
            positionChange: keywordDoc.positionChange,
            bestPosition: keywordDoc.bestPosition
        };

    } catch (error) {
        console.error("Error updating keyword ranking:", error);
        
        // Update status to failed
        try {
            await KeywordTracking.findByIdAndUpdate(keywordId, {
                status: "failed",
                lastChecked: new Date()
            });
        } catch (updateError) {
            console.error("Error updating status:", updateError);
        }
        
        return {
            success: false,
            message: error.message,
            keywordId
        };
    }
};

// Update all keywords for a user
export const updateAllUserKeywords = async (userId) => {
    try {
        const keywords = await KeywordTracking.find({
            userId,
            active: true
        });

        const results = [];
        
        for (const keyword of keywords) {
            console.log(`Updating keyword: ${keyword.keyword} for user ${userId}`);
            const result = await updateKeywordRanking(keyword._id);
            results.push(result);
            
            // Add delay between updates to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        return {
            success: true,
            total: keywords.length,
            updated: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };

    } catch (error) {
        console.error("Error updating user keywords:", error);
        return {
            success: false,
            message: error.message
        };
    }
};

// Update all pending keywords (for cron jobs)
export const updatePendingKeywords = async () => {
    try {
        const keywords = await KeywordTracking.find({
            status: { $in: ["pending", "failed"] },
            active: true
        }).limit(10); // Process 10 at a time

        const results = [];
        
        for (const keyword of keywords) {
            const result = await updateKeywordRanking(keyword._id);
            results.push(result);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        return {
            success: true,
            total: keywords.length,
            updated: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };

    } catch (error) {
        console.error("Error updating pending keywords:", error);
        return {
            success: false,
            message: error.message
        };
    }
};

// Get keyword ranking history
export const getKeywordHistory = async (keywordId, days = 30) => {
    try {
        const keyword = await KeywordTracking.findById(keywordId);
        
        if (!keyword) {
            throw new Error("Keyword not found");
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const history = keyword.rankHistory
            .filter(entry => entry.date >= cutoffDate)
            .sort((a, b) => a.date - b.date);

        return {
            success: true,
            keyword: keyword.keyword,
            domain: keyword.domain,
            currentPosition: keyword.currentPosition,
            bestPosition: keyword.bestPosition,
            history: history.map(entry => ({
                date: entry.date,
                position: entry.position,
                page: entry.page
            })),
            competitors: keyword.competitors
        };

    } catch (error) {
        console.error("Error getting keyword history:", error);
        return {
            success: false,
            message: error.message
        };
    }
};

// Get keyword performance metrics
export const getKeywordMetrics = async (keywordId) => {
    try {
        const keyword = await KeywordTracking.findById(keywordId);
        
        if (!keyword) {
            throw new Error("Keyword not found");
        }

        const history = keyword.rankHistory;
        const totalChecks = history.length;
        
        // Calculate average position
        const avgPosition = history.reduce((sum, entry) => {
            return sum + (entry.position || 100);
        }, 0) / (totalChecks || 1);
        
        // Calculate trend (last 5 checks)
        const last5Checks = history.slice(-5);
        let trend = "stable";
        
        if (last5Checks.length >= 3) {
            const firstAvg = last5Checks.slice(0, 2).reduce((sum, e) => sum + (e.position || 100), 0) / 2;
            const lastAvg = last5Checks.slice(-2).reduce((sum, e) => sum + (e.position || 100), 0) / 2;
            
            if (lastAvg < firstAvg - 5) trend = "improving";
            else if (lastAvg > firstAvg + 5) trend = "declining";
            else trend = "stable";
        }
        
        // Calculate improvement
        const firstPosition = history[0]?.position;
        const improvement = firstPosition && keyword.currentPosition 
            ? firstPosition - keyword.currentPosition 
            : 0;

        return {
            success: true,
            metrics: {
                currentPosition: keyword.currentPosition,
                bestPosition: keyword.bestPosition,
                averagePosition: Math.round(avgPosition),
                positionChange: keyword.positionChange,
                totalChecks,
                improvement,
                trend,
                lastChecked: keyword.lastChecked,
                status: keyword.status
            }
        };

    } catch (error) {
        console.error("Error getting keyword metrics:", error);
        return {
            success: false,
            message: error.message
        };
    }
};

// Schedule automatic updates (for cron jobs)
export const scheduleKeywordUpdates = async () => {
    console.log("Running scheduled keyword updates...");
    
    try {
        // Update pending keywords first
        const pendingResult = await updatePendingKeywords();
        
        // Then update recent keywords (last updated > 24 hours ago)
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        
        const staleKeywords = await KeywordTracking.find({
            active: true,
            status: "completed",
            lastChecked: { $lt: oneDayAgo }
        }).limit(20);
        
        const staleResults = [];
        for (const keyword of staleKeywords) {
            const result = await updateKeywordRanking(keyword._id);
            staleResults.push(result);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        return {
            success: true,
            pending: pendingResult,
            stale: {
                total: staleKeywords.length,
                updated: staleResults.filter(r => r.success).length,
                failed: staleResults.filter(r => !r.success).length
            }
        };
        
    } catch (error) {
        console.error("Error in scheduled updates:", error);
        return {
            success: false,
            message: error.message
        };
    }
};

// Bulk add keywords
export const bulkAddKeywords = async (userId, keywords) => {
    try {
        const results = [];
        
        for (const item of keywords) {
            const { keyword, url } = item;
            
            // Extract domain
            let domain;
            try {
                const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
                domain = urlObj.hostname.replace("www.", "");
            } catch {
                results.push({
                    keyword,
                    url,
                    success: false,
                    message: "Invalid URL format"
                });
                continue;
            }
            
            // Check for existing
            const existing = await KeywordTracking.findOne({
                userId,
                keyword: keyword.toLowerCase().trim(),
                domain
            });
            
            if (existing) {
                results.push({
                    keyword,
                    url,
                    success: false,
                    message: "Already tracking this keyword for this domain"
                });
                continue;
            }
            
            // Create new tracking
            try {
                const tracking = await KeywordTracking.create({
                    userId,
                    keyword: keyword.toLowerCase().trim(),
                    url: url.startsWith("http") ? url : `https://${url}`,
                    domain,
                    status: "pending"
                });
                
                results.push({
                    keyword,
                    url,
                    success: true,
                    trackingId: tracking._id,
                    message: "Keyword added successfully"
                });
            } catch (error) {
                results.push({
                    keyword,
                    url,
                    success: false,
                    message: error.message
                });
            }
        }
        
        return {
            success: true,
            total: keywords.length,
            added: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
        
    } catch (error) {
        console.error("Error bulk adding keywords:", error);
        return {
            success: false,
            message: error.message
        };
    }
};