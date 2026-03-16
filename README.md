# Covenant Mercy Nigeria — Newsletter Generator
**Standalone Node.js App + REST API**

---

## What This Is

A self-contained Express application that serves the newsletter form as a web UI
and exposes a REST API endpoint for generating `.docx` newsletter files.
No AI dependency, no browser-side document libraries — just your server.

---

## Project Structure

```
newsletter-app/
├── server.js          ← Express backend + all docx generation logic
├── package.json       ← Dependencies
├── public/
│   └── index.html     ← Web UI (submits to /api/generate via fetch)
└── README.md
```

---

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open your browser
open http://localhost:3000
```

For development with auto-restart on file changes:
```bash
npm run dev
```

---

## API Reference

### `POST /api/generate`

Accepts a JSON body with all newsletter fields. Returns a `.docx` binary file.

**Content-Type:** `application/json`

**Request body (all fields required except `prayer4`):**
```json
{
  "month":            "April 2026",
  "title":            "When Hope Has a Name",
  "hook":             "She had stopped believing anything could change…",
  "personName":       "Ngozi Okafor",
  "location":         "Benue State",
  "struggle":         "For three years, Ngozi's family…",
  "turningPoint":     "When our team arrived in Makurdi…",
  "transformation":   "Today, Ngozi runs a small tailoring business…",
  "quote":            "Before they came, I used to ask God if He had forgotten my street.",
  "quoteAttrib":      "Ngozi Okafor, Benue State",
  "forwardHope":      "Ngozi hopes to hire an apprentice by year's end…",
  "mission1":         "64 families received emergency food relief.",
  "mission2":         "Our mobile clinic screened 210 residents.",
  "mission3":         "12 women graduated from our vocational cohort.",
  "insideWork":       "Last Tuesday, our coordinator drove four hours…",
  "prayer1":          "Pray for Ngozi — sustained income and confidence.",
  "prayer2":          "Pray for wisdom as we expand into new communities.",
  "prayer3":          "Pray for staff safety on difficult roads.",
  "prayer4":          "",
  "lookingAhead":     "In May, we launch our School Re-Entry Drive…",
  "closingGratitude": "None of what you read in this letter happens without you…"
}
```

**Success response:**
- Status `200`
- `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Body: `.docx` binary

**Error response:**
```json
{ "error": "Missing required fields", "fields": ["month", "title"] }
```

---

### `GET /api/health`

Returns `{ "status": "ok" }`. Use for uptime monitoring or load balancer checks.

---

## Deployment Options

### Option A — Any VPS (DigitalOcean, Hetzner, Linode, etc.)

```bash
# On your server
git clone <your-repo> && cd newsletter-app
npm install --production
node server.js
# Or keep it running with PM2:
npm install -g pm2
pm2 start server.js --name newsletter
pm2 save
```

### Option B — Railway (free tier, zero config)

1. Push this folder to a GitHub repo
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Railway auto-detects Node.js and runs `npm start`
4. Done. You get a public URL instantly.

### Option C — Render (free tier)

1. Push to GitHub
2. New Web Service on https://render.com
3. Build command: `npm install`
4. Start command: `node server.js`

### Option D — Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t newsletter-app .
docker run -p 3000:3000 newsletter-app
```

---

## Customising Org Details

Open `server.js` and find the `ORG` object (~line 90):

```js
const ORG = {
  name:    'Covenant Mercy Nigeria',
  tagline: 'Serving the Least. Sharing the Most.',
  website: 'covenantnigeria.org',
  email:   'info@covenantnigeria.org',
  signoff: 'Pastor Emmanuel Adeyemi & the Covenant Mercy Nigeria Team',
};
```

Change any of these values and restart the server.

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT`   | `3000`  | HTTP port the server listens on |

Set `PORT` in a `.env` file or your hosting platform's environment settings.
