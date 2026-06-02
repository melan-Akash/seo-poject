# AI-Powered SEO Analysis Tool

A full-stack web application that allows users to generate comprehensive SEO audits for any website. The app uses web scraping to collect raw meta data, headings, links, and content, and leverages Google Gemini AI to analyze the data and provide actionable SEO recommendations.

## 🚀 Features

- **SEO Analysis**: Scrapes and analyzes title, description, canonical tags, headings (H1-H6), links (internal/external), images (alt text), and body content.
- **AI-Powered Insights**: Powered by Google's **Gemini 1.5 Flash**, the tool identifies SEO issues (Critical, Warning, Info) and scores your website across multiple categories (SEO, Performance, Accessibility, Best Practices).
- **Fallback Web Scraper**: Uses Browserbase/Playwright for reliable cloud-based scraping. If an API key is missing or invalid, it gracefully falls back to a fast HTTP-based scraper.
- **Dashboard & History**: View past reports, re-run analyses, and track your overall SEO scores over time.
- **Modern UI**: Built with React, Tailwind CSS 4, and Lucide React icons for a beautiful, responsive user interface.

## 🛠️ Technology Stack

### Frontend (Client)
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **Icons**: Lucide React
- **HTTP Client**: Axios

### Backend (Server)
- **Framework**: Express.js (Node.js)
- **Database**: MongoDB via Mongoose
- **AI Integration**: `@google/genai` (Gemini API)
- **Web Scraping**: Playwright & `@browserbasehq/sdk`
- **Authentication**: JWT & bcrypt

## ⚙️ Prerequisites

Before you begin, ensure you have met the following requirements:
- Node.js installed (v18 or higher recommended)
- MongoDB account and connection string
- Google Gemini API Key
- (Optional) Browserbase API Key for advanced scraping

## 💻 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd "seo poject"
   ```

2. **Setup the Backend:**
   ```bash
   cd server
   npm install
   ```
   Create a `.env` file in the `server` directory and configure the environment variables:
   ```env
   MONGODB_URI="your_mongodb_connection_string"
   JWT_SECRET="your_jwt_secret"
   GEMINI_API_KEY="your_gemini_api_key"
   PORT=5000
   
   # Optional: For advanced browser-based scraping
   BROWSERBASE_API_KEY="your_browserbase_api_key"
   ```

3. **Setup the Frontend:**
   ```bash
   cd ../client
   npm install
   ```
   Create a `.env` file in the `client` directory (if required) to set the backend URL:
   ```env
   VITE_BACKEND_URL="http://localhost:5000"
   ```

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

Visit `http://localhost:5173` in your browser to view the application.

## 📝 License

This project is open-source and available for use and modification.
