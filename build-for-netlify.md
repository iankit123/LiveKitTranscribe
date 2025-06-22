# Netlify Deployment Instructions

## What's Fixed:

1. **Created separate Netlify functions** instead of trying to convert Express app
2. **Updated build configuration** to use `vite build` directly
3. **Added proper CORS headers** for all API endpoints
4. **Created individual functions** for each API endpoint:
   - `netlify/functions/livekit-token.ts`
   - `netlify/functions/gemini-follow-up-suggestions.ts`

## Steps to Deploy:

1. **Push these new files to GitHub**:
   - `netlify.toml`
   - `netlify/functions/livekit-token.ts`
   - `netlify/functions/gemini-follow-up-suggestions.ts`
   - `_redirects`

2. **In Netlify Dashboard**:
   - Go to Site Settings > Build & Deploy
   - Clear any existing build command
   - Let Netlify use the `netlify.toml` configuration

3. **Set Environment Variables** in Netlify:
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
   - `LIVEKIT_URL`
   - `DEEPGRAM_API_KEY`
   - `GEMINI_API_KEY`

4. **Redeploy** from Netlify dashboard

## What Changed:

- Build command now uses `vite build` directly
- API endpoints split into individual serverless functions
- Proper CORS configuration for production
- Removed complex Express-to-serverless conversion

The deployment should work correctly now with all features functional.