# AI-Powered SEO Analysis & Rank Tracking Tool

A premium, full-stack web application designed to help website owners and SEO professionals generate comprehensive SEO audits, track search engine rankings in real-time, and get AI-powered optimizations.

The application uses cloud-based web scraping to collect raw meta data, headings, links, and content, and leverages Google Gemini AI to analyze the data and provide actionable SEO recommendations.

---

## 📸 Screenshots

### Dashboard & Quick Analysis
![SEO Analyzer Dashboard](./ss/Screenshot%202026-06-30%20215923.png)

### SEO Report & Detailed Analytics
![SEO Analyzer Report](./ss/Screenshot%202026-06-30%20220223.png)

---

## 🚀 Features

### 🔍 Core SEO Analysis
- **Comprehensive Audits**: Scrapes and analyzes title, description, canonical tags, headings (H1-H6), links (internal/external), images (alt text), and body content.
- **AI-Powered Insights**: Powered by Google's **Gemini 1.5 Flash**, the tool identifies SEO issues (Critical, Warning, Info) and scores your website across multiple categories (SEO, Performance, Accessibility, Best Practices).
- **Fallback Web Scraper**: Uses Browserbase/Playwright for reliable cloud-based scraping. If an API key is missing or invalid, it gracefully falls back to a fast HTTP-based scraper.

### 📈 Keyword Rank Tracker
- **Google Search Rankings**: Track your keyword positions on Google search results (up to page 5).
- **Competitor Tracking**: Compare your ranking against top competitor domains for each tracked keyword.
- **Daily Ranking Updates**: Automatically updates and tracks historical ranking changes.

### 💳 Stripe Subscription Billing
- **Free vs. Pro Plans**:
  - **Free Plan ($0/month)**: 5 website analyses per day, basic audits, and standard rank tracking.
  - **Pro Plan ($5/month)**: Unlimited website analyses, priority processing, competitor analysis, historical rank tracking, and email reports.
- **Seamless Stripe Checkout**: Integrated checkout session redirects for subscription creation.
- **Customer Billing Portal**: A self-service portal allowing Pro users to manage payments, view invoices, or cancel their subscription.
- **Automated Webhooks**: Processes Stripe events (`checkout.session.completed`, `customer.subscription.deleted`) to handle upgrades and downgrades automatically in real-time.

### ✉️ Email Notifications (Nodemailer)
- **Welcome Email**: Sent automatically upon registration with onboarding tips.
- **Subscription Success Email**: Sent automatically when a user upgrades to Pro, containing subscription details.

### 🗺️ Page-by-Page Onboarding Tour
- **Custom Tour Guide**: A beautiful, glassmorphic onboarding tour overlay with a spotlight effect.
- **Multi-Page Flow**: Guides new users step-by-step through the **Dashboard**, **Analyze Page**, and **Rank Tracker** (navigates automatically and continues the tour).
- **Persistent State**: Saved in the database so it only runs once per new user signup.

### 📱 Fully Responsive Design
- Optimized for mobile, tablet, and desktop screens. 
- Input forms automatically stack on mobile devices to prevent text overflow and horizontal scrolling.

---

## 🛠️ Technology Stack

### Frontend (Client)
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (Glassmorphism & dark-mode aesthetic)
- **Routing**: React Router v7
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

### Backend (Server)
- **Framework**: Express.js (Node.js)
- **Database**: MongoDB via Mongoose
- **AI Integration**: `@google/genai` (Gemini API)
- **Web Scraping**: Playwright & `@browserbasehq/sdk`
- **Billing**: Stripe SDK
- **Mailing**: Nodemailer
- **Authentication**: JWT & bcrypt

---

## ⚙️ Prerequisites

Ensure you have the following installed and set up:
- Node.js (v18 or higher)
- MongoDB account (local or MongoDB Atlas)
- Google Gemini API Key
- Stripe Account (API Keys)
- SMTP Email Account (e.g., Gmail App Password)
- (Optional) Browserbase API Key for advanced scraping

---

## 💻 Installation & Setup

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd "seo poject"
```

### 2. Setup the Backend (Server)
```bash
cd server
npm install
```

Create a `.env` file in the `server` directory and configure the environment variables:
```env
PORT=5000
MONGODB_URI="your_mongodb_connection_string"
JWT_SECRET="your_jwt_secret"
GEMINI_API_KEY="your_gemini_api_key"

# Stripe Configurations
STRIPE_SECRET_KEY="your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="your_stripe_webhook_secret_for_signature_verification"

# Email SMTP Configurations
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
EMAIL_USER="your_email_address@gmail.com"
EMAIL_PASS="your_email_app_password"

# Scraping (Optional)
BROWSERBASE_API_KEY="your_browserbase_api_key"

# Client URL (for redirection)
CLIENT_URL="http://localhost:5173"
```

### 3. Setup the Frontend (Client)
```bash
cd ../client
npm install
```

Create a `.env` file in the `client` directory:
```env
VITE_BACKEND_URL="http://localhost:5000"
```

---

## 🏃‍♂️ Running the Application

Open two separate terminals:

**Terminal 1 (Backend):**
```bash
cd server
npm run server
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

Visit `http://localhost:5173` in your browser.
