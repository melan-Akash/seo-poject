import Analysis from "../models/Analysis.js";
import { analysisSeoData } from "../services/geminiService.js"; // Fixed function name
import { scrapeUrl } from "../services/scraperservice.js"; // Fixed file name

// Analyze a URL
export const analyzeUrl = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ success: false, message: "URL is required" });

        // validate url format
        let validURL;
        try {
            validURL = new URL(url.startsWith("http") ? url : `https://${url}`);
        } catch (error) {
            return res.status(400).json({ success: false, message: "Invalid URL format" });
        }

        // create analysis record with pending status
        const analysis = await Analysis.create({
            userId: req.user._id,
            url: validURL.href,
            status: "processing"
        });

        // send immediate response with analysis Id
        res.status(201).json({ success: true, message: "Analysis started", analysisId: analysis._id });

        // run scraping and analysis in background
        (async () => {
            try {
                // step 1 scrape the Url
                console.log(`[ANALYSE] Starting scrape for: ${validURL.href}`);
                const scrapeResult = await scrapeUrl(validURL.href);

                if (!scrapeResult || !scrapeResult.success) {
                    const reason = scrapeResult?.error || "Scraping failed — website may be unreachable.";
                    console.error("[ANALYSE] Scrape failed:", reason);
                    analysis.status = "failed";
                    analysis.failReason = reason;
                    await analysis.save();
                    return;
                }

                console.log("[ANALYSE] Scrape succeeded. Running Gemini analysis...");

                // step 2 analysis with gemini ai
                const aiResult = await analysisSeoData(scrapeResult.data); // Fixed function name

                if (!aiResult || !aiResult.success) {
                    const reason = aiResult?.error || "Gemini AI analysis failed.";
                    console.error("[ANALYSE] Gemini failed:", reason);
                    analysis.status = "failed";
                    analysis.failReason = reason;
                    await analysis.save();
                    return;
                }

                console.log("[ANALYSE] Gemini analysis succeeded. Saving results...");

                // Step 3 save results
                analysis.overallScore = aiResult.data.overallScore || 0;
                analysis.categories = aiResult.data.categories || {};
                analysis.metaData = scrapeResult.data.metaData || {};
                analysis.headings = scrapeResult.data.headings || {};
                analysis.links = scrapeResult.data.links || {};
                analysis.images = scrapeResult.data.images || {};
                analysis.keywords = aiResult.data.keywords || [];
                analysis.issues = aiResult.data.issues || [];
                analysis.loadTime = scrapeResult.data.loadTime || 0;
                analysis.pageSize = scrapeResult.data.pageSize || 0;
                analysis.wordCount = scrapeResult.data.wordCount || 0;
                analysis.status = "completed";

                await analysis.save();
                console.log(`[ANALYSE] Completed for: ${validURL.href}`);

            } catch (bgError) {
                console.error("Background analysis error:", bgError.message);
                try {
                    analysis.status = "failed";
                    analysis.failReason = bgError.message;
                    await analysis.save();
                } catch (saveError) {
                    console.error("Failed to save failed status:", saveError.message);
                }
            }
        })();

    } catch (error) {
        console.error("Analyze URL error:", error.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Server Error" });
        }
    }
};

// Get analysis by ID
export const getAnalysis = async (req, res) => {
    try {
        const { id } = req.params;
        const analysis = await Analysis.findOne({ _id: id, userId: req.user._id });
        if (!analysis) {
            return res.status(404).json({ success: false, message: "Analysis not found" });
        }
        res.json({ success: true, analysis });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all analyses for user
export const getUserAnalyses = async (req, res) => {
    try {
        const analyses = await Analysis.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, analyses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete analysis
export const deleteAnalysis = async (req, res) => {
    try {
        const { id } = req.params;
        const analysis = await Analysis.findOneAndDelete({ _id: id, userId: req.user._id });
        if (!analysis) {
            return res.status(404).json({ success: false, message: "Analysis not found" });
        }
        res.json({ success: true, message: "Analysis deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get analysis statistics
export const getAnalysisStats = async (req, res) => {
    try {
        const stats = await Analysis.aggregate([
            { $match: { userId: req.user._id, status: "completed" } },
            {
                $group: {
                    _id: null,
                    totalAnalyses: { $sum: 1 },
                    averageScore: { $avg: "$overallScore" },
                    averageSeoScore: { $avg: "$categories.seo" },
                    averagePerformanceScore: { $avg: "$categories.performance" },
                    averageAccessibilityScore: { $avg: "$categories.accessibility" },
                    averageBestPracticesScore: { $avg: "$categories.bestPractices" },
                }
            }
        ]);
        res.json({
            success: true,
            stats: stats[0] || {
                totalAnalyses: 0,
                averageScore: null,
                averageSeoScore: null,
                averagePerformanceScore: null,
                averageAccessibilityScore: null,
                averageBestPracticesScore: null,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Re-run analysis
export const rerunAnalysis = async (req, res) => {
    try {
        const { id } = req.params;
        const analysis = await Analysis.findOne({ _id: id, userId: req.user._id });
        if (!analysis) {
            return res.status(404).json({ success: false, message: "Analysis not found" });
        }

        analysis.status = "processing";
        await analysis.save();

        res.json({ success: true, message: "Analysis re-run started", analysisId: analysis._id });

        // run background scraping and analysis
        (async () => {
            try {
                const scrapeResult = await scrapeUrl(analysis.url);

                if (!scrapeResult || !scrapeResult.success) {
                    analysis.status = "failed";
                    await analysis.save();
                    return;
                }

                const aiResult = await analysisSeoData(scrapeResult.data);

                if (!aiResult || !aiResult.success) {
                    analysis.status = "failed";
                    await analysis.save();
                    return;
                }

                analysis.overallScore = aiResult.data.overallScore || 0;
                analysis.categories = aiResult.data.categories || {};
                analysis.metaData = scrapeResult.data.metaData || {};
                analysis.headings = scrapeResult.data.headings || {};
                analysis.links = scrapeResult.data.links || {};
                analysis.images = scrapeResult.data.images || {};
                analysis.keywords = aiResult.data.keywords || [];
                analysis.issues = aiResult.data.issues || [];
                analysis.loadTime = scrapeResult.data.loadTime || 0;
                analysis.pageSize = scrapeResult.data.pageSize || 0;
                analysis.wordCount = scrapeResult.data.wordCount || 0;
                analysis.status = "completed";

                await analysis.save();
            } catch (bgError) {
                console.error("Background analysis re-run error:", bgError.message);
                try {
                    analysis.status = "failed";
                    await analysis.save();
                } catch (saveError) {
                    console.error("Failed to save failed status:", saveError.message);
                }
            }
        })();

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};