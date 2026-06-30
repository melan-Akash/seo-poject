// components/OnboardingTour.tsx
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ChevronRight, ChevronLeft, X, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

interface TourStep {
  route: string;
  selector: string;
  title: string;
  content: string;
  placement: "top" | "bottom" | "left" | "right" | "center";
}

const TOUR_STEPS: TourStep[] = [
  {
    route: "/dashboard",
    selector: "body",
    title: "Welcome to SEO Analyzer! 🚀",
    content: "Let's take a quick 1-minute tour to show you how to analyze websites and track your search rankings.",
    placement: "center"
  },
  {
    route: "/dashboard",
    selector: "#dashboard-url-input-container",
    title: "Quick SEO Audit",
    content: "Enter any website URL here and click 'Analyze' to run an instant, comprehensive SEO audit.",
    placement: "bottom"
  },
  {
    route: "/dashboard",
    selector: "#dashboard-stats-container",
    title: "Your Scan Quota",
    content: "Track your scans, average SEO score, and remaining daily scan quota. Free users get 5 scans daily, Pro gets unlimited!",
    placement: "bottom"
  },
  {
    route: "/dashboard",
    selector: "#nav-link-analyze",
    title: "Detailed AI Analysis",
    content: "Let's check the Analyze page, where you can see the scanner working in real time. Click 'Next' to go there.",
    placement: "bottom"
  },
  {
    route: "/analyze",
    selector: "#analyze-card-container",
    title: "Deep SEO Scan & AI Analysis",
    content: "On this page, you can run in-depth audits. Our scanner connects to a cloud browser, extracts all page details, and uses Google Gemini AI to generate recommendations.",
    placement: "bottom"
  },
  {
    route: "/analyze",
    selector: "#nav-link-rank-tracker",
    title: "Track Search Rankings",
    content: "Now, let's explore the Rank Tracker. Click 'Next' to navigate there.",
    placement: "bottom"
  },
  {
    route: "/rank-tracker",
    selector: "#add-keyword-btn",
    title: "Google Keyword Tracker",
    content: "Add keywords and your website URL here. We will monitor your search rankings on Google, compare your site with competitors, and track your progress over time!",
    placement: "bottom"
  },
  {
    route: "/rank-tracker",
    selector: "body",
    title: "You're All Set! 🎉",
    content: "You've learned the basics! Run your first scan to see how your site performs. Upgrade to Pro for just $5/month to unlock unlimited scans and full historical tracking.",
    placement: "center"
  }
];

export default function OnboardingTour() {
  const { user, completeOnboarding } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [targetElement, setTargetElement] = useState<Element | null>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Start tour if user is logged in and not onboarded
  useEffect(() => {
    if (user && user.isOnboarded === false) {
      setIsActive(true);
      // Find the first step that matches the current route, or redirect to dashboard to start
      if (location.pathname !== "/dashboard" && currentStepIndex === 0) {
        navigate("/dashboard");
      }
    } else {
      setIsActive(false);
    }
  }, [user, user?.isOnboarded]);

  // Monitor window resize to recalculate spotlight coordinates
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Find target element and calculate coordinates when step, route, or window size changes
  useEffect(() => {
    if (!isActive || !currentStep) return;

    // If current step is on a different route, navigate there
    if (location.pathname !== currentStep.route) {
      navigate(currentStep.route);
      return;
    }

    let attempts = 0;
    const findElement = () => {
      if (currentStep.selector === "body") {
        setTargetElement(document.body);
        setCoords({ top: 0, left: 0, width: 0, height: 0 });
        return;
      }

      const element = document.querySelector(currentStep.selector);
      if (element) {
        setTargetElement(element);
        const rect = element.getBoundingClientRect();
        setCoords({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        });
        // Scroll element into view if it's not visible
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (attempts < 20) {
        // Poll for element (useful during page loads or transitions)
        attempts++;
        setTimeout(findElement, 100);
      } else {
        console.warn(`OnboardingTour: Element not found for selector "${currentStep.selector}"`);
        setTargetElement(null);
      }
    };

    // Small delay to let page render
    const timer = setTimeout(findElement, 150);
    return () => clearTimeout(timer);
  }, [currentStepIndex, location.pathname, windowSize, isActive]);

  if (!isActive) return null;

  const handleNext = async () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      const nextStep = TOUR_STEPS[currentStepIndex + 1];
      setCurrentStepIndex(currentStepIndex + 1);
      if (location.pathname !== nextStep.route) {
        navigate(nextStep.route);
      }
    } else {
      handleEnd();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      const prevStep = TOUR_STEPS[currentStepIndex - 1];
      setCurrentStepIndex(currentStepIndex - 1);
      if (location.pathname !== prevStep.route) {
        navigate(prevStep.route);
      }
    }
  };

  const handleEnd = async () => {
    setIsActive(false);
    try {
      await completeOnboarding();
      toast.success("Tour completed! Enjoy SEO Analyzer. 🎉");
    } catch (e) {
      console.error(e);
    }
  };

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (currentStep.placement === "center" || currentStep.selector === "body" || !targetElement) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 9999,
        maxWidth: "450px",
        width: "90%"
      };
    }

    const padding = 12;
    const tooltipWidth = 320;
    const tooltipHeight = 180; // approximate

    let top = coords.top + coords.height + padding;
    let left = coords.left + (coords.width - tooltipWidth) / 2;

    // Adjust left/right boundaries
    if (left < 16) left = 16;
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16;
    }

    // Handle placement
    if (currentStep.placement === "top") {
      top = coords.top - tooltipHeight - padding;
    } else if (currentStep.placement === "left") {
      left = coords.left - tooltipWidth - padding;
      top = coords.top + (coords.height - tooltipHeight) / 2;
    } else if (currentStep.placement === "right") {
      left = coords.left + coords.width + padding;
      top = coords.top + (coords.height - tooltipHeight) / 2;
    }

    // Keep it on screen vertically
    if (top < 80) top = coords.top + coords.height + padding; // flip to bottom if top cuts off

    return {
      position: "absolute",
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 9999
    };
  };

  return (
    <div className="onboarding-tour-overlay">
      {/* Spotlight effect */}
      {currentStep.selector !== "body" && targetElement && (
        <div
          className="fixed pointer-events-none rounded-xl transition-all duration-300 ease-out"
          style={{
            top: coords.top - 6 - window.scrollY,
            left: coords.left - 6 - window.scrollX,
            width: coords.width + 12,
            height: coords.height + 12,
            boxShadow: "0 0 0 9999px rgba(8, 9, 12, 0.75)",
            border: "2px solid var(--color-primary, #3b82f6)",
            zIndex: 9998
          }}
        />
      )}

      {/* Backdrop for center step */}
      {(currentStep.selector === "body" || currentStep.placement === "center") && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          style={{ zIndex: 9998 }}
          onClick={handleEnd}
        />
      )}

      {/* Tooltip Popover */}
      <div
        style={getTooltipStyle()}
        className="glass border border-border/40 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
            {currentStepIndex === 0 || currentStepIndex === TOUR_STEPS.length - 1 ? (
              <Sparkles size={18} className="text-primary animate-pulse" />
            ) : null}
            {currentStep.title}
          </h3>
          <button 
            onClick={handleEnd}
            className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/50 transition-colors"
            title="Skip Tour"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {currentStep.content}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex 
                    ? "w-4 bg-primary" 
                    : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
                Back
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="flex items-center justify-center gap-1 px-4 py-1.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
              style={{ color: "var(--background)" }}
            >
              {currentStepIndex === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
              {currentStepIndex < TOUR_STEPS.length - 1 && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
