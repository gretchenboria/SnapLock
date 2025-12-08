# SnapLock Backend Proxy

Secure API proxy to protect Gemini API keys from client-side exposure.

## Why This Exists

**SECURITY ISSUE**: The frontend previously had API keys in the browser bundle, making them vulnerable to extraction.

**SOLUTION**: This backend proxy handles all Gemini API calls server-side, keeping keys secure.

## Quick Start

### Local Development

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

3. Run server:
```bash
npm run dev
```

4. Test:
```bash
curl http://localhost:3001/health
```

### Deploy to Production

#### Option 1: Railway (Recommended)

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and initialize:
```bash
railway login
railway init
```

3. Set environment variables:
```bash
railway variables set GEMINI_API_KEY=your_key_here
railway variables set ALLOWED_ORIGINS=https://your-frontend.netlify.app
```

4. Deploy:
```bash
railway up
```

#### Option 2: Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "/server.js" }],
  "env": {
    "GEMINI_API_KEY": "@gemini-api-key"
  }
}
```

3. Add secret:
```bash
vercel secrets add gemini-api-key your_key_here
```

4. Deploy:
```bash
vercel --prod
```

#### Option 3: Heroku

1. Create Heroku app:
```bash
heroku create snaplock-backend
```

2. Set environment variables:
```bash
heroku config:set GEMINI_API_KEY=your_key_here
heroku config:set ALLOWED_ORIGINS=https://your-frontend.netlify.app
```

3. Deploy:
```bash
git push heroku main
```

## API Endpoints

### `POST /api/analyze-physics`
Generate physics configuration from natural language prompt.

**Request:**
```json
{
  "prompt": "Zero-G collision of steel cubes"
}
```

**Response:**
```json
{
  "movementBehavior": "PHYSICS_GRAVITY",
  "gravity": { "x": 0, "y": 0, "z": 0 },
  "wind": { "x": 0, "y": 0, "z": 0 },
  "assetGroups": [...],
  "explanation": "..."
}
```

### `POST /api/generate-creative-prompt`
Generate random physics scenario.

**Response:**
```json
{
  "prompt": "Warehouse logistics overflow with varying friction"
}
```

### `POST /api/analyze-scene-stability`
Adversarial director scene analysis.

**Request:**
```json
{
  "imageBase64": "data:image/png;base64,..."
}
```

**Response:**
```json
{
  "detectedState": "Stable but predictable",
  "action": "WIND_GUST",
  "intensity": 0.6,
  "reasoning": "..."
}
```

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Only allowed origins can access
- **API Key Hidden**: Never exposed to client
- **Input Validation**: Request validation on all endpoints
- **Error Handling**: Graceful error responses

## Monitoring

Check health:
```bash
curl https://your-backend.railway.app/health
```

View logs (Railway):
```bash
railway logs
```

## Cost Estimation

With Gemini 3 Pro:
- ~$0.02 per analysis request (input + output tokens)
- 100 requests/hour = ~$2/hour
- 1000 requests/day = ~$20/day

**Tip**: Set up billing alerts in Google Cloud Console.

## Frontend Integration

Update frontend to use backend:

```typescript
// services/geminiService.ts
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const analyzePhysicsPrompt = async (userPrompt: string): Promise<AnalysisResponse> => {
  const response = await fetch(`${BACKEND_URL}/api/analyze-physics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: userPrompt })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return await response.json();
};
```

Add to `.env` in frontend:
```
VITE_BACKEND_URL=https://your-backend.railway.app
```

## Troubleshooting

**"API key not set" error**:
- Verify `GEMINI_API_KEY` is set in environment variables
- Check spelling (no typos)

**CORS errors**:
- Add your frontend URL to `ALLOWED_ORIGINS`
- Format: `https://example.com` (no trailing slash)

**Rate limit hit**:
- Increase limit in `server.js` (line 24)
- Or implement user authentication

**Deployment fails**:
- Ensure Node.js >= 18.0.0
- Check all dependencies are listed in package.json
- Verify environment variables are set on hosting platform

## License

AGPL-3.0 - Same as SnapLock main project
