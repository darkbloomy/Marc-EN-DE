2026-04-27
Deployed to Vercel successfully.                                                                                                                                                                                
                                                                                                                                                                                                                  
  - Production URL: https://marc-en-de.vercel.app                                                                                                                                                                 
  - Database: Turso (hosted LibSQL) in EU West (Ireland) — marc-en-de-darkbloomy                                                                                                                                  
  - Schema applied: All 6 tables created, 18 achievements seeded                                                                                                                                                  
  - Build: Clean — TypeScript compiled, all routes registered (17 routes)                                                                                                                                         

  What's working:                                                                                                                                                                                                 
  - Profile picker page loads correctly
  - All API routes deployed as serverless functions
  - Database connected via Turso with auth token
  - Exercises will use fallback mode (hardcoded) until you add ANTHROPIC_API_KEY

  To enable AI-generated exercises:
  1. Go to https://vercel.com/darkbloomys-projects/marc-en-de/settings/environment-variables
  2. Add ANTHROPIC_API_KEY with your Claude API key
  3. Redeploy (or it'll apply on next deploy)

  To set up auto-deploy on git push:
  1. Go to Vercel Dashboard → marc-en-de → Settings → Git
  2. Connect your GitHub account and link the darkbloomy/Marc-EN-DE repo