import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";
import https from "https";
import http from "http";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract a single meta tag value from raw HTML */
function extractMeta(html, name) {
    // matches both name= and property= variants
    const patterns = [
        new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`, "i"),
    ];
    for (const re of patterns) {
        const m = html.match(re);
        if (m) return m[1].trim();
    }
    return "";
}

/** Fetch a URL with redirects and return { statusCode, html, loadTime } */
function fetchHtml(url, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const parsed = new URL(url);
        const lib = parsed.protocol === "https:" ? https : http;

        const req = lib.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; SEOBot/1.0)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
            timeout: 20000,
        }, (res) => {
            // Follow redirects
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
                const redirectUrl = new URL(res.headers.location, url).href;
                res.resume();
                return fetchHtml(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
            }

            let data = "";
            res.setEncoding("utf8");
            res.on("data", chunk => { data += chunk; });
            res.on("end", () => resolve({
                statusCode: res.statusCode || 0,
                html: data,
                loadTime: Date.now() - start,
            }));
        });

        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timed out after 20 seconds"));
        });
    });
}

/** Parse SEO data from raw HTML string */
function parseHtmlSeoData(html, url) {
    // --- Title ---
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    // --- Meta tags ---
    const description = extractMeta(html, "description");
    const robots = extractMeta(html, "robots");
    const viewport = extractMeta(html, "viewport");
    const ogTitle = extractMeta(html, "og:title");
    const ogDescription = extractMeta(html, "og:description");
    const ogImage = extractMeta(html, "og:image");
    const twitterCard = extractMeta(html, "twitter:card");

    // --- Canonical ---
    const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)
        || html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i);
    const canonical = canonicalMatch ? canonicalMatch[1].trim() : "";

    // --- Charset ---
    const charsetMatch = html.match(/<meta[^>]+charset=["']?([^"'>\s]+)/i);
    const charset = charsetMatch ? charsetMatch[1].trim() : "";

    // --- Headings ---
    const countTag = (tag) => (html.match(new RegExp(`<${tag}[^>]*>`, "gi")) || []).length;
    const h1Texts = [];
    const h1Re = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
    let m;
    while ((m = h1Re.exec(html)) !== null) {
        const text = m[1].replace(/<[^>]+>/g, "").trim();
        if (text) h1Texts.push(text.substring(0, 200));
    }

    // --- Links ---
    const currentHost = new URL(url).hostname;
    let internalLinks = 0;
    let externalLinks = 0;
    const linkRe = /href=["']([^"'#?][^"']*)["']/gi;
    const seenLinks = new Set();
    while ((m = linkRe.exec(html)) !== null) {
        const href = m[1].trim();
        if (seenLinks.has(href)) continue;
        seenLinks.add(href);
        if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
        try {
            const linkUrl = new URL(href, url);
            if (linkUrl.hostname === currentHost) internalLinks++;
            else externalLinks++;
        } catch { /* skip malformed */ }
    }
    const totalLinks = internalLinks + externalLinks;

    // --- Images ---
    const imgMatches = html.match(/<img[^>]*>/gi) || [];
    const totalImages = imgMatches.length;
    const missingAlt = imgMatches.filter(img => !/alt=["'][^"']+["']/i.test(img)).length;

    // --- Body text (strip all tags) ---
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : html;
    const bodyText = bodyHtml
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const wordCount = bodyText.split(/\s+/).filter(w => w.length > 1).length;
    const pageSize = html.length;

    return {
        metaData: { title, description, canonical, robots, ogTitle, ogDescription, ogImage, twitterCard, viewport, charset },
        headings: { h1: h1Texts.length || countTag("h1"), h2: countTag("h2"), h3: countTag("h3"), h4: countTag("h4"), h5: countTag("h5"), h6: countTag("h6"), h1Texts },
        links: { internal: internalLinks, external: externalLinks, total: totalLinks },
        images: { total: totalImages, missingAlt, withAlt: totalImages - missingAlt },
        wordCount,
        pageSize,
        bodyText: bodyText.substring(0, 3000),
    };
}

// ─── Browserbase scraper ─────────────────────────────────────────────────────

async function scrapeWithBrowserbase(url) {
    // Lazy init — reads env at call-time, not at module load-time
    const apiKey = process.env.BROWSERBASE_API_KEY;
    if (!apiKey) throw new Error("BROWSERBASE_API_KEY not set");

    const bb = new Browserbase({ apiKey });
    let browser;

    const session = await bb.sessions.create({ browserSettings: { blockAds: true } });
    browser = await chromium.connectOverCDP(session.connectUrl);

    const defaultContext = browser.contexts()[0];
    const page = defaultContext.pages()[0];
    page.setDefaultNavigationTimeout(30000);

    const startTime = Date.now();
    let response;
    try {
        response = await page.goto(url, { waitUntil: "domcontentloaded" });
    } catch (error) {
        await browser.close().catch(() => {});
        throw error;
    }

    const loadTime = Date.now() - startTime;
    await page.waitForTimeout(2000);

    const scrapedData = await page.evaluate(() => {
        const getMeta = (name) => {
            const el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
            return el ? el.getAttribute("content") || "" : "";
        };
        const title = document.title || "";
        const description = getMeta("description");
        const canonical = document.querySelector('link[rel="canonical"]')?.href || "";
        const robots = getMeta("robots");
        const ogTitle = getMeta("og:title") || getMeta("og:Title");
        const ogDescription = getMeta("og:description");
        const ogImage = getMeta("og:image") || getMeta("og:Image");
        const twitterCard = getMeta("twitter:card") || getMeta("twitterCard");
        const viewport = getMeta("viewport");
        const charsetMeta = document.querySelector("meta[charset]");
        const charset = charsetMeta ? charsetMeta.getAttribute("charset") || "" : "";

        const h1Elements = document.querySelectorAll("h1");
        const h1Texts = Array.from(h1Elements).map(el => el.textContent?.trim() || "");
        const headings = {
            h1: h1Elements.length,
            h2: document.querySelectorAll("h2").length,
            h3: document.querySelectorAll("h3").length,
            h4: document.querySelectorAll("h4").length,
            h5: document.querySelectorAll("h5").length,
            h6: document.querySelectorAll("h6").length,
            h1Texts,
        };

        const allLinks = Array.from(document.querySelectorAll("a[href]"));
        const currentHost = window.location.hostname;
        let internalLinks = 0, externalLinks = 0;
        allLinks.forEach(link => {
            try {
                const href = link.href;
                if (href.startsWith("mailto:") || href.startsWith("tel:")) return;
                const linkUrl = new URL(href);
                if (linkUrl.hostname === currentHost) internalLinks++;
                else externalLinks++;
            } catch { /* skip */ }
        });

        const allImages = Array.from(document.querySelectorAll("img"));
        const missingAlt = allImages.filter(img => !img.alt || img.alt.trim() === "").length;
        const bodyText = document.body?.innerText || "";
        const wordCount = bodyText.split(/\s+/).filter(w => w.length > 0).length;
        const pageSize = document.documentElement.outerHTML.length;

        return {
            metaData: { title, description, canonical, robots, ogTitle, ogDescription, ogImage, twitterCard, viewport, charset },
            headings,
            links: { internal: internalLinks, external: externalLinks, total: allLinks.length },
            images: { total: allImages.length, missingAlt, withAlt: allImages.length - missingAlt },
            wordCount, pageSize,
            bodyText: bodyText.substring(0, 3000),
        };
    });

    const statusCode = response?.status() || 0;
    await page.close();
    await browser.close();

    return { ...scrapedData, loadTime, statusCode, url };
}

// ─── HTTP fallback scraper ───────────────────────────────────────────────────

async function scrapeWithHttp(url) {
    console.log("[SCRAPER] Using HTTP fallback scraper for:", url);
    const { statusCode, html, loadTime } = await fetchHtml(url);
    const parsed = parseHtmlSeoData(html, url);
    return { ...parsed, loadTime, statusCode, url };
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function scrapeUrl(url) {
    // Try Browserbase first if API key is present
    if (process.env.BROWSERBASE_API_KEY) {
        try {
            console.log("[SCRAPER] Trying Browserbase...");
            const data = await scrapeWithBrowserbase(url);
            console.log("[SCRAPER] Browserbase scrape succeeded.");
            return { success: true, data };
        } catch (error) {
            console.warn("[SCRAPER] Browserbase failed:", error.message, "— falling back to HTTP scraper.");
        }
    } else {
        console.warn("[SCRAPER] No BROWSERBASE_API_KEY — using HTTP scraper directly.");
    }

    // Fallback: plain HTTP scraper (no browser required)
    try {
        const data = await scrapeWithHttp(url);
        console.log("[SCRAPER] HTTP fallback scrape succeeded.");
        return { success: true, data };
    } catch (error) {
        console.error("[SCRAPER] HTTP fallback also failed:", error.message);
        return { success: false, errors: error.message };
    }
}
