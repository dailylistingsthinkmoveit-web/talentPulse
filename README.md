# TalentPulse 🔍

**Real-time job search, powered by AI**

TalentPulse is a full-stack job search application that lets you search for jobs using the JSearch API (via RapidAPI), view results in a clean table, and download them as a formatted Excel file.

---

## Tech Stack

- **Frontend**: React (Create React App)
- **Backend**: Vercel Serverless Functions (Node.js) in `/api`
- **API**: JSearch by OpenWeb Ninja via RapidAPI
- **Excel Export**: SheetJS (xlsx)
- **Styling**: Plain CSS with CSS variables

---

## Prerequisites

- Node.js 16+ and npm
- A free [RapidAPI](https://rapidapi.com) account
- JSearch API subscription (free tier available): https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch

---

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Your `.env` File

Copy the example file and add your RapidAPI key:

```bash
cp .env.example .env
```

Then open `.env` and replace the placeholder:

```
RAPIDAPI_KEY=your_actual_rapidapi_key_here
```

To get your key:
1. Go to https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
2. Click "Subscribe to Test" (free tier available)
3. Copy the `X-RapidAPI-Key` value from the code snippet panel

### 3. Run Locally

```bash
npm start
```

The app opens at http://localhost:3000

> **Note**: For local development, the `/api/jobs.js` serverless function requires the Vercel CLI to run properly. See the Vercel section below.

### 4. Run with Vercel CLI Locally (Recommended)

Install the Vercel CLI globally:

```bash
npm install -g vercel
```

Run the full stack locally (frontend + serverless functions):

```bash
vercel dev
```

This starts the app at http://localhost:3000 with the `/api` routes working correctly.

---

## Deploy to Vercel

### Step 1 — Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2 — Login to Vercel

```bash
vercel login
```

### Step 3 — Deploy

```bash
vercel --prod
```

Follow the prompts. Vercel will detect it as a React app automatically.

### Step 4 — Add Environment Variable in Vercel Dashboard

After deploying, you must add your API key in Vercel:

1. Go to https://vercel.com/dashboard
2. Select your **TalentPulse** project
3. Click **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name**: `RAPIDAPI_KEY`
   - **Value**: your actual RapidAPI key
   - **Environments**: Production, Preview, Development (check all)
5. Click **Save**
6. **Redeploy** the project for the variable to take effect:
   ```bash
   vercel --prod
   ```

---

## Project Structure

```
TalentPulse/
├── /api
│   └── jobs.js               ← Vercel serverless function (backend proxy)
├── /src
│   ├── /components
│   │   ├── JobForm.jsx        ← Smart search form
│   │   ├── ResultsTable.jsx   ← Results table + Excel download
│   │   └── StatusBar.jsx      ← Loading / error / success states
│   ├── /utils
│   │   ├── jsearch.js         ← JSearch API call logic
│   │   └── excel.js           ← Excel export using SheetJS
│   ├── App.jsx
│   ├── App.css
│   └── index.js
├── .env                       ← Your secret API key (never commit)
├── .env.example               ← Template for .env
├── .gitignore
├── vercel.json                ← Vercel routing config
├── package.json
└── README.md
```

---

## JSearch Field Mappings

| Column in App     | JSearch Field                                      |
|-------------------|----------------------------------------------------|
| Company Name      | `employer_name`                                    |
| Job Title         | `job_title`                                        |
| Location          | `job_city`, `job_state`, `job_country`             |
| Job Type          | `job_employment_type`                              |
| Work Type         | `job_is_remote`, `job_description` (hybrid check) |
| Salary            | `job_min_salary`, `job_max_salary`, `job_salary_currency`, `job_salary_period` |
| Experience        | `job_required_experience.required_experience_in_months` |
| Date Posted       | `job_posted_at_datetime_utc`                       |
| Source            | `job_publisher`                                    |
| Apply URL         | `job_apply_link`                                   |

---

## Email Feature Setup

The Send Email button sends job results directly to company email as a formatted Excel attachment using [Resend](https://resend.com).

1. Create a free account at https://resend.com
2. Go to **API Keys** in the dashboard and create a new key
3. Add it to your `.env` file:
   ```
   RESEND_API_KEY=re_your_key_here
   ```
4. Run `npm install resend` (if not already installed)
5. Restart the server — the Send Email button is ready to use

> **Note:** The free Resend tier allows 3,000 emails/month and 100/day. The `from` address is `onboarding@resend.dev` (Resend's shared domain) on the free tier. To send from your own domain, verify it in the Resend dashboard.

---

## Known Limitations

- **Salary data**: JSearch only returns salary for ~30–40% of jobs. Most listings show "Not specified" — this reflects the actual job post, not a bug.
- **Rate limits**: The free RapidAPI tier allows ~100 requests/month. If you see a 429 error, you've hit your limit.
- **Hybrid detection**: "Hybrid" work type is inferred from the job description text, not a dedicated field, so it may not always be accurate.
- **Experience level**: Returned as months of experience, converted to years. Many listings don't include this data.
- **Local dev API calls**: `npm start` alone won't proxy `/api` calls correctly — use `vercel dev` for full local testing.
- **Result count**: JSearch returns up to ~10 jobs per page. Selecting "50 results" makes 5 API calls sequentially, which may be slower.

---

## License

MIT
