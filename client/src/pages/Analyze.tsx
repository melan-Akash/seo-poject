/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SearchIcon, GlobeIcon, FileSearchIcon, BrainIcon, CheckCircleIcon, Loader2, ArrowRightIcon } from "lucide-react";
import { useApp } from "../context/AppContext";
import toast from "react-hot-toast";

const STEPS = [
    { icon: <GlobeIcon size={22} />, label: "Connecting to browser", desc: "Creating cloud browser session..." },
    { icon: <FileSearchIcon size={22} />, label: "Scanning website", desc: "Extracting meta tags, links, images..." },
    { icon: <BrainIcon size={22} />, label: "AI Analysis", desc: "Gemini is analyzing your SEO data..." },
    { icon: <CheckCircleIcon size={22} />, label: "Report Ready", desc: "Your SEO report is complete!" },
];

export default function Analyze() {
    const { api } = useApp();
    const [url, setUrl] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [searchParams] = useSearchParams();
    const pollRef = useRef<any>(null);
    const stepTimersRef = useRef<any[]>([]);

    const navigate = useNavigate();

    const clearAllTimers = () => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        stepTimersRef.current.forEach(t => clearTimeout(t));
        stepTimersRef.current = [];
    };

    const handleAnalyze = async (submitUrl?: string) => {
        const targetUrl = submitUrl || url;
        if (!targetUrl.trim()) {
            toast.error("Please enter a URL");
            return;
        }


        setAnalyzing(true);
        setCurrentStep(0);

        // Animate steps visually while waiting
        const t1 = setTimeout(() => setCurrentStep(1), 1500);
        const t2 = setTimeout(() => setCurrentStep(2), 4000);
        stepTimersRef.current = [t1, t2];

        try {
            // Step 1: Start analysis on backend
            const startRes = await api.post("/api/analyse/analyze", {
                url: targetUrl.trim(),
            });

            if (!startRes.data.success) {
                throw new Error(startRes.data.message || "Failed to start analysis");
            }

            const analysisId = startRes.data.analysisId;

            // Store analysisId in session to prevent duplicate polling
            sessionStorage.setItem(`analysis_${analysisId}_polling`, "true");

            // Step 2: Poll until complete or failed
            let pollCount = 0;
            const maxPolls = 60; // 60 * 3 seconds = 3 minutes max
            pollRef.current = setInterval(async () => {
                pollCount++;

                // Stop polling after max attempts
                if (pollCount >= maxPolls) {
                    clearAllTimers();
                    setAnalyzing(false);
                    toast.error("Analysis timed out. Please try again.");
                    sessionStorage.removeItem(`analysis_${analysisId}_polling`);
                    return;
                }

                try {
                    const pollRes = await api.get(`/api/analyse/analyses/${analysisId}`);

                    if (!pollRes.data.success) return;

                    const status = pollRes.data.analysis?.status;
                    const failReason = pollRes.data.analysis?.failReason;

                    if (status === "completed") {
                        clearAllTimers();
                        setCurrentStep(3);
                        sessionStorage.removeItem(`analysis_${analysisId}_polling`);
                        setTimeout(() => {
                            setAnalyzing(false);
                            navigate(`/report/${analysisId}`);
                        }, 800);
                    } else if (status === "failed") {
                        clearAllTimers();
                        setAnalyzing(false);
                        sessionStorage.removeItem(`analysis_${analysisId}_polling`);
                        const reason = failReason || "Analysis failed. Please try again.";
                        toast.error(reason);
                    }
                } catch (pollErr: any) {
                    console.warn("Poll error:", pollErr.message);
                    // Don't stop polling on transient errors
                }
            }, 3000); // poll every 3 seconds

        } catch (err: any) {
            clearAllTimers();
            setAnalyzing(false);
            const errorMsg = err.response?.data?.message || err.message || "Something went wrong. Please try again.";
            toast.error(errorMsg);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleAnalyze();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearAllTimers();
        };
    }, []);

    // Handle prefill URL from query params
    useEffect(() => {
        const prefillUrl = searchParams.get("url");
        if (prefillUrl) {
            setUrl(prefillUrl);
            // Auto-start if URL is provided
            const timer = setTimeout(() => handleAnalyze(prefillUrl), 500);
            return () => clearTimeout(timer);
        }
    }, [searchParams]);

    return (
        <div className="min-h-screen pt-16 md:pt-24 bg-background">
            <div className="max-w-3xl mx-auto px-4 py-12">
                {!analyzing ? (
                    <div>
                        <div className="text-center mb-10 mt-24">
                            <h1 className="text-3xl sm:text-4xl font-medium text-foreground mb-3">
                                Analyze <span className="gradient-text">Any Website</span>
                            </h1>
                            <p className="text-muted-foreground">Enter a URL to get a comprehensive AI-powered SEO audit report.</p>
                        </div>



                        <form onSubmit={handleSubmit} className="max-w-xl mx-auto" id="analyze-card-container">
                            <div className="border border-primary/20 rounded-2xl sm:rounded-full p-1.5 px-2 flex flex-col sm:flex-row items-center gap-2 bg-muted/30">
                                <div className="flex items-center gap-3 flex-1 px-3">
                                    <SearchIcon size={20} className="text-muted-foreground shrink-0" />
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="Enter website URL (e.g., example.com)"
                                        className="w-full bg-transparent text-foreground placeholder-muted-foreground outline-none text-base py-3"
                                        id="analyze-url-input"
                                        autoFocus
                                        disabled={analyzing}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={analyzing || !url.trim()}
                                    className="w-full sm:w-auto bg-primary px-6 py-3 rounded-full flex items-center justify-center gap-2 text-primary-foreground text-sm hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    id="analyze-submit-btn"
                                    style={{ color: "var(--background)" }}
                                >
                                    Analyze <ArrowRightIcon className="text-background size-4 shrink-0" />
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 text-center text-sm text-muted-foreground">
                            Examples:{" "}
                            {["github.com", "stripe.com", "vercel.com"].map((ex, i) => (
                                <span key={ex}>
                                    <button
                                        onClick={() => {
                                            setUrl(ex);
                                        }}
                                        className="text-primary hover:underline"
                                        disabled={analyzing}
                                    >
                                        {ex}
                                    </button>
                                    {i < 2 ? ", " : ""}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* Analyzing State */}
                        <div className="text-center mb-12">
                            <h2 className="text-2xl font-medium text-foreground">Analyzing Your Website</h2>
                            <div className="flex justify-center items-center gap-2 mt-2">
                                <Loader2 size={16} className="text-primary/60 mt-0.5 animate-spin" />
                                <p className="text-muted-foreground sm:text-lg truncate max-w-md">{url}</p>
                            </div>
                        </div>

                        {/* Progress Steps */}
                        <div className="max-w-md mx-auto space-y-4">
                            {STEPS.map((step, i) => {
                                const isComplete = i < currentStep;
                                const isCurrent = i === currentStep;
                                const isPending = i > currentStep;

                                return (
                                    <div
                                        key={step.label}
                                        className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isCurrent
                                                ? "glass-strong border border-primary/30"
                                                : isComplete
                                                    ? "bg-primary/5 border border-primary/10"
                                                    : "bg-muted/30 border border-border"
                                            }`}
                                    >
                                        <div
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isComplete
                                                    ? "bg-emerald-500/15 text-emerald-400"
                                                    : isCurrent
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted text-muted-foreground"
                                                }`}
                                            style={isCurrent ? { color: "var(--background)" } : {}}
                                        >
                                            {isComplete ? <CheckCircleIcon size={20} /> : step.icon}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-medium ${isPending ? "text-muted-foreground" : "text-foreground"}`}>
                                                {step.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{step.desc}</p>
                                        </div>
                                        {isCurrent && (
                                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <p className="text-center text-xs text-muted-foreground mt-8">
                            This may take 15-30 seconds depending on the website.
                        </p>

                        {/* Cancel button during analysis */}
                        <div className="text-center mt-6">
                            <button
                                onClick={() => {
                                    clearAllTimers();
                                    setAnalyzing(false);
                                    toast("Analysis cancelled", { icon: "🛑" });
                                }}
                                className="text-sm text-muted-foreground hover:text-danger transition-colors"
                            >
                                Cancel Analysis
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}