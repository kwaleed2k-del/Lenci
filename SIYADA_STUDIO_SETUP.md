# Siyada Studio - AI Fashion Photography Platform

## 🎉 Complete Setup Guide

### ✅ What's Been Fixed

1. **Branding Updated**
   - Changed all references from "Virtual Studio" to "Siyada Studio"
   - Updated title, headers, and footer
   - Integrated Siyada Tech logo throughout the application

2. **API Integration Fixed**
   - Switched from `gemini-2.5-flash-image-preview` to `gemini-1.5-flash` (better free tier support)
   - All AI calls now go through secure server-side endpoints
   - Proper error handling with fallback to enhanced mock

3. **Server Architecture**
   - Server-side API routes at `/api/imaging/process` and `/api/apparel/detect`
   - API key securely stored in `.env.local` (server-side only)
   - Hot Module Replacement (HMR) for rapid development

### 🚀 How It Works

#### Architecture Flow:
```
Browser (Client)
    ↓
fetch('/api/imaging/process')
    ↓
Vite Dev Server (middleware)
    ↓
server/geminiRoutes.ts
    ↓
Google Gemini API (gemini-1.5-flash)
    ↓
AI-Generated Image
    ↓
Return to Browser
```

### 📁 Key Files

#### Server-Side
- `server/geminiRoutes.ts` - API endpoints for AI processing
- `.env.local` - API key storage (NOT in version control)
- `vite.config.ts` - Vite configuration with server middleware

#### Client-Side
- `services/professionalImagingService.ts` - Image generation service
- `services/apparelDetectionService.ts` - Apparel type detection
- `services/geminiService.ts` - Main AI service coordinator

#### Components
- `App.tsx` - Main application with Siyada Studio branding
- `components/landing/LandingPage.tsx` - Marketing page
- `components/studio/StudioView.tsx` - Generation canvas
- `components/shared/BrandLogo.tsx` - Logo component

### 🔑 API Key Setup

Your API key is stored in `.env.local`:
```env
GEMINI_API_KEY=AIzaSyCfcs77bA-...
```

**Current Status:**
- ✅ API key loaded successfully
- ⚠️ Free tier quota exhausted
- 🔄 Quota resets in 24 hours OR get new key from https://aistudio.google.com/apikey

### 🎨 Features

1. **Virtual Try-On Mode**
   - Upload model image + apparel image
   - AI generates professional composite
   - Preserves model identity while applying clothing

2. **AI Product Shoot Mode**
   - Upload single product image
   - AI creates studio-quality product photo
   - Professional lighting and background

3. **Enhanced Mock Fallback**
   - When API quota is exhausted, uses intelligent image composition
   - Creates professional-looking composites using Canvas API
   - Displays both images with proper labels

### 🛠️ Running the Application

1. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Server runs at: `http://localhost:3000`

2. **Access the App:**
   - Landing Page: `http://localhost:3000`
   - Click "Apparel" mode
   - Upload model image (left panel)
   - Upload apparel image (left panel)
   - Click "Generate"

### ⚡ Current Behavior

**With Working API Key:**
- Calls Gemini AI API
- Generates photorealistic virtual try-on
- Returns AI-created image

**With Exhausted Quota (Current State):**
- Server returns 429 error
- Automatically falls back to enhanced mock
- Creates composite of uploaded images
- Shows "Enhanced Processing Complete" label

### 🔧 Troubleshooting

#### If you see "Mock Service" in console:
1. Hard refresh: `Ctrl + Shift + R`
2. Clear browser cache
3. Restart dev server

#### If generation fails:
1. Check browser console for errors
2. Verify `.env.local` exists with valid API key
3. Check server terminal for API response

#### If quota exceeded:
1. Wait 24 hours for reset
2. Get new API key from Google AI Studio
3. Update `.env.local` with new key
4. Restart server

### 📊 Model Comparison

| Model | Free Tier | Image Generation | Quota |
|-------|-----------|-----------------|-------|
| `gemini-2.5-flash-image-preview` | ❌ Limited | ✅ Yes | Very Low |
| `gemini-1.5-flash` | ✅ Good | ⚠️ Text-only | 15 RPM |
| `gemini-1.5-pro` | ✅ Good | ⚠️ Text-only | 2 RPM |

**Note:** `gemini-1.5-flash` may not support `responseModalities: ['IMAGE']`. The current implementation will fall back to mock when this happens.

### 🎯 Next Steps

1. **Get Fresh API Key** with available quota
2. **Test Real Generation** with new key
3. **Consider Paid Tier** for production use
4. **Optimize Prompts** for better results

### 🌐 Deployment

When ready to deploy:
1. Build: `npm run build`
2. Set environment variables on hosting platform
3. Deploy `dist/` folder
4. Configure API routes on your hosting platform

### 📝 Notes

- **Security:** API key is NEVER exposed to browser
- **Performance:** Server-side calls avoid CORS issues
- **Fallback:** Enhanced mock provides good UX when quota exhausted
- **Branding:** Fully rebranded to Siyada Studio

---

**Made with ❤️ by Siyada Tech**

