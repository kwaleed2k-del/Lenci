/**
 * AI Provider Service
 * Manages switching between different AI providers (Gemini, OpenAI DALL-E 3, etc.)
 */

export type AIProvider = 'gemini' | 'dall-e-3';

// Default provider (can be changed by user)
let currentProvider: AIProvider = 'gemini'; // Using Gemini as default (more reliable)

export const aiProviderService = {
    /**
     * Get the current AI provider
     */
    getCurrentProvider(): AIProvider {
        return currentProvider;
    },

    /**
     * Set the AI provider
     */
    setProvider(provider: AIProvider) {
        currentProvider = provider;
        console.log(`🔄 AI Provider switched to: ${provider}`);
    },

    /**
     * Generate an image using the current provider
     */
    async generateImage(
        prompt: string,
        aspectRatio: string,
        quality?: 'standard' | 'hd'
    ): Promise<{ image: string; model: string; revised_prompt?: string }> {
        if (currentProvider === 'dall-e-3') {
            return this.generateWithDALLE(prompt, aspectRatio, quality);
        } else {
            return this.generateWithGemini(prompt, aspectRatio);
        }
    },

    /**
     * Generate with DALL-E 3
     */
    async generateWithDALLE(
        prompt: string,
        aspectRatio: string,
        quality: 'standard' | 'hd' = 'hd'
    ): Promise<{ image: string; model: string; revised_prompt?: string }> {
        console.log('🎨 Using DALL-E 3 for generation...');
        
        const response = await fetch('/api/openai/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt, 
                aspectRatio, 
                quality 
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ DALL-E 3 generation failed:', errorText);
            throw new Error(`DALL-E 3 generation failed: ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ DALL-E 3 generated image successfully');
        
        return {
            image: data.image,
            model: 'dall-e-3',
            revised_prompt: data.revised_prompt
        };
    },

    /**
     * Generate with Gemini (fallback)
     */
    async generateWithGemini(
        prompt: string,
        aspectRatio: string
    ): Promise<{ image: string; model: string }> {
        console.log('🎨 Using Gemini for generation...');
        
        // This would call your existing Gemini endpoint
        // For now, return a placeholder
        throw new Error('Gemini generation not implemented in this flow. Use professional imaging service.');
    },

    /**
     * Check which providers are available
     */
    async checkAvailableProviders(): Promise<{ gemini: boolean; openai: boolean }> {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            return {
                gemini: data.ai || false,
                openai: data.openai || false
            };
        } catch (error) {
            console.error('Failed to check providers:', error);
            return { gemini: false, openai: false };
        }
    }
};

