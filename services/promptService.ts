import type { AIModel, ApparelItem, Scene, GenerationMode, Animation, AspectRatio, ApparelCreativeControls, ProductCreativeControls, DesignPlacementControls, DesignInput, StagedAsset, ReimagineCreativeControls } from '../types';
import { FABRIC_STYLE_OPTIONS, MOCKUP_STYLE_OPTIONS, DESIGN_LIGHTING_STYLE_OPTIONS, DESIGN_CAMERA_ANGLE_OPTIONS, PRINT_STYLE_OPTIONS, DESIGN_PLACEMENT_OPTIONS } from '../constants';

interface BasePromptParams {
    styleDescription?: string;
    aspectRatio: AspectRatio['value'];
}

interface ApparelPromptParams extends BasePromptParams {
    studioMode: 'apparel';
    uploadedModelImage: string | null;
    uploadedModelRefs?: string[] | null; // up to 4 additional references
    selectedModel: AIModel | null;
    apparel: ApparelItem[];
    scene: Scene;
    animation?: Animation;
    generationMode: GenerationMode;
    promptedModelDescription: string;
    modelLightingDescription: string | null;
    apparelControls: ApparelCreativeControls;
    modelAttributes?: { age?: string; hairType?: string; hairColor?: string; skinTone?: string; bodyType?: string; heightCm?: number; weightKg?: number } | null;
    baseLookImageB64?: string | null;
}

interface ProductPromptParams extends BasePromptParams {
    studioMode: 'product';
    productImage: string | null;
    stagedAssets: StagedAsset[];
    scene: Scene;
    generationMode: GenerationMode;
    productControls: ProductCreativeControls;
}

interface DesignPromptParams extends BasePromptParams {
    studioMode: 'design';
    mockupImage: DesignInput;
    designImage: DesignInput;
    backDesignImage: DesignInput | null;
    designPlacementControls: DesignPlacementControls;
    scene: Scene;
    shotView: 'front' | 'back';
}

interface ReimaginePromptParams extends BasePromptParams {
    studioMode: 'reimagine';
    reimagineSourcePhoto: string;
    newModelPhoto: string | null;
    reimagineControls: ReimagineCreativeControls;
}


type PromptGenerationParams = ApparelPromptParams | ProductPromptParams | DesignPromptParams | ReimaginePromptParams;


const parseDataUrl = (dataUrl: string) => {
    const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
    if (!match) {
        throw new Error("Invalid data URL");
    }
    return {
        mimeType: match[1],
        data: match[2],
    };
};

export const promptService = {
    generatePrompt: (params: PromptGenerationParams): { parts: any[] } => {
        const parts: any[] = [];
        
        // ===================================
        // --- RE-IMAGINE MODE PROMPT LOGIC ---
        // ===================================
        if (params.studioMode === 'reimagine') {
            const { reimagineSourcePhoto, newModelPhoto, reimagineControls, aspectRatio, styleDescription } = params;
            const { newModelDescription, newBackgroundDescription } = reimagineControls;

            if (!newModelPhoto && !newModelDescription.trim() && !newBackgroundDescription.trim()) {
                throw new Error("Please describe or upload a new model, or describe a new background.");
            }

            let textPrompt = `**PHOTO RE-IMAGINE DIRECTIVE**

**PRIMARY GOAL:** You are an expert photo editor. You are provided with a source image and other assets. Your mission is to generate a new, photorealistic image by editing the source image according to the instructions below.

**NON-NEGOTIABLE CORE RULE:** You MUST preserve the **exact outfit** (all clothing items, colors, and styles) and the **exact pose** of the person from the source image. This is the highest priority.

---
**1. ASSET ANALYSIS (CRITICAL)**
- **FIRST IMAGE (SOURCE PHOTO):** This is the source of truth for the **OUTFIT** and **POSE**.
${newModelPhoto ? '- **SECOND IMAGE (NEW MODEL REFERENCE):** This is the source of truth for the new person\'s **FACE and IDENTITY**.\n' : ''}
---
**2. EDITING INSTRUCTIONS**
`;

            if (newModelPhoto) {
                textPrompt += `- **MODEL SWAP BY PHOTO (CRITICAL):** Replace the person in the SOURCE PHOTO with the person from the NEW MODEL REFERENCE. You must transfer the face and identity from the NEW MODEL REFERENCE with perfect accuracy. The new person MUST be in the exact same pose and be wearing the exact same outfit as the person in the SOURCE PHOTO.\n`;
                if (newModelDescription.trim()) {
                     textPrompt += `- **MODEL STYLING (GUIDANCE):** After swapping the model, apply this additional styling guidance: "${newModelDescription.trim()}".\n`;
                }
            } else if (newModelDescription.trim()) {
                textPrompt += `- **MODEL SWAP BY DESCRIPTION (CRITICAL):** Replace the person in the source image with a new person who perfectly matches this description: "${newModelDescription.trim()}". The new person MUST be in the exact same pose and be wearing the exact same outfit as the person in the original image.\n`;
            } else {
                textPrompt += `- **MODEL PRESERVATION:** The person from the source image should be preserved with 100% accuracy.\n`;
            }

            if (newBackgroundDescription.trim()) {
                textPrompt += `- **BACKGROUND SWAP (CRITICAL):** Replace the background of the source image with a new, photorealistic scene that perfectly matches this description: "${newBackgroundDescription.trim()}". The person, their pose, and their outfit must be seamlessly integrated into this new background with realistic lighting and shadows.\n`;
            } else {
                textPrompt += `- **BACKGROUND PRESERVATION:** The background from the source image should be preserved.\n`;
            }

            textPrompt += `
---
**3. FINAL IMAGE STYLE & QUALITY**
- **ASPECT RATIO (CRITICAL):** The final image output MUST have an aspect ratio of exactly ${aspectRatio}.
- **QUALITY:** This is a professional photoshoot. The final output must be an ultra-high-quality, hyperrealistic, and tack-sharp photograph.
${styleDescription ? `- **STYLISTIC GOAL:** The final image must match the artistic style described as: "${styleDescription}".\n` : ''}`;

            parts.push({ text: textPrompt });
            
            // Add source photo first
            const { mimeType: sourceMime, data: sourceData } = parseDataUrl(reimagineSourcePhoto);
            parts.push({ inlineData: { mimeType: sourceMime, data: sourceData } });
            
            // Add new model photo if it exists
            if (newModelPhoto) {
                 const { mimeType: modelMime, data: modelData } = parseDataUrl(newModelPhoto);
                 parts.push({ inlineData: { mimeType: modelMime, data: modelData } });
            }

            return { parts };
        }
        
        // =======================================================
        // --- APPAREL MODE - CONSISTENT PACK GENERATION LOGIC ---
        // =======================================================
        if (params.studioMode === 'apparel' && params.baseLookImageB64) {
            const { baseLookImageB64, scene, apparelControls, aspectRatio, styleDescription } = params;
            const {
                shotType, expression, aperture, focalLength, fabric, cameraAngle,
                lightingDirection, lightQuality, catchlightStyle, isHyperRealismEnabled,
                cinematicLook, styleStrength, colorGrade, hairStyle, makeupStyle, garmentStyling
            } = apparelControls;

            let textPrompt = `**MASTER RE-POSE DIRECTIVE**

**PRIMARY GOAL:** You are provided with a reference image of a model wearing a complete outfit. Your critical mission is to generate a new photograph of the *same model* wearing the *exact same outfit*, but with a new pose and in a new scene as described below.

**NON-NEGOTIABLE RULES:**
1.  **IDENTITY & OUTFIT PRESERVATION:** Replicate the model's identity (face, body, hair) and the entire outfit (all clothing, colors, textures) from the reference image with 100% accuracy. Do NOT change the clothing.
2.  **SETTINGS ARE LAW:** You MUST follow the new POSE, SCENE, and CAMERA instructions below. These settings override the pose and scene from the reference image.

---
**1. MODEL & OUTFIT (Source: First Image)**
- **MISSION:** Use the provided image as the definitive source for the model's appearance and their complete wardrobe.

---
`;
            // POSE & STYLING
            textPrompt += `**2. POSE & STYLING (Source: User Settings)**
- **POSE (Body Language):** The model must be positioned exactly as described: ${shotType.description}.
- **EXPRESSION:** The model's facial expression must be: ${expression.description}.
`;
            if (hairStyle.trim()) textPrompt += `- **HAIR:** The model's hair is styled as: "${hairStyle.trim()}".\n`;
            if (makeupStyle.trim()) textPrompt += `- **MAKEUP:** The model's makeup is a "${makeupStyle.trim()}" look.\n`;
            if (garmentStyling.trim()) textPrompt += `- **GARMENT STYLING:** The clothing should be styled as follows: ${garmentStyling.trim()}.\n`;
            if (fabric.id !== 'fab1') textPrompt += `- **FABRIC TEXTURE:** The primary garment(s) should have the texture of ${fabric.description}\n`;
            textPrompt += '\n';

            // SCENE & LIGHTING
            const isCustomBackground = scene.background.id === 'custom' && scene.background.type === 'image';
            const backgroundPrompt = isCustomBackground
                ? `in the environment depicted in the FINAL image provided`
                : scene.background.type === 'image' ? `in a photorealistic ${scene.background.name}` : `against a simple studio background with a ${scene.background.name.toLowerCase()} color.`;
            
            let lightingPrompt = `Apply ${scene.lighting.description}.`;
            if (lightingDirection.id !== 'ld1') lightingPrompt += ` The main light source is positioned ${lightingDirection.description}.`;
            if (lightQuality.id !== 'lq1') lightingPrompt += ` The light quality is ${lightQuality.description}.`;
            lightingPrompt += ` The final image should feature ${catchlightStyle.description}.`;
            lightingPrompt += ' The model, apparel, and background must all be lit from the same light source and direction to create a cohesive and realistic photograph.';

            textPrompt += `**3. SCENE & LIGHTING (Source: User Settings)**
- **BACKGROUND:** The scene is set ${backgroundPrompt}.
- **LIGHTING (CRITICAL):** ${lightingPrompt}
`;
            if(scene.sceneProps.trim()) textPrompt += `- **PROPS:** The scene must include: ${scene.sceneProps.trim()}.\n`;
            if(scene.environmentalEffects.trim()) textPrompt += `- **EFFECTS:** The scene should have these atmospheric effects: ${scene.environmentalEffects.trim()}.\n`;
            textPrompt += '\n';

            // CAMERA & LENS
            textPrompt += `**4. CAMERA & LENS (Source: User Settings)**
- **CAMERA ANGLE:** ${cameraAngle.description}.
- **APERTURE:** ${aperture.description}.
- **FOCAL LENGTH:** ${focalLength.description}.
\n`;

            // FINAL IMAGE STYLE & QUALITY
            textPrompt += `**5. FINAL IMAGE STYLE & QUALITY (Source: User Settings)**
- **ASPECT RATIO (CRITICAL):** The final image output MUST have an aspect ratio of exactly ${aspectRatio}.
- **QUALITY:** This is a professional photoshoot. The final output must be an ultra-high-quality, hyperrealistic, and tack-sharp photograph.
`;
            if (styleDescription) textPrompt += `- **STYLISTIC GOAL:** The final image must match the artistic style described as: "${styleDescription}". Apply this style with an influence of approximately ${styleStrength}%.\n`;
            if (colorGrade.id !== 'cg_none') textPrompt += `- **COLOR GRADE:** Apply a professional color grade with the following style: ${colorGrade.description}\n`;
            if (cinematicLook) textPrompt += `**CINEMATIC LOOK (ENABLED):** The image must have a cinematic quality, emulating a still from a high-budget film with fine, realistic film grain.\n`;
            if (isHyperRealismEnabled) textPrompt += `**HYPER-REALISM MODE (ENABLED):** Pay extreme attention to micro-details like skin pores, fabric weave, and ensure all anatomy is 100% accurate.\n`;
            
            parts.push({ text: textPrompt });
            const { mimeType, data } = parseDataUrl(baseLookImageB64);
            parts.push({ inlineData: { mimeType, data } });

            if (isCustomBackground) {
                 const { mimeType, data } = parseDataUrl(scene.background.value);
                 parts.push({ inlineData: { mimeType, data } });
            }

            return { parts };
        }

        // ===================================
        // --- DESIGN MODE PROMPT LOGIC ---
        // ===================================
        if (params.studioMode === 'design') {
            const { mockupImage, designImage, backDesignImage, designPlacementControls, scene, aspectRatio, styleDescription, shotView } = params;
            
            const activeDesignImage = (shotView === 'back' && backDesignImage) ? backDesignImage : designImage;
            const activePlacementControls = shotView === 'back' ? designPlacementControls.back : designPlacementControls.front;

            // Get text descriptions from IDs
            const fabricStyle = FABRIC_STYLE_OPTIONS.find(f => f.id === designPlacementControls.fabricStyle)?.name || 'standard cotton';
            const mockupStyle = MOCKUP_STYLE_OPTIONS.find(m => m.id === designPlacementControls.mockupStyle)?.name || 'hanging';
            const lightingStyle = DESIGN_LIGHTING_STYLE_OPTIONS.find(l => l.id === designPlacementControls.lightingStyle)?.name || 'studio softbox lighting';
            const cameraAngleOption = DESIGN_CAMERA_ANGLE_OPTIONS.find(c => c.id === designPlacementControls.cameraAngle);
            const printStyle = PRINT_STYLE_OPTIONS.find(p => p.id === designPlacementControls.printStyle)?.name || 'screen printed';

            let cameraAnglePrompt = `The photograph is shot from a ${cameraAngleOption?.name || 'eye-level front view'}.`;
            if (designPlacementControls.cameraAngle === 'detail') {
                 cameraAnglePrompt = `**CAMERA ANGLE (CRITICAL DETAIL SHOT):** The photograph is an extreme close-up, tightly framed *only* on the design area. The design should fill most of the frame. Show the intricate details of the "${printStyle}" print style on the fabric texture.`;
            } else if (shotView === 'back') {
                 cameraAnglePrompt += ' This is a view of the BACK of the garment.';
            }

            let mockupAndMaterialPrompt = `**MOCKUP & MATERIAL (Based on the FIRST reference image):**
- **Apparel Style (CRITICAL):** The final image must represent a garment that perfectly matches this detailed description: "${designPlacementControls.apparelType}". This description defines the complete look, including the cut, style, and any color patterns (like color blocking).
- **Base Color:** The garment's primary color should be this hex code: ${designPlacementControls.shirtColor}. However, the text description above is the priority and overrides this color if specific colors or patterns are mentioned.
- **Fabric Type:** The garment must look like it's made of ${fabricStyle}. Pay attention to the texture and weight.
- **Presentation Style:** The garment should be presented in a professional ${mockupStyle} style.`;

            if (shotView === 'back') {
                mockupAndMaterialPrompt += `
- **VIEWPOINT (MANDATORY):** You are generating a photograph of the **BACK** of the garment. The provided MOCKUP image is a reference for the garment's general style, color, and material ONLY. You must creatively render the back view of this garment based on the front view provided.`;
            } else {
                mockupAndMaterialPrompt += `
- The overall shape, fit, and wrinkles should be inspired by the provided MOCKUP image.`;
            }
            
            const { placement, scale, rotation, offsetX, offsetY } = activePlacementControls;
            const placementName = DESIGN_PLACEMENT_OPTIONS.find(p => p.id === placement)?.name || 'center';

            let sizeDescriptor = '';
            if (scale < 20) {
                sizeDescriptor = 'very small, like a tag-sized logo (approx 1-2 inches wide)';
            } else if (scale < 40) {
                sizeDescriptor = 'small, like a standard chest logo (approx. 3-4 inches wide)';
            } else if (scale < 70) {
                sizeDescriptor = 'medium, as a standard graphic for the front of a t-shirt (approx. 8-10 inches wide)';
            } else if (scale < 100) {
                sizeDescriptor = 'large, covering a significant portion of the chest area (approx. 11-12 inches wide)';
            } else {
                sizeDescriptor = 'extra-large, as an oversized or full-front print covering most of the printable area of the garment';
            }

            let designAndPlacementPrompt = `**DESIGN & PLACEMENT (Based on the SECOND reference image):**`;
            if (shotView === 'back') {
                designAndPlacementPrompt += `
- **Design Application (CRITICAL BACK VIEW):** The artwork provided in the DESIGN image is the **BACK PRINT**. You MUST place this design on the **BACK** of the garment you are generating. Do not place this design on the front.`;
            } else {
                designAndPlacementPrompt += `
- **Design Application (FRONT VIEW):** Take the artwork from the DESIGN image and place it on the **FRONT** of the garment.`;
            }
            designAndPlacementPrompt += `
- **Print Style:** The design should look like it was applied using a "${printStyle}" method. It needs to have the correct texture and finish (e.g., flat for screen print, textured for embroidery).
- **Placement (CRITICAL):** The design must be placed on the **${shotView}** of the garment, centered on the **${placementName}** area.
- **Size (CRITICAL):** The final printed size of the design on the garment must be **${sizeDescriptor}**. The provided DESIGN image should be scaled appropriately to achieve this size.
- **Fine-Tuning Adjustments (Apply AFTER placement and sizing):**
    - **Rotation:** After placing and sizing, rotate the design by exactly ${rotation} degrees.
    - **Offset:** After rotating, nudge the design horizontally by ${offsetX}% of the garment's width and vertically by ${offsetY}% of the garment's height. (A negative horizontal offset moves it left, a negative vertical offset moves it up).
- **Realism:** The design must blend realistically with the fabric. It should have a ${designPlacementControls.fabricBlend}% blend with the underlying fabric texture. It must ${designPlacementControls.wrinkleConform ? '' : 'NOT '}conform to the fabric's wrinkles, folds, lighting, and shadows.`;

            const isImageBackground = scene.background.type === 'image';
            const backgroundPrompt = isImageBackground
                ? `The garment is photographed within a realistic ${scene.background.name.toLowerCase()} environment. **CRITICAL PHOTOGRAPHY STYLE:** The background MUST be artistically blurred (bokeh), creating a shallow depth-of-field effect. The mockup itself must be the only sharp object in focus.`
                : `The garment should be set against a clean, simple ${scene.background.name.toLowerCase()} studio background. The background color/gradient should be subtle and complement the t-shirt.`;

            let textPrompt = `**PROFESSIONAL MOCKUP GENERATION**
**PRIMARY GOAL:** You are provided with two reference images: a MOCKUP of a blank garment, and a DESIGN to be placed on it. Your critical mission is to generate a new, ultra-photorealistic product photograph of the garment with the design applied, based on the following detailed instructions.

${mockupAndMaterialPrompt}

${designAndPlacementPrompt}

**PHOTOGRAPHY & SCENE:**
- **Lighting:** The scene must be lit with ${lightingStyle}.
- **Camera Angle:** ${cameraAnglePrompt}
- **Background:** ${backgroundPrompt}

**FINAL IMAGE STYLE & QUALITY:**
- **Aspect Ratio (CRITICAL):** The final image output MUST have an aspect ratio of exactly ${aspectRatio}.
- **Quality:** The final output must be an ultra-high-quality, hyperrealistic, and tack-sharp photograph, indistinguishable from a real product photo shot for a high-end e-commerce brand.
${styleDescription ? `- **Stylistic Goal:** The final image must match the artistic style described as: "${styleDescription}".\n` : ''}`;

            parts.push({ text: textPrompt });
            const { mimeType: mockupMime, data: mockupData } = parseDataUrl(mockupImage.base64);
            parts.push({ inlineData: { mimeType: mockupMime, data: mockupData } });
            
            const { mimeType: designMime, data: designData } = parseDataUrl(activeDesignImage.base64);
            parts.push({ inlineData: { mimeType: designMime, data: designData } });
            
            return { parts };
        }

        const {
            generationMode,
            styleDescription,
            aspectRatio,
        } = params;

        const creativeControls = params.studioMode === 'apparel' ? params.apparelControls : params.productControls;

        // --- Custom Prompt Override ---
        if (creativeControls.customPrompt && creativeControls.customPrompt.trim() !== '') {
            let customPromptText = `**PRIMARY GOAL:** You will receive a text prompt and multiple images. Your critical mission is to follow the text prompt to create a photorealistic image, using the provided images as assets.\n\n**USER PROMPT:**\n${creativeControls.customPrompt}`;
            
            parts.push({ text: customPromptText });
            
            if (params.studioMode === 'apparel' && params.uploadedModelImage) {
                 const { mimeType, data } = parseDataUrl(params.uploadedModelImage);
                 parts.push({ inlineData: { mimeType, data } });
            } else if (params.studioMode === 'product' && params.productImage) {
                 const { mimeType, data } = parseDataUrl(params.productImage);
                 parts.push({ inlineData: { mimeType, data } });
            }

            if (params.studioMode === 'apparel') {
                 for (const item of params.apparel) {
                    const { mimeType, data } = parseDataUrl(item.base64);
                    parts.push({ inlineData: { mimeType, data } });
                }
            }
            
            const isCustomBackground = params.scene.background.id === 'custom' && params.scene.background.type === 'image';
            if (isCustomBackground) {
                 const { mimeType, data } = parseDataUrl(params.scene.background.value);
                 parts.push({ inlineData: { mimeType, data } });
            }
            return { parts };
        }
        // --- End Custom Prompt Override ---

        // ===================================
        // --- PRODUCT MODE PROMPT LOGIC ---
        // ===================================
        if (params.studioMode === 'product') {
            const {stagedAssets, scene, productControls} = params;
            if (!stagedAssets || stagedAssets.length === 0) throw new Error("No product assets specified for prompt generation.");
            
            // Debug log to verify settings
            console.log('🎨 PRODUCT PROMPT GENERATION:', {
                backgroundId: scene.background.id,
                backgroundName: scene.background.name,
                lightingId: scene.lighting.id,
                lightingName: scene.lighting.name,
                surfaceId: productControls.surface.id,
                surfaceName: productControls.surface.name,
                cameraAngleId: productControls.cameraAngle.id,
                cameraAngleName: productControls.cameraAngle.name,
            });
            
            const {
                aperture,
                focalLength,
                cameraAngle,
                lightingDirection,
                lightQuality,
                catchlightStyle,
                isHyperRealismEnabled,
                cinematicLook,
                styleStrength,
                colorGrade,
                productShadow,
                customProps,
                surface,
                productMaterial,
            } = productControls;

            const isCustomBackground = scene.background.id === 'custom' && scene.background.type === 'image';
        
            let backgroundPrompt = '';
            if (isCustomBackground) {
                backgroundPrompt = `in the environment depicted in the FINAL image provided`;
            } else if (scene.background.type === 'image') {
                // Detailed, explicit background descriptions
                const backgroundDescriptions: Record<string, string> = {
                    'b4': 'on a vibrant city street with urban architecture, buildings, and street elements visible in the background. The scene should feel dynamic and metropolitan.',
                    'b6': 'on a sunny beach with sand, ocean water, and coastal elements visible in the background. The scene should feel tropical and vacation-like.',
                    'b7': 'in a lush forest setting with green foliage, plants, trees, and natural elements surrounding the product. The scene should feel organic and nature-inspired.',
                    'b9': 'in a cozy cafe interior with warm lighting, wooden furniture, coffee shop elements, and an inviting atmosphere visible in the background.',
                    'b13': 'in a minimalist art gallery with clean white walls, modern architecture, and a sophisticated museum-like atmosphere.',
                    'b14': 'in an industrial loft space with exposed brick, concrete, metal elements, and urban warehouse aesthetics.',
                    'lbn9': 'on a modern rooftop terrace at sunset with city skyline, urban landscape, and golden hour lighting visible in the background.',
                    'b16': 'on a neon-lit city street at night with colorful lights, urban energy, and cyberpunk-inspired atmosphere.',
                    'b5': 'in a modern interior space with contemporary furniture, clean lines, and sophisticated design elements.',
                    'b8': 'in front of brutalist architecture with concrete structures, geometric shapes, and bold architectural elements.',
                    'b3': 'against a beautiful sunset gradient background with warm pink and orange tones creating a dreamy atmosphere.',
                    'b11': 'against a soft pastel gradient background with gentle blue and pink tones.',
                };
                
                backgroundPrompt = backgroundDescriptions[scene.background.id] || `in a photorealistic ${scene.background.name} environment`;
            } else {
                backgroundPrompt = `on a clean surface against a simple studio background with a ${scene.background.name.toLowerCase()} color.`;
            }
            
            let lightingPrompt = '';
            if (scene.timeOfDay) {
                const timeOfDayDescriptions = {
                    'Sunrise': 'The lighting should evoke early morning sunrise, with soft, warm, low-angle light creating long, gentle shadows.',
                    'Midday': 'The lighting should be bright, direct midday sun from high above, creating harsh, defined shadows.',
                    'Golden Hour': 'The lighting must be warm, golden hour sunlight from the side, creating a beautiful, soft glow.',
                    'Twilight': 'The scene is lit by the cool, soft, ambient light of twilight (blue hour), with very soft or no distinct shadows.',
                    'Night': 'The scene is set at night, with dramatic, artificial light sources like streetlights or neon signs, creating high contrast.'
                };
                lightingPrompt = `**LIGHTING (CRITICAL):** ${timeOfDayDescriptions[scene.timeOfDay]}`;
            } else {
                // Detailed, explicit lighting descriptions
                const lightingDescriptions: Record<string, string> = {
                    'lp1': 'The lighting is bright, even, and nearly shadowless - perfect clean e-commerce lighting with soft diffused light from all directions.',
                    'lp2': 'The lighting is dramatic with a single, hard light source from the side, creating deep shadows and highlighting texture and form.',
                    'lp3': 'The lighting is soft, natural window light - diffused, directional light as if streaming through a large nearby window, creating gentle shadows.',
                    'lp4': 'The lighting is direct, even studio ring light from the front, creating a distinct circular catchlight on reflective surfaces.',
                    'lp5': 'The lighting is luxe and moody - low-key lighting with soft, focused spotlights creating a mysterious, high-end atmosphere.',
                };
                
                lightingPrompt = `**LIGHTING (CRITICAL):** ${lightingDescriptions[scene.lighting.id] || scene.lighting.description}`;
            }

            if (lightingDirection.id !== 'ld1') { // Not "As Described"
                lightingPrompt += ` The main light source is positioned ${lightingDirection.description}.`;
            }
            if (lightQuality.id !== 'lq1') { // Not "As Described"
                lightingPrompt += ` The light quality is ${lightQuality.description}.`;
            }
            
            lightingPrompt += ` The final image should feature ${catchlightStyle.description}.`;
            lightingPrompt += ' The product and background must all be lit from the same light source and direction to create a cohesive and realistic photograph.';
            
            const shadowDescription = {
                'Soft': 'The product must cast a realistic, soft, diffused shadow on the surface.',
                'Hard': 'The product must cast a realistic, hard, defined shadow on the surface, appropriate for the lighting.',
                'None': 'The product should appear to float slightly with no visible shadow.'
            }[productShadow];
            
            let productAndStagingPrompt = `**STAGING (CRITICAL):**
- You are provided with ${stagedAssets.length} image(s) of assets.
- Your mission is to arrange them in a new scene according to the following layout instructions.
- The coordinates (x, y) represent the center of the asset, where (0,0) is top-left and (100,100) is bottom-right.
- The z-index determines layering; a higher number is in front.

**Asset Layout & Details:**\n`;
            stagedAssets.forEach((asset, index) => {
                const assetType = asset.id === 'product' ? 'PRIMARY PRODUCT' : `Companion Asset ${index}`;
                
                let materialPrompt = '';
                if (asset.id === 'product') {
                    if (productMaterial.category === 'Artistic') {
                         materialPrompt = `Artistic Transformation: The primary product must be artistically transformed into ${productMaterial.description}. This is a creative re-interpretation, not a simple material change.\n`;
                    } else {
                        materialPrompt = `Material & Style: The primary product should be rendered as if it is made of ${productMaterial.description}. Render lighting, shadows, and reflections to match this material realistically.\n`;
                    }
                }

                productAndStagingPrompt += `- **Image ${index+1} (${assetType}):**
    - Position: Place the center of this asset at approximately x=${asset.x.toFixed(0)}, y=${asset.y.toFixed(0)}.
    - Layer: Render at layer z=${asset.z}.
    - Size: The asset should be scaled to ${asset.scale.toFixed(0)}% of the staging canvas's longest side.
    - Do NOT alter the asset itself unless specified by the material style below.
    ${materialPrompt ? `- ${materialPrompt}` : ''}`;
            });
            
            let textPrompt = `**PROFESSIONAL PRODUCT PHOTOSHOOT**
**PRIMARY GOAL:** You are provided with product images that have been isolated on a clean background. Your critical mission is to place these products onto a new surface within a beautifully composed, photorealistic scene, following the precise layout instructions.

**CRITICAL RULE:** You MUST follow ALL the settings below EXACTLY. Every detail about the background, lighting, surface, camera angle, and styling has been carefully chosen and MUST be implemented precisely.

${productAndStagingPrompt}

**SCENE & STAGING (MANDATORY):**
- **SURFACE (CRITICAL):** The product(s) are ${surface.description}. This surface MUST be visible and realistic.
- **BACKGROUND (CRITICAL):** The overall scene is ${backgroundPrompt}. This background setting is MANDATORY and must be clearly visible and photorealistic.
- **SHADOWS:** ${shadowDescription}
${customProps.trim() ? `- **PROPS (CRITICAL):** The scene must include the following elements, arranged naturally and artistically around the main product: ${customProps.trim()}.\n` : ''}${scene.environmentalEffects.trim() ? `- **ENVIRONMENTAL EFFECTS:** The scene must include these atmospheric effects: ${scene.environmentalEffects.trim()}.\n` : ''}
- ${lightingPrompt}
- **IMPORTANT:** The background, surface, and lighting MUST all work together cohesively to create the specified environment. Do NOT default to a plain studio background.

**CAMERA & LENS:**
- The photo is ${cameraAngle.description}.
- The photo is shot ${aperture.description}.
- The photo is shot with ${focalLength.description}.
`;
            textPrompt += `

**FINAL IMAGE STYLE & QUALITY:**
- **Aspect Ratio (CRITICAL):** The final image output MUST have an aspect ratio of exactly ${aspectRatio}.
${styleDescription ? `- **Stylistic Goal:** The final image must match the artistic style described as: "${styleDescription}". Apply this style with an influence of approximately ${styleStrength}%. A value of 100% is a perfect match, 50% is a subtle blend.\n` : ''}${colorGrade.id !== 'cg_none' ? `- **Color Grade:** Apply a professional color grade with the following style: ${colorGrade.description}\n` : ''}- This is a professional product photoshoot for a luxury brand. The final output must be an ultra-high-quality, hyperrealistic, and tack-sharp photograph, indistinguishable from a real photo shot on a high-end DSLR camera.
- Pay extreme attention to detail, especially in material texture, lighting, shadows, and reflections.
`;
            if (cinematicLook) {
                textPrompt += `
**CINEMATIC LOOK (ENABLED):**
- The image must have a cinematic quality, emulating a still from a high-budget film.
- Use properties associated with anamorphic lenses, such as subtle lens flares and a slightly wider feel.
- Apply a professional, non-destructive color grade (e.g., teal and orange, or a muted filmic look).
- Add a fine, realistic film grain to the entire image.
`;
            }

            if (isHyperRealismEnabled) {
                textPrompt += `
**HYPER-REALISM MODE (ENABLED):**
- Pay extreme attention to micro-details like material textures, reflections, and subtle light interactions.
- Ensure the product is rendered with 100% accuracy and realism.
- This is for a luxury brand product shot; the final image must be indistinguishable from a high-end DSLR photograph.
`;
            }
            parts.unshift({ text: textPrompt });
            
            stagedAssets.sort((a,b) => a.id === 'product' ? -1 : 1).forEach(asset => {
                const { mimeType, data } = parseDataUrl(asset.base64);
                parts.push({ inlineData: { mimeType, data } });
            });
            
            if (isCustomBackground) {
                const { mimeType, data } = parseDataUrl(scene.background.value);
                parts.push({ inlineData: { mimeType, data } });
            }

            // Provide structured settings so server-side imaging can follow AI Director settings exactly
            parts.push({
                settings: {
                    // Product controls
                    cameraAngle,
                    aperture,
                    focalLength,
                    colorGrade,
                    styleStrength,
                    isHyperRealismEnabled,
                    cinematicLook,
                    surface,
                    productMaterial,
                    productShadow,
                    customProps,
                    // Scene
                    background: scene.background,
                    lighting: scene.lighting,
                    lightingDirection,
                    lightQuality,
                    catchlightStyle,
                    sceneProps: scene.sceneProps,
                    environmentalEffects: scene.environmentalEffects,
                }
            });

            return { parts };
        }

        // ===================================
        // --- APPAREL MODE PROMPT LOGIC ---
        // ===================================
        const {
            uploadedModelImage, selectedModel, apparel, scene, animation, promptedModelDescription,
            modelLightingDescription, apparelControls
        } = params;
        const {
            shotType,
            expression,
            aperture,
            focalLength,
            fabric,
            cameraAngle,
            lightingDirection,
            lightQuality,
            catchlightStyle,
            isHyperRealismEnabled,
            cinematicLook,
            styleStrength,
            colorGrade,
            hairStyle,
            makeupStyle,
            garmentStyling,
        } = apparelControls;

        let textPrompt = `**🚨 CRITICAL WARNING - READ THIS FIRST 🚨**

**THE FACE MUST BE 100% IDENTICAL - ZERO TOLERANCE FOR CHANGES**

This is a virtual try-on photoshoot. The ONLY thing that should change is the CLOTHING and POSE. The FACE must remain EXACTLY the same as the reference image. Any alteration to facial features, bone structure, skin tone, eye color, nose shape, lip shape, jawline, or any other facial characteristic is a COMPLETE FAILURE.

**ABSOLUTE RULE:** If you change even a single pixel of the face structure, you have failed this task. The face must be pixel-perfect identical to the reference image.

---

**MASTER PHOTOSHOOT DIRECTIVE**

**NON-NEGOTIABLE RULES OF EXECUTION:**
1.  **FACIAL IDENTITY IS SACRED:** The face from the reference image is ABSOLUTE and UNTOUCHABLE. You are photographing the EXACT SAME PERSON. No exceptions.
2.  **STRICT MODULARITY:** You are given separate instructions for the MODEL, APPAREL, POSE, and SCENE. Each is independent and absolute. Do not infer details from one section to another (e.g., do not use the background from the model image, or the pose from the apparel image).
3.  **INPUTS ARE LAW:** You MUST follow the text descriptions and use the provided image assets as the definitive source of truth. User settings override all defaults.
4.  **ABSOLUTE APPAREL ACCURACY:** The apparel's design, pattern, and color must be derived *exclusively* from the provided apparel images.
5.  **IDENTITY PRESERVATION:** The human model's identity (face, body, etc.) must be preserved with 100% accuracy from the provided model source (image or text).

---
`;
        
        // --- 1. MODEL ---
        if (uploadedModelImage) {
            let modelPrompt = `**1. MODEL IDENTITY & PHYSICAL PRESERVATION (Source: First Reference Image)**

**🚨🚨🚨 ABSOLUTE FACIAL IDENTITY PRESERVATION - HIGHEST PRIORITY 🚨🚨🚨**

**CRITICAL INSTRUCTIONS - READ CAREFULLY:**
This is a professional photoshoot where maintaining the EXACT IDENTITY of the model is paramount. You are NOT creating a similar-looking person. You are photographing THIS EXACT PERSON in new clothing. The face must be 100% IDENTICAL to the reference image - pixel-perfect, documentary-level accuracy.

**FACIAL IDENTITY LOCK (NON-NEGOTIABLE - ZERO TOLERANCE):**
- **Face Structure:** Replicate the EXACT facial bone structure, proportions, and geometry from the reference image. Every bone, every angle, every measurement must match.
- **Face Shape:** Preserve the precise face shape (oval/round/square/heart/diamond/oblong) with identical width-to-length ratios. Do not round, sharpen, or alter the shape.
- **Skin Tone:** Match the EXACT skin tone, undertones, and complexion from the reference image with 100% accuracy. Same color, same texture, same imperfections.
- **Eyes:** Preserve the EXACT eye shape, size, spacing, color, eyelid structure, and gaze direction. The eyes are the most recognizable feature - they must be identical.
- **Eyebrows:** Maintain the precise eyebrow shape, thickness, arch, and positioning. Do not thin, thicken, or reshape them.
- **Nose:** Replicate the EXACT nose shape, size, bridge width, nostril shape, and tip structure. The nose is a key identifier - it must match perfectly.
- **Lips:** Preserve the precise lip shape, fullness, cupid's bow, and natural color. Do not make them fuller, thinner, or change their shape.
- **Jawline & Chin:** Maintain the exact jawline definition, chin shape, and lower face structure. This defines the face shape - it must be identical.
- **Cheekbones:** Preserve the exact cheekbone prominence, placement, and facial contours. Do not enhance or reduce them.
- **Facial Features Spacing:** Maintain the precise distances between eyes, nose-to-mouth ratio, and overall facial proportions. These ratios are unique to each person.
- **Unique Identifiers:** Preserve any moles, freckles, scars, dimples, or other distinguishing facial features. These are critical for recognition.
- **Age Markers:** Maintain any natural age indicators like fine lines, crow's feet, or skin texture EXACTLY as shown. Do not smooth or remove them.
- **Facial Hair:** If the reference shows facial hair (mustache, beard, stubble), preserve it EXACTLY. If there is no facial hair, do not add any.
- **Hairline:** Preserve the exact hairline shape and position from the reference image.

**❌ FORBIDDEN CHANGES - THESE WILL RESULT IN COMPLETE FAILURE:**
- DO NOT alter facial bone structure under any circumstances - this is the foundation of identity
- DO NOT change eye shape, size, or color - eyes are the most recognizable feature
- DO NOT modify nose shape or size - the nose is a key identifier
- DO NOT adjust lip shape or fullness - lips define the lower face
- DO NOT change face shape or proportions - this is what makes a person recognizable
- DO NOT alter skin tone or complexion - skin color is a fundamental identifier
- DO NOT smooth out or enhance facial features - preserve all natural details
- DO NOT apply "beauty filters" or idealized improvements - this is documentary photography
- DO NOT make the face look younger, older, or more attractive - preserve the exact age appearance
- DO NOT change gender presentation of facial features - maintain the exact gender expression
- DO NOT add or remove facial hair - preserve exactly as shown
- DO NOT change the hairline - it's part of facial structure
- DO NOT adjust facial symmetry - preserve natural asymmetry if present
- This is DOCUMENTARY-LEVEL accuracy required - the face must be recognizable as the EXACT SAME PERSON

**BODY & PHYSICAL ATTRIBUTES:**`;

            // Structured identity attributes
            const attrs = (params as any).modelAttributes || {};
            const hasDetailedAttrs = Object.keys(attrs).length > 0 && (attrs.estimatedHeightCm || attrs.heightCm || attrs.bodyType || attrs.estimatedAge);
            
            if (hasDetailedAttrs) {
                modelPrompt += `
- **Height:** ${attrs.estimatedHeightCm || attrs.heightCm || 170} cm (${Math.round((attrs.estimatedHeightCm || attrs.heightCm || 170) / 2.54)} inches) - This MUST be reflected in the model's proportions
- **Weight:** ${attrs.estimatedWeightKg || attrs.weightKg || 65} kg (${Math.round((attrs.estimatedWeightKg || attrs.weightKg || 65) * 2.20462)} lbs) - Body mass and frame size must match
- **Body Type:** ${attrs.bodyType || 'average build'} - Muscle tone, body fat distribution, and frame size must match this exactly
- **Age:** ${attrs.estimatedAge || attrs.age || '25-30'} - All age-appropriate physical characteristics must be consistent
- **Skin Tone:** ${attrs.skinTone || 'as shown in reference'} - Match undertones (warm/cool/neutral) precisely
- **Face Shape:** ${attrs.faceShape || 'as shown in reference'} - Critical for identity recognition
- **Eye Color:** ${attrs.eyeColor || 'as shown in reference'}
- **Eyebrow Shape:** ${attrs.eyebrowShape || 'natural'} - Maintain exact thickness and arch
- **Nose Shape:** ${attrs.noseShape || 'as shown in reference'} - Bridge, tip, and nostril structure
- **Lip Shape:** ${attrs.lipShape || 'as shown in reference'} - Fullness and cupid's bow definition
- **Jawline:** ${attrs.jawlineType || 'as shown in reference'} - Critical for facial structure
- **Cheekbone Structure:** ${attrs.cheekboneStructure || 'as shown in reference'} - Prominence and placement
- **Facial Structure Notes:** ${attrs.facialStructure || 'balanced proportions as shown'}`;
            } else {
                modelPrompt += `
- **Body Type & Proportions:** Analyze the reference image carefully. If full-body is shown, replicate the exact body type, proportions, height, and build. If only face/headshot is shown, generate a realistic, proportionate body that matches the person's apparent age, gender, ethnicity, and facial structure.
- **Physical Consistency:** Ensure all physical attributes (height, weight, muscle tone, frame size) are internally consistent and realistic for this specific person.`;
            }

            if (attrs.hairType || attrs.hairColor) {
                modelPrompt += `
- **Hair (Original):** ${attrs.hairType || 'natural'} hair, ${attrs.hairColor || 'as shown in reference'}`;
            }
            
            modelPrompt += `\n\n**STYLING MODIFICATIONS (Applied AFTER preserving identity):**`;
            
            if (hairStyle.trim()) {
                modelPrompt += `\n- **Hair Styling:** Style the model's hair as: "${hairStyle.trim()}" - MAINTAIN the original hair color, type, and texture. Only change the styling/arrangement.`;
            }
            if (makeupStyle.trim()) {
                modelPrompt += `\n- **Makeup Application:** Apply "${makeupStyle.trim()}" makeup look - DO NOT alter underlying facial features, bone structure, or skin tone. Makeup should enhance, not transform.`;
            }
            if (!hairStyle.trim() && !makeupStyle.trim()) {
                modelPrompt += `\n- Keep the model's natural hair and makeup as shown in the reference image.`;
            }
            
            modelPrompt += `\n\n**VERIFICATION CHECKLIST (MANDATORY BEFORE GENERATION):**
Before finalizing the image, you MUST verify:
1. The face is 100% IDENTICAL to the reference image - every feature matches exactly
2. Someone who knows this person would instantly recognize them - no hesitation, no doubt
3. The face looks like the same person simply changed clothes and pose - nothing else changed
4. All facial features (eyes, nose, lips, jawline, cheekbones) are pixel-perfect matches
5. Skin tone, age markers, and unique identifiers are preserved exactly
6. The face has NOT been enhanced, smoothed, or idealized in any way

If ANY of these checks fail, you MUST regenerate the image with stricter adherence to the reference face.

**REFERENCE IMAGE INTERPRETATION:**
- USE: Face, facial features, skin tone, body type, proportions, physical attributes - ALL MUST BE IDENTICAL
- IGNORE: Clothing, background, lighting, pose, camera angle - THESE CAN CHANGE
- ONLY the person's IDENTITY transfers to the new photoshoot - THE FACE IS ABSOLUTE\n\n`;
        
            textPrompt += modelPrompt;
            const { mimeType, data } = parseDataUrl(uploadedModelImage);
            parts.push({ inlineData: { mimeType, data } });

            // Additional model reference images (do not count toward primary assets for server)
            const refs: string[] = (params as any).uploadedModelRefs || [];
            for (const ref of refs.slice(0, 3)) { // up to 3 extra (total 4)
                try {
                    const r = parseDataUrl(ref);
                    parts.push({ referenceImage: { mimeType: r.mimeType, data: r.data } });
                } catch {}
            }

        } else if (selectedModel) {
            textPrompt += `**1. MODEL IDENTITY & STYLING (Source: Text Description + User Settings)**
- **MISSION:** Generate a model that perfectly and exclusively matches this description: ${selectedModel.description}.\n`;
            if (hairStyle.trim()) textPrompt += `- The model's hair is styled as: "${hairStyle.trim()}".\n`;
            if (makeupStyle.trim()) textPrompt += `- The model's makeup is a "${makeupStyle.trim()}" look.\n`;
            textPrompt += '\n';

        } else if (promptedModelDescription.trim()) {
            textPrompt += `**1. MODEL IDENTITY & STYLING (Source: Text Description + User Settings)**
- **MISSION:** Generate a model that perfectly and exclusively matches this description: ${promptedModelDescription}.\n`;
            if (hairStyle.trim()) textPrompt += `- The model's hair is styled as: "${hairStyle.trim()}".\n`;
            if (makeupStyle.trim()) textPrompt += `- The model's makeup is a "${makeupStyle.trim()}" look.\n`;
            textPrompt += '\n';

        } else {
            throw new Error("No model specified for prompt generation.");
        }
        
        // --- 2. APPAREL & STYLING ---
        const isBackViewShot = shotType.name.toLowerCase().includes('back');
        let apparelText = `**2. APPAREL & STYLING (Source: Subsequent Images + User Settings)**
- **MISSION:** Realistically dress the model with ALL apparel items from the provided images. They must fit naturally, replacing any other clothing.
- **VIEW-SPECIFIC RENDERING (NON-NEGOTIABLE):** The selected shot type is "${shotType.name}". This dictates which side of the apparel to show.\n`;

        if (isBackViewShot) {
            apparelText += `- **MANDATORY INSTRUCTION FOR BACK VIEW:** Because this is a back-view shot, you MUST render the **BACK** of the garments. You will be provided with images of the back view of the garments where available.\n`;
        } else { // Front or 3/4 view
            apparelText += `- **MANDATORY INSTRUCTION FOR FRONT/SIDE VIEW:** Because this is a front-facing or side-view shot, you MUST render the **FRONT** of the garments.\n`;
        }
        
        const apparelPartsToAdd: any[] = [];
        apparel.forEach((item, index) => {
            let imageToUse = item.base64;
            let viewDescriptionForPrompt = "front view";
            if (isBackViewShot && item.backViewBase64) {
                imageToUse = item.backViewBase64;
                viewDescriptionForPrompt = "back view";
            }
            apparelText += `- Apparel Item ${index + 1} (${item.category}): Replicate the **${viewDescriptionForPrompt}** of this item exactly from its image.\n`;
            const { mimeType, data } = parseDataUrl(imageToUse);
            apparelPartsToAdd.push({ inlineData: { mimeType, data } });
        });

        apparelText += `\n- **STYLING DETAILS:**\n`;
        if (garmentStyling.trim()) {
            apparelText += `    - **Garment Styling:** The clothing should be styled as follows: ${garmentStyling.trim()}.\n`;
        }
        if (fabric.id !== 'fab1') {
            apparelText += `    - **Fabric Texture:** The primary garment(s) should have the texture of ${fabric.description}\n`;
        }

        if (apparel.length > 1) {
            const layerDescriptions = apparel.map((item, index) => `Item ${index + 1} (${item.category})`).join(', then ');
            apparelText += `- **LAYERING (CRITICAL):** The items must be worn from innermost to outermost in this exact order: ${layerDescriptions}.\n`;
        }
        
        const hasTop = apparel.some(item => item.category === 'Top' || item.category === 'Outerwear' || item.category === 'Full Body');
        const hasBottom = apparel.some(item => item.category === 'Bottom' || item.category === 'Full Body');

        if (hasTop && !hasBottom) {
            apparelText += `- **OUTFIT COMPLETION (CRITICAL):** The user has only provided a top. To create a complete and realistic outfit, the model MUST also be wearing simple, stylish bottoms (like dark jeans, black trousers, or a neutral skirt) that complement the main apparel. The bottoms should not be the focus of the image.\n`;
        } else if (!hasTop && hasBottom) {
            apparelText += `- **OUTFIT COMPLETION (CRITICAL):** The user has only provided bottoms. To create a complete and realistic outfit, the model MUST also be wearing a simple, stylish top (like a plain white t-shirt or a black tank top) that complements the main apparel. The top should not be the focus of the image.\n`;
        } else {
            apparelText += `- **STRICT ADHERENCE:** Do NOT invent or add any apparel items or accessories not specified.\n`;
        }
        
        textPrompt += apparelText + '\n';
        parts.push(...apparelPartsToAdd);
        
        // --- 3. POSE ---
        textPrompt += `**3. POSE (Source: User Settings)**
- **POSE (Body Language):** The model must be positioned exactly as described: ${shotType.description}.
- **EXPRESSION:** The model's facial expression must be: ${expression.description}.\n\n`;


        // --- 4. SCENE & LIGHTING ---
        const isCustomBackground = scene.background.id === 'custom' && scene.background.type === 'image';
        const backgroundPrompt = isCustomBackground
            ? `in the environment depicted in the FINAL image provided`
            : scene.background.type === 'image'
            ? `in a photorealistic ${scene.background.name}`
            : `against a simple studio background with a ${scene.background.name.toLowerCase()} color.`;

        let lightingPrompt = '';
        if (scene.timeOfDay) {
            const timeOfDayDescriptions = {
                'Sunrise': 'The lighting should evoke early morning sunrise, with soft, warm, low-angle light creating long, gentle shadows.',
                'Midday': 'The lighting should be bright, direct midday sun from high above, creating harsh, defined shadows.',
                'Golden Hour': 'The lighting must be warm, golden hour sunlight from the side, creating a beautiful, soft glow.',
                'Twilight': 'The scene is lit by the cool, soft, ambient light of twilight (blue hour), with very soft or no distinct shadows.',
                'Night': 'The scene is set at night, with dramatic, artificial light sources like streetlights or neon signs, creating high contrast.'
            };
            lightingPrompt = `${timeOfDayDescriptions[scene.timeOfDay]}`;
        } else if (scene.lighting.isDynamic && modelLightingDescription) {
            lightingPrompt = `The lighting must perfectly match the following description, which was analyzed from the original model's photo: "${modelLightingDescription}".`;
        } else {
            lightingPrompt = `Apply ${scene.lighting.description}.`;
        }

        if (lightingDirection.id !== 'ld1') { // Not "As Described"
            lightingPrompt += ` The main light source is positioned ${lightingDirection.description}.`;
        }
        if (lightQuality.id !== 'lq1') { // Not "As Described"
            lightingPrompt += ` The light quality is ${lightQuality.description}.`;
        }
        
        lightingPrompt += ` The final image should feature ${catchlightStyle.description}.`;
        lightingPrompt += ' The model, apparel, and background must all be lit from the same light source and direction to create a cohesive and realistic photograph.';

        textPrompt += `**4. SCENE & LIGHTING (Source: User Settings)**
- **BACKGROUND:** The scene is set ${backgroundPrompt}.
- **LIGHTING (CRITICAL):** ${lightingPrompt}
`;
        if(scene.sceneProps.trim()){
            textPrompt += `- **PROPS:** The scene must include: ${scene.sceneProps.trim()}.\n`;
        }
        if(scene.environmentalEffects.trim()){
            textPrompt += `- **EFFECTS:** The scene should have these atmospheric effects: ${scene.environmentalEffects.trim()}.\n`;
        }
        textPrompt += '\n';

        // --- 5. CAMERA & LENS ---
        textPrompt += `**5. CAMERA & LENS (Source: User Settings)**
- **CAMERA ANGLE:** ${cameraAngle.description}.
- **APERTURE:** ${aperture.description}.
- **FOCAL LENGTH:** ${focalLength.description}.\n\n`;

        // --- 6. FINAL IMAGE STYLE & QUALITY ---
        textPrompt += `**6. FINAL IMAGE STYLE & QUALITY (Source: User Settings)**

**🚨 FINAL REMINDER - FACIAL IDENTITY IS ABSOLUTE 🚨**
Before generating the final image, verify one last time: The face must be 100% IDENTICAL to the reference image. Every feature, every proportion, every detail must match exactly. This is not a suggestion - it is the PRIMARY requirement. If the face is not identical, the entire image is a failure.

- **ASPECT RATIO (CRITICAL):** The final image output MUST have an aspect ratio of exactly ${aspectRatio}.
- **QUALITY:** This is a professional photoshoot. The final output must be an ultra-high-quality, hyperrealistic, and tack-sharp photograph, indistinguishable from a real photo. Emulate a high-end DSLR camera (e.g., Canon EOS R5) with a professional prime lens. Pay extreme attention to detail, especially in fabric texture, lighting, shadows, and skin detail.
- **FACIAL ACCURACY CHECK:** The face in the generated image must be instantly recognizable as the EXACT SAME PERSON from the reference image. If someone who knows this person would not immediately recognize them, you have failed.
`;
       if (styleDescription) {
            textPrompt += `- **STYLISTIC GOAL:** The final image must match the artistic style described as: "${styleDescription}". Apply this style with an influence of approximately ${styleStrength}%. A value of 100% is a perfect match, 50% is a subtle blend.\n`;
       }
       if (colorGrade.id !== 'cg_none') {
            textPrompt += `- **COLOR GRADE:** Apply a professional color grade with the following style: ${colorGrade.description}\n`;
       }
       if (cinematicLook) {
            textPrompt += `
**CINEMATIC LOOK (ENABLED):**
- The image must have a cinematic quality, emulating a still from a high-budget film.
- Use properties associated with anamorphic lenses, such as subtle lens flares and a slightly wider feel.
- Apply a professional, non-destructive color grade (e.g., teal and orange, or a muted filmic look).
- Add a fine, realistic film grain to the entire image.
`;
        }

        if (isHyperRealismEnabled) {
            textPrompt += `
**HYPER-REALISM MODE (ENABLED):**
- Pay extreme attention to micro-details like skin pores, fabric weave, and subtle light reflections.
- Ensure all human anatomy, especially hands and fingers, is rendered with 100% accuracy.
- This is for a luxury brand photoshoot; the final image must be indistinguishable from a high-end DSLR photograph.
`;
        }

        if (animation) {
            textPrompt += `
**ANIMATION:**
- The model is ${animation.description}.`
        }

        // Add the compiled text prompt as the very first part
        parts.unshift({ text: textPrompt });
        
        // Add custom background as the VERY LAST part
        if (isCustomBackground) {
             const { mimeType, data } = parseDataUrl(scene.background.value);
             parts.push({ inlineData: { mimeType, data } });
        }

        // Add settings as a separate part for apparel mode (for server-side AI processing)
        if (params.studioMode === 'apparel') {
            parts.push({ 
                settings: {
                    shotType: apparelControls.shotType,
                    cameraAngle: apparelControls.cameraAngle,
                    focalLength: apparelControls.focalLength,
                    aperture: apparelControls.aperture,
                    lighting: scene.lighting,
                    lightingDirection: apparelControls.lightingDirection,
                    lightQuality: apparelControls.lightQuality,
                    catchlightStyle: apparelControls.catchlightStyle,
                    background: scene.background,
                    sceneProps: scene.sceneProps,
                    environmentalEffects: scene.environmentalEffects,
                    expression: apparelControls.expression,
                    hairStyle: apparelControls.hairStyle,
                    makeupStyle: apparelControls.makeupStyle,
                    colorGrade: apparelControls.colorGrade,
                    isHyperRealismEnabled: apparelControls.isHyperRealismEnabled,
                    cinematicLook: apparelControls.cinematicLook,
                    fabric: apparelControls.fabric,
                    garmentStyling: apparelControls.garmentStyling,
                    customPrompt: apparelControls.customPrompt,
                    negativePrompt: apparelControls.negativePrompt
                }
            });

            // Identity attributes as structured data for server-side prompt
            const ia = (params as any).modelAttributes || null;
            if (ia) {
                parts.push({ identityAttributes: ia });
            }
        }

        return { parts };
    }
};
