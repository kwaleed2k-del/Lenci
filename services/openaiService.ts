import OpenAI from 'openai';

// Initialize OpenAI client (will be set in server middleware)
let openaiClient: OpenAI | null = null;

export const initOpenAI = (apiKey: string) => {
  openaiClient = new OpenAI({ apiKey });
};

/**
 * Generate an image using DALL-E 3
 * @param prompt - Text description of the image to generate
 * @param size - Image size (1024x1024, 1024x1792, 1792x1024)
 * @param quality - Image quality (standard or hd)
 * @returns Base64 encoded image
 */
export async function generateWithDALLE3(
  prompt: string,
  size: '1024x1024' | '1024x1792' | '1792x1024' = '1024x1024',
  quality: 'standard' | 'hd' = 'hd'
): Promise<string> {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const response = await openaiClient.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: size,
      quality: quality,
      response_format: 'b64_json',
    });

    const imageB64 = response.data[0].b64_json;
    if (!imageB64) {
      throw new Error('No image data received from DALL-E 3');
    }

    return `data:image/png;base64,${imageB64}`;
  } catch (error: any) {
    console.error('DALL-E 3 generation error:', error);
    throw new Error(`DALL-E 3 generation failed: ${error.message}`);
  }
}

/**
 * Edit an image using DALL-E 2 (for inpainting/editing)
 * Note: DALL-E 3 doesn't support editing, so we use DALL-E 2 for this
 */
export async function editWithDALLE(
  imageB64: string,
  maskB64: string,
  prompt: string,
  size: '256x256' | '512x512' | '1024x1024' = '1024x1024'
): Promise<string> {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    // Convert base64 to File objects
    const imageBuffer = Buffer.from(imageB64.split(',')[1], 'base64');
    const maskBuffer = Buffer.from(maskB64.split(',')[1], 'base64');

    const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });
    const maskFile = new File([maskBuffer], 'mask.png', { type: 'image/png' });

    const response = await openaiClient.images.edit({
      image: imageFile,
      mask: maskFile,
      prompt: prompt,
      n: 1,
      size: size,
      response_format: 'b64_json',
    });

    const editedImageB64 = response.data[0].b64_json;
    if (!editedImageB64) {
      throw new Error('No image data received from DALL-E edit');
    }

    return `data:image/png;base64,${editedImageB64}`;
  } catch (error: any) {
    console.error('DALL-E edit error:', error);
    throw new Error(`DALL-E edit failed: ${error.message}`);
  }
}

export const openaiService = {
  generateWithDALLE3,
  editWithDALLE,
};

