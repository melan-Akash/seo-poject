// import Analysis from "../models/Analysis.js";

// // Analyze a URl
// export const analyzeUrl =  async (req,res) =>{
//     try {
//         const {url} = req.body;
//         if(!url) return res.status(400).json({success:false, message: "URL is required"});

//         // validate url fromat
//         let validURL;
//         try {
//             validURL = new URL(url.startWith("http") ? url : `https://${url}`);
//         } catch (error) {
//             return res.status(400).json({success:false,message: "Invalid URL format"})
//         }

//         // create analysis record with pending status
//         const analysis = await Analysis
//     } catch (error) {
        
//     }

// }

// // Get analysis by ID
// export const getAnalysis =  async (req,res) =>{

// }

// // Delate analysis
// export const deleteAnalyze =  async (req,res) =>{

// }



import Analysis from "../models/Analysis.js";

// Helper function to validate URL
const validateUrl = (url) => {
    try {
        const validURL = new URL(url.startsWith("http") ? url : `https://${url}`);
        return validURL.href;
    } catch (error) {
        return null;
    }
};

// Helper function to perform actual website analysis (mock for now)
const performAnalysis = async (url) => {
    // This is a mock analysis function
    // In production, you would integrate with actual SEO analysis tools
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock analysis results
    return {
        overallScore: Math.floor(Math.random() * 40) + 60, // Random score between 60-100
        categories: {
            seo: Math.floor(Math.random() * 40) + 60,
            performance: Math.floor(Math.random() * 40) + 60,
            accessibility: Math.floor(Math.random() * 40) + 60,
            bestPractices: Math.floor(Math.random() * 40) + 60,
        },
        metaData: {
            title: "Sample Website Title",
            description: "This is a sample description for the website",
            canonical: url,
            robots: "index, follow",
            ogTitle: "Sample OG Title",
            ogDescription: "Sample OG Description",
            ogImage: `${url}/og-image.jpg`,
            twitterCard: "summary_large_image",
            viewport: "width=device-width, initial-scale=1",
            charset: "UTF-8",
        },
        headings: {
            h1: 1,
            h2: 3,
            h3: 5,
            h4: 2,
            h5: 0,
            h6: 0,
            h1Texts: ["Main Heading"],
        },
        links: {
            internal: 15,
            external: 5,
            broken: 1,
            total: 21,
        },
        images: {
            total: 10,
            missingAlt: 2,
            withAlt: 8,
        },
        keywords: [
            { word: "seo", count: 15, density: 2.5 },
            { word: "optimization", count: 8, density: 1.3 },
            { word: "website", count: 12, density: 2.0 },
        ],
        issues: [
            {
                severity: "critical",
                category: "seo",
                message: "Missing meta description",
                recommendation: "Add a meta description to improve click-through rates",
            },
            {
                severity: "warning",
                category: "performance",
                message: "Large image files detected",
                recommendation: "Compress images to improve load time",
            },
            {
                severity: "info",
                category: "accessibility",
                message: "Missing alt text on 2 images",
                recommendation: "Add descriptive alt text to all images",
            },
        ],
        loadTime: 1.5,
        pageSize: 245000,
        wordCount: 1250,
    };
};

// Analyze a URL
export const analyzeUrl = async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                success: false, 
                message: "URL is required" 
            });
        }

        // Validate URL format
        let validUrl;
        try {
            validUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
        } catch (error) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid URL format" 
            });
        }

        const cleanUrl = validUrl.href;

        // Check if there's already a recent analysis for this URL by this user
        const existingAnalysis = await Analysis.findOne({
            userId: req.user._id,
            url: cleanUrl,
            status: "completed",
            createdAt: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        });

        if (existingAnalysis) {
            return res.status(200).json({
                success: true,
                message: "Recent analysis found",
                analysis: existingAnalysis,
                isRecent: true
            });
        }

        // Create analysis record with pending status
        const analysis = await Analysis.create({
            userId: req.user._id,
            url: cleanUrl,
            status: "processing",
            overallScore: 0
        });

        // Perform analysis asynchronously
        performAnalysis(cleanUrl).then(async (results) => {
            try {
                // Update analysis with results
                await Analysis.findByIdAndUpdate(analysis._id, {
                    ...results,
                    status: "completed"
                });
                console.log(`Analysis completed for ${cleanUrl}`);
            } catch (error) {
                console.error("Error updating analysis:", error);
                await Analysis.findByIdAndUpdate(analysis._id, {
                    status: "failed"
                });
            }
        }).catch(async (error) => {
            console.error("Analysis failed:", error);
            await Analysis.findByIdAndUpdate(analysis._id, {
                status: "failed"
            });
        });

        res.status(201).json({
            success: true,
            message: "Analysis started",
            analysisId: analysis._id,
            status: "processing"
        });

    } catch (error) {
        console.error("Error in analyzeUrl:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get analysis by ID
export const getAnalysis = async (req, res) => {
    try {
        const { id } = req.params;
        
        const analysis = await Analysis.findOne({
            _id: id,
            userId: req.user._id
        });

        if (!analysis) {
            return res.status(404).json({
                success: false,
                message: "Analysis not found"
            });
        }

        res.status(200).json({
            success: true,
            analysis
        });

    } catch (error) {
        console.error("Error in getAnalysis:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all analyses for a user
export const getUserAnalyses = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const analyses = await Analysis.find({
            userId: req.user._id
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('url overallScore status createdAt issues loadTime');

        const total = await Analysis.countDocuments({ userId: req.user._id });

        res.status(200).json({
            success: true,
            analyses,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error("Error in getUserAnalyses:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete analysis
export const deleteAnalysis = async (req, res) => {
    try {
        const { id } = req.params;
        
        const analysis = await Analysis.findOneAndDelete({
            _id: id,
            userId: req.user._id
        });

        if (!analysis) {
            return res.status(404).json({
                success: false,
                message: "Analysis not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Analysis deleted successfully"
        });

    } catch (error) {
        console.error("Error in deleteAnalysis:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get analysis statistics for dashboard
export const getAnalysisStats = async (req, res) => {
    try {
        const stats = await Analysis.aggregate([
            {
                $match: { userId: req.user._id }
            },
            {
                $group: {
                    _id: null,
                    totalAnalyses: { $sum: 1 },
                    completedAnalyses: {
                        $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
                    },
                    averageScore: { $avg: "$overallScore" },
                    totalIssues: { $sum: { $size: "$issues" } },
                    criticalIssues: {
                        $sum: {
                            $size: {
                                $filter: {
                                    input: "$issues",
                                    cond: { $eq: ["$$this.severity", "critical"] }
                                }
                            }
                        }
                    }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            stats: stats[0] || {
                totalAnalyses: 0,
                completedAnalyses: 0,
                averageScore: 0,
                totalIssues: 0,
                criticalIssues: 0
            }
        });

    } catch (error) {
        console.error("Error in getAnalysisStats:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Re-run analysis
export const rerunAnalysis = async (req, res) => {
    try {
        const { id } = req.params;
        
        const existingAnalysis = await Analysis.findOne({
            _id: id,
            userId: req.user._id
        });

        if (!existingAnalysis) {
            return res.status(404).json({
                success: false,
                message: "Analysis not found"
            });
        }

        // Update status to processing
        await Analysis.findByIdAndUpdate(id, {
            status: "processing"
        });

        // Perform new analysis
        performAnalysis(existingAnalysis.url).then(async (results) => {
            await Analysis.findByIdAndUpdate(id, {
                ...results,
                status: "completed"
            });
            console.log(`Re-analysis completed for ${existingAnalysis.url}`);
        }).catch(async (error) => {
            console.error("Re-analysis failed:", error);
            await Analysis.findByIdAndUpdate(id, {
                status: "failed"
            });
        });

        res.status(200).json({
            success: true,
            message: "Re-analysis started",
            analysisId: id,
            status: "processing"
        });

    } catch (error) {
        console.error("Error in rerunAnalysis:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
