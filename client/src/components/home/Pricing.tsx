import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import toast from "react-hot-toast";

export default function Pricing() {
    const { user, api } = useApp();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleUpgrade = async () => {
        if (!user) {
            navigate("/register");
            return;
        }

        setLoading(true);
        try {
            if (user.plan === "pro") {
                // Redirect to billing portal
                const response = await api.post("/api/stripe/portal");
                if (response.data.success && response.data.url) {
                    window.location.href = response.data.url;
                } else {
                    toast.error("Failed to open billing portal");
                }
            } else {
                // Create checkout session
                const response = await api.post("/api/stripe/create-checkout-session");
                if (response.data.success && response.data.url) {
                    window.location.href = response.data.url;
                } else {
                    toast.error("Failed to initiate checkout");
                }
            }
        } catch (error: any) {
            console.error("Billing error:", error);
            toast.error(error.response?.data?.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="relative md:min-h-screen flex flex-col justify-center items-center max-lg:py-24">
            <div className="bg-dot-pattern absolute inset-0 -z-1 opacity-10"></div>
            <div className="max-w-5xl w-full mx-auto px-4 ">
                <div className="text-center mb-14">
                    <h2 className="text-3xl sm:text-4xl font-semibold mb-4 text-foreground">
                        Simple <span className="gradient-text">Pricing</span>
                    </h2>
                    <p className="text-muted-foreground">Start free. Upgrade when you need more.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                    {/* Free */}
                    <div className="bg-card border border-border rounded-2xl p-8 flex flex-col">
                        <h3 className="text-xl font-semibold mb-1 text-foreground">Free</h3>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-4xl font-bold text-foreground">$0</span>
                            <span className="text-muted-foreground">/month</span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            {["5 analyses per day", "Full SEO report", "Keyword analysis", "Issue detection", "Export results"].map((item) => (
                                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CheckCircle size={16} className="text-primary shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <Link to="/register" className="block w-full py-3 rounded-xl bg-primary/10 text-secondary-foreground text-center text-sm  hover:opacity-90 transition-colors">
                            Get Started Free
                        </Link>
                    </div>

                    {/* Pro */}
                    <div className="relative rounded-2xl p-8 flex flex-col bg-card border border-primary/30 overflow-hidden">
                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium" style={{ color: "var(--background)" }}>
                            Popular
                        </div>
                        <h3 className="text-xl font-semibold mb-1 text-foreground">Pro</h3>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-4xl font-bold text-primary">$5</span>
                            <span className="text-muted-foreground">/month</span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            {["Unlimited analyses", "Priority processing", "Competitor analysis", "Historical tracking", "API access", "Email reports"].map((item) => (
                                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CheckCircle size={16} className="text-primary shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <button 
                            onClick={handleUpgrade}
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-center text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer" 
                            style={{ color: "var(--background)" }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Processing...
                                </>
                            ) : user?.plan === "pro" ? (
                                "Manage Subscription"
                            ) : (
                                "Upgrade to Pro"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
