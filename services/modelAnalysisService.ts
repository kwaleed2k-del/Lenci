import { GoogleGenAI } from "@google/genai";

/**
 * Service to analyze uploaded model images and extract physical attributes
 * for better AI generation accuracy
 */

interface ModelPhysicalAttributes {
    estimatedAge: string;
    hairType: string;
    hairColor: string;
    skinTone: string;
    bodyType: string;
    estimatedHeightCm: number;
    estimatedWeightKg: number;
    facialStructure: string;
    faceShape: string;
    eyeColor: string;
    eyebrowShape: string;
    noseShape: string;
    lipShape: string;
    jawlineType: string;
    cheekboneStructure: string;
    gender: 'male' | 'female' | 'unspecified';
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const modelAnalysisService = {
    /**
     * Analyzes a model image and extracts detailed physical attributes
     */
    async analyzeModelPhysicalAttributes(imageBase64: string): Promise<ModelPhysicalAttributes> {
        if (!ai) {
            console.warn('⚠️ GEMINI_API_KEY not configured, skipping model analysis');
            // Return fallback attributes silently
            return {
                estimatedAge: '25-30',
                hairType: 'straight',
                hairColor: 'dark brown',
                skinTone: 'medium',
                bodyType: 'average',
                estimatedHeightCm: 170,
                estimatedWeightKg: 65,
                facialStructure: 'balanced proportions',
                faceShape: 'oval',
                eyeColor: 'brown',
                eyebrowShape: 'natural',
                noseShape: 'straight',
                lipShape: 'medium',
                jawlineType: 'defined',
                cheekboneStructure: 'medium',
                gender: 'unspecified'
            };
        }

        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const match = imageBase64.match(/^data:(.*?);base64,(.*)$/);
        if (!match) throw new Error('Invalid base64 image');
        const [, mimeType, data] = match;

        const prompt = `You are a professional model agency analyst. Analyze this person's physical attributes with extreme precision for casting and photoshoot purposes.

**CRITICAL INSTRUCTIONS:**
1. Provide EXACT measurements and descriptions
2. Be highly specific about facial features - this is crucial for identity preservation
3. Estimate height and weight based on body proportions, visible frame, and musculature

**REQUIRED ANALYSIS (respond in valid JSON format ONLY):**

{
  "estimatedAge": "<specific age range, e.g., '25-28'>",
  "hairType": "<straight/wavy/curly/coily/kinky>",
  "hairColor": "<specific color, e.g., 'dark brown', 'blonde', 'black with highlights'>",
  "skinTone": "<specific description, e.g., 'light olive', 'deep brown', 'fair with warm undertones'>",
  "bodyType": "<skinny/slim/average/athletic/muscular/curvy/plus-size> with specific build description",
  "estimatedHeightCm": <number between 150-200>,
  "estimatedWeightKg": <number between 40-120>,
  "facialStructure": "<detailed description of overall facial structure and proportions>",
  "faceShape": "<oval/round/square/heart/diamond/oblong>",
  "eyeColor": "<specific color>",
  "eyebrowShape": "<arched/straight/angular/curved/thick/thin>",
  "noseShape": "<button/straight/Roman/snub/hawk/broad/narrow>",
  "lipShape": "<full/thin/wide/heart-shaped/bow-shaped>",
  "jawlineType": "<strong/soft/angular/rounded/defined>",
  "cheekboneStructure": "<high/prominent/soft/flat/angular>",
  "gender": "<male/female/unspecified>"
}

**HEIGHT ESTIMATION GUIDE:**
- Look at head-to-body ratio (average is 7.5-8 heads tall)
- Assess leg length, torso length, shoulder width
- Consider frame size (small/medium/large)
- Male average: 175cm (5'9"), Female average: 162cm (5'4")
- Adjust based on visible proportions

**WEIGHT ESTIMATION GUIDE:**
- Assess muscle mass, body fat percentage, frame size
- Consider shoulder width, hip width, limb thickness
- Male average: 75kg (165 lbs), Female average: 62kg (137 lbs)
- Adjust for visible build (lean/muscular/average/heavy)

**RESPOND ONLY WITH VALID JSON. NO OTHER TEXT.**`;

        try {
            const result = await model.generateContent([
                { text: prompt },
                {
                    inlineData: {
                        mimeType,
                        data
                    }
                }
            ]);

            const response = result.response;
            const text = response.text();
            
            // Extract JSON from response (in case there's extra text)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to extract JSON from response');
            }

            const attributes: ModelPhysicalAttributes = JSON.parse(jsonMatch[0]);
            
            console.log('📊 Model Analysis Complete:', attributes);
            return attributes;

        } catch (error) {
            console.error('❌ Model analysis failed:', error);
            // Return default attributes as fallback
            return {
                estimatedAge: '25-30',
                hairType: 'straight',
                hairColor: 'dark brown',
                skinTone: 'medium',
                bodyType: 'average',
                estimatedHeightCm: 170,
                estimatedWeightKg: 65,
                facialStructure: 'balanced proportions',
                faceShape: 'oval',
                eyeColor: 'brown',
                eyebrowShape: 'natural',
                noseShape: 'straight',
                lipShape: 'medium',
                jawlineType: 'defined',
                cheekboneStructure: 'medium',
                gender: 'unspecified'
            };
        }
    }
};

