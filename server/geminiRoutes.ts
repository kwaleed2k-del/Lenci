import type { ViteDevServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Manually read .env.local file
let API_KEY = '';
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
    // Try UTF-8 first, then UTF-16LE if that fails
    let envContent = readFileSync(envPath, 'utf-8');
    
    // Detect UTF-16 encoding (has null bytes)
    if (envContent.includes('\u0000')) {
        console.log('📝 Detected UTF-16 encoding, converting to UTF-8...');
        envContent = readFileSync(envPath, 'utf16le');
    }
    
    // Parse line by line to handle different line endings
    const lines = envContent.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('GEMINI_API_KEY=')) {
            API_KEY = trimmed.substring('GEMINI_API_KEY='.length).trim();
            console.log('✅ Loaded GEMINI_API_KEY from .env.local, starts with:', API_KEY.substring(0, 15) + '...');
            break;
        }
    }
    if (!API_KEY) {
        console.log('❌ .env.local exists but GEMINI_API_KEY not found');
    }
} else {
    console.log('❌ .env.local file not found at:', envPath);
}

// Fallback to process.env
if (!API_KEY) {
    API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    if (API_KEY) {
        console.log('✅ Using GEMINI_API_KEY from process.env');
    }
}

export function registerGeminiRoutes(server: ViteDevServer) {
    const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

    server.middlewares.use('/api/health', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, ai: !!ai }));
    });

    // POST /api/apparel/detect
    server.middlewares.use('/api/apparel/detect', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        if (!ai) { res.statusCode = 500; res.end(JSON.stringify({ error: 'AI not configured' })); return; }
        try {
            const chunks: Uint8Array[] = [];
            for await (const chunk of req) chunks.push(chunk);
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const { imageBase64, prompt } = body;
            const model = body.model || 'gemini-2.5-flash-image-preview';

            // Parse data URL to capture correct mime type
            const match = String(imageBase64).match(/^data:(.*?);base64,(.*)$/);
            const mimeType = match?.[1] || 'image/png';
            const b64 = match?.[2] || String(imageBase64);

            const parts = [
                { text: prompt || 'Detect apparel JSON' },
                { inlineData: { mimeType, data: b64 } }
            ];

            const result = await ai.models.generateContent({ model, contents: { parts } });
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ text }));
        } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e?.message || 'Unknown error', stack: e?.stack }));
        }
    });

    // POST /api/imaging/process
    server.middlewares.use('/api/imaging/process', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        if (!ai) { res.statusCode = 500; res.end(JSON.stringify({ error: 'AI not configured' })); return; }
        try {
            const chunks: Uint8Array[] = [];
            for await (const chunk of req) chunks.push(chunk);
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const { images, aspectRatio, settings } = body as { images: string[]; aspectRatio?: string; settings?: any };
            const model = body.model || 'gemini-2.5-flash-image-preview';

            const isTryOn = images.length === 2;
            
            // Build comprehensive prompt from settings
            let prompt = '';
            
            if (isTryOn) {
                // Virtual Try-On Mode - High Fashion Photoshoot
                prompt = `**PROFESSIONAL FASHION PHOTOSHOOT - VIRTUAL TRY-ON**

**CRITICAL REQUIREMENTS:**
- Create a REAL, PHOTOREALISTIC professional fashion photoshoot image
- The model MUST wear the exact clothing/apparel shown in image 2
- Generate a HIGH-END STUDIO or LOCATION photoshoot background (NOT the original background)
- Ultra-professional commercial fashion photography quality
- The model should be in a DIFFERENT POSE than the original image (dynamic, editorial pose)

**PHOTOGRAPHY SETTINGS:**
${settings?.shotType ? `- Shot Type: ${settings.shotType.name} - ${settings.shotType.description}` : '- Shot Type: Full Body Editorial'}
${settings?.cameraAngle ? `- Camera Angle: ${settings.cameraAngle.name} - ${settings.cameraAngle.description}` : '- Camera Angle: Eye Level'}
${settings?.focalLength ? `- Focal Length: ${settings.focalLength.name} (${settings.focalLength.mmRange}) - ${settings.focalLength.description}` : '- Focal Length: 85mm Portrait'}
${settings?.aperture ? `- Aperture: ${settings.aperture.name} - ${settings.aperture.description}` : '- Aperture: f/2.8 - Shallow depth of field'}

**LIGHTING SETUP:**
${settings?.lighting ? `- Lighting: ${settings.lighting.name} - ${settings.lighting.description}` : '- Lighting: Professional Studio Lighting (soft, flattering)'}
${settings?.lightingDirection ? `- Light Direction: ${settings.lightingDirection.name}` : '- Light Direction: Front 45-degree'}
${settings?.lightQuality ? `- Light Quality: ${settings.lightQuality.name} - ${settings.lightQuality.description}` : '- Light Quality: Soft, diffused'}
${settings?.catchlightStyle ? `- Catchlight: ${settings.catchlightStyle.name} - ${settings.catchlightStyle.description}` : '- Catchlight: Natural eye sparkle'}

**BACKGROUND & SCENE:**
${settings?.background ? `- Background: ${settings.background.name} - ${settings.background.description}` : '- Background: High-end fashion studio with professional backdrop'}
- MUST be a photoshoot-quality background (studio, urban location, minimalist set, etc.)
- Clean, professional, editorial-quality environment
${settings?.sceneProps ? `- Props/Elements: ${settings.sceneProps}` : ''}
${settings?.environmentalEffects ? `- Environmental Effects: ${settings.environmentalEffects}` : ''}

**MODEL DIRECTION:**
${settings?.expression ? `- Expression: ${settings.expression.name} - ${settings.expression.description}` : '- Expression: Confident, professional'}
${settings?.hairStyle ? `- Hair Styling: ${settings.hairStyle}` : '- Hair: Professionally styled'}
${settings?.makeupStyle ? `- Makeup: ${settings.makeupStyle}` : '- Makeup: Professional editorial makeup'}
- Pose: Dynamic, editorial, professional fashion pose (NOT the same as original image)

**COLOR & POST-PROCESSING:**
${settings?.colorGrade ? `- Color Grading: ${settings.colorGrade.name} - ${settings.colorGrade.description}` : '- Color Grading: Natural, balanced, professional'}
${settings?.isHyperRealismEnabled ? '- Render Style: ULTRA-PHOTOREALISTIC, indistinguishable from real photography' : '- Render Style: Photorealistic'}
${settings?.cinematicLook ? '- Add cinematic depth, film-like quality with subtle vignette' : ''}

**FABRIC & GARMENT DETAILS:**
${settings?.fabric ? `- Fabric Type: ${settings.fabric.name} - Pay attention to texture, drape, and material properties` : '- Ensure fabric looks realistic with proper texture and drape'}
${settings?.garmentStyling ? `- Garment Styling: ${settings.garmentStyling}` : '- Garment should fit professionally, be wrinkle-free, and styled perfectly'}

**ASPECT RATIO:**
- Output Dimensions: ${aspectRatio === '1:1' ? '1024x1024 (Square)' : aspectRatio === '4:5' ? '1024x1280 (Portrait)' : aspectRatio === '16:9' ? '1280x720 (Landscape)' : '1024x1280'}

**FINAL OUTPUT REQUIREMENTS:**
✅ Professional commercial fashion photography quality
✅ Model wearing the EXACT apparel from image 2
✅ High-end photoshoot background (studio/location/set)
✅ Different, dynamic editorial pose
✅ Perfect lighting, sharp focus, professional color grading
✅ Looks like it was shot by a professional fashion photographer
✅ Ready for commercial use (magazine, lookbook, ecommerce)

${settings?.customPrompt ? `\n**ADDITIONAL CREATIVE DIRECTION:**\n${settings.customPrompt}` : ''}

${settings?.negativePrompt ? `\n**AVOID:**\n${settings.negativePrompt}` : '\n**AVOID:**\ndeformed, disfigured, poor quality, bad anatomy, blurry, amateur, low resolution, pixelated, distorted, unrealistic'}

Generate the image now.`;
            } else {
                // Product Shoot Mode
                prompt = `**PROFESSIONAL PRODUCT PHOTOGRAPHY**

**CRITICAL REQUIREMENTS:**
- Create a REAL, PHOTOREALISTIC professional product photoshoot image
- Generate a HIGH-END STUDIO or COMMERCIAL photoshoot background
- Ultra-professional commercial product photography quality
- Different angle/composition than the original image

**PHOTOGRAPHY SETTINGS:**
${settings?.shotType ? `- Shot Type: ${settings.shotType.name} - ${settings.shotType.description}` : '- Shot Type: Hero Product Shot'}
${settings?.cameraAngle ? `- Camera Angle: ${settings.cameraAngle.name} - ${settings.cameraAngle.description}` : '- Camera Angle: Slightly elevated 3/4 view'}
${settings?.focalLength ? `- Focal Length: ${settings.focalLength.name} (${settings.focalLength.mmRange})` : '- Focal Length: 100mm Macro'}
${settings?.aperture ? `- Aperture: ${settings.aperture.name}` : '- Aperture: f/8 - Sharp product focus'}

**LIGHTING:**
${settings?.lighting ? `- Lighting: ${settings.lighting.name} - ${settings.lighting.description}` : '- Lighting: Professional Product Lighting (clean, even)'}

**BACKGROUND:**
${settings?.background ? `- Background: ${settings.background.name} - ${settings.background.description}` : '- Background: Clean, professional product photography backdrop'}
${settings?.sceneProps ? `- Props: ${settings.sceneProps}` : ''}

**COLOR GRADING:**
${settings?.colorGrade ? `- Color Grading: ${settings.colorGrade.name}` : '- Color Grading: Clean, accurate colors'}

**ASPECT RATIO:**
- Output: ${aspectRatio === '1:1' ? '1024x1024' : '1024x1280'}

✅ Professional product photography
✅ Commercial-ready image
✅ Sharp, clean, professional

${settings?.customPrompt ? `\n**ADDITIONAL:**\n${settings.customPrompt}` : ''}

Generate the image now.`;
            }
            
            const parts: any[] = [{ text: prompt }];
            for (const img of images) {
                const m = String(img).match(/^data:(.*?);base64,(.*)$/);
                const mt = m?.[1] || 'image/png';
                const d = m?.[2] || String(img);
                parts.push({ inlineData: { mimeType: mt, data: d } });
            }

            const result = await ai.models.generateContent({
                model,
                contents: { parts },
                config: { responseModalities: ['IMAGE'] }
            });
            const imageData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData;
            if (!imageData) throw new Error('No image returned from Gemini');

            const image = `data:${imageData.mimeType};base64,${imageData.data}`;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ image, mode: isTryOn ? 'virtual-tryon' : 'product-shoot', aspectRatio }));
        } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e?.message || 'Unknown error', stack: e?.stack }));
        }
    });
}


