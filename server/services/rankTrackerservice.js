import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";

// Only initialize Browserbase if API key exists
let bb = null;
if (process.env.BROWSERBASE_API_KEY) {
    bb = new Browserbase({
        apiKey: process.env.BROWSERBASE_API_KEY,
    });
} else {
    console.warn("BROWSERBASE_API_KEY not set. Using mock mode for rank tracking.");
}

// Search Google for a keyword and extract ranking results for a target domain
export async function rankTracker(keyword, targetDomain) {
    // Mock mode for development
    if (!bb) {
        console.log(`Mock mode: Simulating ranking check for "${keyword}" on ${targetDomain}`);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Generate random position between 1-50 for testing
        const randomPosition = Math.floor(Math.random() * 50) + 1;
        const randomPage = Math.floor((randomPosition - 1) / 10) + 1;
        
        return {
            success: true,
            keyword,
            targetDomain: targetDomain.replace("www.", "").toLowerCase(),
            found: {
                position: randomPosition,
                page: randomPage,
                url: `https://${targetDomain}`,
                title: `${keyword} - Best Results`,
                snippet: `This is a mock result for ${keyword}. Get the best ${keyword} services here.`,
                domain: targetDomain
            },
            totalResults: 50,
            results: Array.from({ length: 50 }, (_, i) => ({
                position: i + 1,
                url: i === randomPosition - 1 
                    ? `https://${targetDomain}` 
                    : `https://competitor${i + 1}.com`,
                domain: i === randomPosition - 1 
                    ? targetDomain 
                    : `competitor${i + 1}.com`,
                title: i === randomPosition - 1 
                    ? `${keyword} - Official Site`
                    : `${keyword} - Competitor ${i + 1}`,
                snippet: `This is search result ${i + 1} for ${keyword}.`
            })),
            competitors: Array.from({ length: 9 }, (_, i) => ({
                position: i === randomPosition - 1 ? 1 : i + (randomPosition === 1 ? 2 : 1),
                url: i === randomPosition - 1 
                    ? `https://competitor${i + 1}.com`
                    : i === 0 && randomPosition === 1
                    ? `https://competitor2.com`
                    : `https://competitor${i + (randomPosition === 1 ? 2 : 1)}.com`,
                domain: i === randomPosition - 1 
                    ? `competitor${i + 1}.com`
                    : i === 0 && randomPosition === 1
                    ? `competitor2.com`
                    : `competitor${i + (randomPosition === 1 ? 2 : 1)}.com`,
                title: `Competitor ${i + 1} - ${keyword}`,
                snippet: `Check out competitor ${i + 1} for the best ${keyword} solutions.`
            }))
        };
    }

    // Real implementation with Browserbase
    let browser;
    try {
        const session = await bb.sessions.create({
            browserSettings: { blockAds: true }
        });
        browser = await chromium.connectOverCDP(session.connectUrl);
        const page = browser.contexts()[0].pages()[0];
        await page.setDefaultNavigationTimeout(45000);

        await page.goto("https://www.google.com", { waitUntil: "networkidle" });
        
        try {
            const btn = await page.$('button[id="L2AGLB"], form[action*="consent"] button');
            if (btn) {
                await btn.click();
                await page.waitForTimeout(1500);
            }
        } catch {
            // Consent not found, continue
        }

        let found = null;
        let allResults = [];
        const cleanTarget = targetDomain.replace("www.", "").toLowerCase();

        for (let gPage = 0; gPage < 5; gPage++) {
            await page.goto(
                `https://www.google.com/search?q=${encodeURIComponent(keyword)}&start=${gPage * 10}&num=10&hl=en&gl=us`,
                { waitUntil: "networkidle" }
            );

            let pageResults = [];
            for (let retry = 0; retry < 3; retry++) {
                try {
                    await page.waitForSelector('h3', { timeout: 8000 });
                    await page.waitForTimeout(1500);
                    
                    pageResults = await page.evaluate(() => {
                        const results = [];
                        const allH3s = document.querySelectorAll("h3");
                        
                        for (const h3 of allH3s) {
                            let a = h3.closest('a');
                            
                            if (!a) {
                                let p = h3.parentElement;
                                for (let j = 0; j < 5 && p; j++, p = p.parentElement) {
                                    if (p.tagName === "A") {
                                        a = p;
                                        break;
                                    }
                                    const sub = p.querySelector("a[href]");
                                    if (sub && sub.contains(h3)) {
                                        a = sub;
                                        break;
                                    }
                                }
                            }
                            
                            if (!a || !a.href || a.href.startsWith("http") === false || 
                                a.href.includes('google.') || a.href.includes('youtube.com')) {
                                continue;
                            }
                            
                            let snippet = "";
                            let container = a.closest('div');
                            if (container) {
                                const snippetElements = container.querySelectorAll('div[data-sncf="2"], div[data-content-feature="1"] span, .VwiC3b');
                                if (snippetElements.length > 0) {
                                    snippet = snippetElements[0].innerText.trim();
                                }
                            }
                            
                            results.push({
                                position: results.length + 1,
                                url: a.href,
                                title: h3.innerText.trim(),
                                snippet: snippet
                            });
                        }
                        
                        return results;
                    });
                    
                    if (pageResults.length > 0) {
                        break;
                    }
                    
                } catch (error) {
                    console.error(`Retry ${retry + 1} failed:`, error.message);
                    if (retry === 2) {
                        throw new Error("Failed to extract results after 3 retries");
                    }
                    await page.waitForTimeout(2000);
                }
            }
            
            for (const result of pageResults) {
                const resultDomain = new URL(result.url).hostname.replace("www.", "").toLowerCase();
                
                allResults.push({
                    position: allResults.length + 1,
                    ...result,
                    domain: resultDomain
                });
                
                if (!found && resultDomain === cleanTarget) {
                    found = {
                        position: allResults.length,
                        page: gPage + 1,
                        url: result.url,
                        title: result.title,
                        snippet: result.snippet,
                        domain: resultDomain
                    };
                }
            }
            
            if (allResults.length >= 100) break;
            await page.waitForTimeout(1000);
        }
        
        return {
            success: true,
            keyword,
            targetDomain: cleanTarget,
            found: found || { position: null, page: null, url: null },
            totalResults: allResults.length,
            results: allResults.slice(0, 50),
            competitors: allResults.slice(0, 10).filter(r => r.domain !== cleanTarget).map(r => ({
                position: r.position,
                url: r.url,
                domain: r.domain,
                title: r.title,
                snippet: r.snippet
            }))
        };
        
    } catch (error) {
        console.error("Rank tracker error:", error);
        return {
            success: false,
            error: error.message,
            keyword,
            targetDomain,
            found: { position: null, page: null, url: null }
        };
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (error) {
                console.error("Error closing browser:", error);
            }
        }
    }
}

// Helper function to check a single keyword ranking
export async function checkKeywordRanking(keyword, targetDomain) {
    const result = await rankTracker(keyword, targetDomain);
    
    if (result.success) {
        return {
            position: result.found?.position || null,
            page: result.found?.page || null,
            url: result.found?.url || null,
            title: result.found?.title || null,
            snippet: result.found?.snippet || null,
            competitors: result.competitors || []
        };
    }
    
    return {
        position: null,
        page: null,
        url: null,
        error: result.error
    };
}

// Batch check multiple keywords
export async function batchRankChecker(keywords, targetDomain) {
    const results = [];
    
    for (const keyword of keywords) {
        console.log(`Checking keyword: ${keyword}`);
        const result = await rankTracker(keyword, targetDomain);
        results.push({
            keyword,
            ...result
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
}