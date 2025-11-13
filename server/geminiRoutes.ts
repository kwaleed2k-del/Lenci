import type { ViteDevServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Manually read .env.local file
let API_KEY = '';
let OPENAI_KEY = '';
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
        }
        if (trimmed.startsWith('OPENAI_API_KEY=')) {
            OPENAI_KEY = trimmed.substring('OPENAI_API_KEY='.length).trim();
            console.log('✅ Loaded OPENAI_API_KEY from .env.local, starts with:', OPENAI_KEY.substring(0, 15) + '...');
        }
    }
    if (!API_KEY) {
        console.log('❌ .env.local exists but GEMINI_API_KEY not found');
    }
    if (!OPENAI_KEY) {
        console.log('⚠️  OPENAI_API_KEY not found in .env.local');
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
if (!OPENAI_KEY) {
    OPENAI_KEY = process.env.OPENAI_API_KEY || '';
    if (OPENAI_KEY) {
        console.log('✅ Using OPENAI_API_KEY from process.env');
    }
}

export function registerGeminiRoutes(server: ViteDevServer) {
    const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;
    const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

    server.middlewares.use('/api/health', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, ai: !!ai, openai: !!openai }));
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
            const { images, aspectRatio, settings, referenceImages, identityAttributes } = body as { images: string[]; aspectRatio?: string; settings?: any; referenceImages?: string[]; identityAttributes?: any };
            const model = body.model || 'gemini-2.5-flash-image-preview';

            const isTryOn = images.length === 2;
            
            // Build comprehensive prompt from settings
            let prompt = '';
            
            if (isTryOn) {
                // Virtual Try-On Mode - High Fashion Photoshoot
                prompt = `**🚨 CRITICAL WARNING - READ THIS FIRST 🚨**

**THE FACE MUST BE 100% IDENTICAL - ZERO TOLERANCE FOR CHANGES**

This is a virtual try-on photoshoot. The ONLY thing that should change is the CLOTHING and POSE. The FACE must remain EXACTLY the same as the reference image. Any alteration to facial features, bone structure, skin tone, eye color, nose shape, lip shape, jawline, or any other facial characteristic is a COMPLETE FAILURE.

**ABSOLUTE RULE:** If you change even a single pixel of the face structure, you have failed this task. The face must be pixel-perfect identical to the reference image.

---

**PROFESSIONAL FASHION PHOTOSHOOT - VIRTUAL TRY-ON**

**CRITICAL REQUIREMENTS:**
- Create a REAL, PHOTOREALISTIC professional fashion photoshoot image
- The model MUST wear the exact clothing/apparel shown in the apparel image(s) provided
- **🚨 PRESERVE THE EXACT FACE AND HAIR - ABSOLUTE REQUIREMENT 🚨:** Keep the model's facial features, bone structure, face shape, skin tone, eye color, nose, lips, jawline, cheekbones, and hair style IDENTICAL to the original image. The face must be 100% recognizable as the EXACT SAME PERSON.
- Generate a HIGH-END STUDIO or LOCATION photoshoot background (NOT the original background)
- Ultra-professional commercial fashion photography quality
- The model should be in a DIFFERENT POSE than the original image (dynamic, editorial pose)

${identityAttributes ? `\n**IDENTITY ATTRIBUTES (STRICT):** ${
                [identityAttributes.age ? `Age: ${identityAttributes.age}` : null,
                 identityAttributes.hairType ? `Hair Type: ${identityAttributes.hairType}` : null,
                 identityAttributes.hairColor ? `Hair Color: ${identityAttributes.hairColor}` : null,
                 identityAttributes.skinTone ? `Skin Tone: ${identityAttributes.skinTone}` : null,
                 identityAttributes.bodyType ? `Body Type: ${identityAttributes.bodyType}` : null,
                 (typeof identityAttributes.heightCm === 'number') ? `Height: ${identityAttributes.heightCm} cm` : null,
                 (typeof identityAttributes.weightKg === 'number') ? `Weight: ${identityAttributes.weightKg} kg` : null]
                 .filter(Boolean).join(', ')}\n` : ''}

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

**MODEL DIRECTION (IDENTITY LOCKED - ABSOLUTE):**
${settings?.expression ? `- Expression: ${settings.expression.name} - ${settings.expression.description}` : '- Expression: Confident, professional'}
- **🚨 PIXEL-LOCKED FACE REGION - ZERO TOLERANCE 🚨:** Treat the face and hair region from Image 1 as ABSOLUTELY IMMUTABLE. Do NOT synthesize a new identity or alter ANY geometry. Maintain IDENTICAL facial features, bone structure, face shape, skin tone, eye color/shape, nose shape/size, lip shape, jawline, cheekbones, and hair style/length/texture/color. The face must be 100% recognizable as the EXACT SAME PERSON. Only global color grading may affect it uniformly, but NO structural changes are permitted.
- **MINOR RETOUCH ONLY:** Permitted edits are limited to professional retouching (reduce blemishes, flyaway hairs, harsh shadows) WITHOUT changing identity, facial structure, or hairstyle. Do NOT smooth, enhance, or idealize facial features.
- **FACIAL VERIFICATION:** Before finalizing, verify that someone who knows this person would instantly recognize them. If the face is not identical, you have failed.
${Array.isArray(referenceImages) && referenceImages.length ? '- Additional identity reference photos are included; use them STRICTLY to match face and hair with 100% accuracy. Do NOT copy background or apparel from them.' : ''}
${settings?.makeupStyle ? `- Makeup: ${settings.makeupStyle} - Apply makeup WITHOUT altering underlying facial features or bone structure.` : '- Makeup: Professional editorial makeup - Apply WITHOUT altering underlying facial features.'}
- Pose: Dynamic, editorial, professional fashion pose (NOT the same as original image)

**COLOR & POST-PROCESSING:**
${settings?.colorGrade ? `- Color Grading: ${settings.colorGrade.name} - ${settings.colorGrade.description}` : '- Color Grading: Natural, balanced, professional'}
${settings?.isHyperRealismEnabled ? '- Render Style: ULTRA-PHOTOREALISTIC, indistinguishable from real photography' : '- Render Style: Photorealistic'}
${settings?.cinematicLook ? '- Add cinematic depth, film-like quality with subtle vignette' : ''}

**FABRIC & GARMENT DETAILS (ANY APPAREL TYPE):**
${settings?.fabric ? `- Fabric Type: ${settings.fabric.name} - Pay attention to texture, drape, and material properties` : '- Ensure fabric looks realistic with proper texture and drape'}
${settings?.garmentStyling ? `- Garment Styling: ${settings.garmentStyling}` : '- Garment should fit professionally, be wrinkle-free, and styled perfectly'}
- The apparel image(s) are the single source of truth for design, color, logos, trims, and pattern repeat.
- If flat-lay or partial view is provided, infer missing sides consistently and wrap realistically around the body with physically plausible drape and seams.
- Resolve collisions/occlusions (arms, hair) naturally; maintain correct garment thickness and edge behavior (hems, collars, lapels).
- For multi-item outfits, layer inner to outer logically (base layers, mid-layers, outerwear). Buttons/zips and pocket placements must remain consistent.

**ASPECT RATIO:**
- Output Dimensions: ${aspectRatio === '1:1' ? '1024x1024 (Square)' : aspectRatio === '4:5' ? '1024x1280 (Portrait)' : aspectRatio === '16:9' ? '1280x720 (Landscape)' : '1024x1280'}

**FINAL OUTPUT REQUIREMENTS:**
✅ Professional commercial fashion photography quality
✅ Model wearing the EXACT apparel from the provided apparel image(s)
✅ **🚨 EXACT SAME FACE AND HAIR - 100% IDENTICAL 🚨** as the original model image - The face must be instantly recognizable as the EXACT SAME PERSON
✅ High-end photoshoot background (studio/location/set)
✅ Different, dynamic editorial pose
✅ Perfect lighting, sharp focus, professional color grading
✅ Looks like it was shot by a professional fashion photographer
✅ Ready for commercial use (magazine, lookbook, ecommerce)
✅ **FACIAL VERIFICATION:** Before finalizing, verify that the face is 100% identical to the reference. If not, regenerate with stricter adherence.

**🚨 WHAT NOT TO CHANGE - ABSOLUTE PROHIBITIONS 🚨:**
❌ DO NOT change the model's facial features, bone structure, face shape, or proportions - THIS IS A COMPLETE FAILURE
❌ DO NOT change the model's hair style, color, length, or texture (no haircuts or recolors) - PRESERVE EXACTLY
❌ DO NOT change the model's skin tone, complexion, or facial landmarks - MUST BE IDENTICAL
❌ DO NOT change the model's eye color/shape, nose, mouth, jawline, ears, or eyebrows - PIXEL-PERFECT MATCH REQUIRED
❌ DO NOT smooth, enhance, or idealize facial features - PRESERVE ALL NATURAL DETAILS
❌ DO NOT add or remove facial hair - PRESERVE EXACTLY AS SHOWN
❌ DO NOT change the hairline - IT'S PART OF FACIAL STRUCTURE
❌ DO NOT adjust facial symmetry - PRESERVE NATURAL ASYMMETRY IF PRESENT
❌ ONLY change the clothing/apparel and pose/background - THE FACE IS ABSOLUTE AND UNTOUCHABLE

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

            // Add identity reference images
            if (Array.isArray(referenceImages)) {
                for (const ref of referenceImages) {
                    const m = String(ref).match(/^data:(.*?);base64,(.*)$/);
                    const mt = m?.[1] || 'image/png';
                    const d = m?.[2] || String(ref);
                    parts.push({ inlineData: { mimeType: mt, data: d } });
                }
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

    // POST /api/openai/generate - DALL-E 3 Image Generation
    server.middlewares.use('/api/openai/generate', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        if (!openai) { 
            res.statusCode = 500; 
            res.end(JSON.stringify({ error: 'OpenAI not configured. Please add OPENAI_API_KEY to .env.local' })); 
            return; 
        }

        try {
            const chunks: Uint8Array[] = [];
            for await (const chunk of req) chunks.push(chunk);
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const { prompt, aspectRatio, quality } = body;

            // Map aspect ratio to DALL-E size
            let size: '1024x1024' | '1024x1792' | '1792x1024' = '1024x1024';
            if (aspectRatio === '9:16' || aspectRatio === '3:4') {
                size = '1024x1792'; // Portrait
            } else if (aspectRatio === '16:9' || aspectRatio === '4:3') {
                size = '1792x1024'; // Landscape
            }

            console.log(`🎨 DALL-E 3 generating image with prompt: "${prompt.substring(0, 100)}..."`);
            console.log(`   Size: ${size}, Quality: ${quality || 'hd'}`);

            const response = await openai.images.generate({
                model: 'dall-e-3',
                prompt: prompt,
                n: 1,
                size: size,
                quality: quality || 'hd',
                response_format: 'b64_json',
            });

            const imageB64 = response.data[0].b64_json;
            if (!imageB64) {
                throw new Error('No image data received from DALL-E 3');
            }

            const image = `data:image/png;base64,${imageB64}`;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ 
                image, 
                model: 'dall-e-3', 
                size, 
                revised_prompt: response.data[0].revised_prompt 
            }));

        } catch (e: any) {
            console.error('❌ DALL-E 3 generation error:', e.message);
            res.statusCode = 500;
            res.end(JSON.stringify({ 
                error: e?.message || 'DALL-E 3 generation failed', 
                stack: e?.stack 
            }));
        }
    });
}


