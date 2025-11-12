import type { ProductCreativeControls, ProductEcommercePack, ProductSceneTemplate, StagedAsset, ProductArtDirectorSuggestion } from '../types';
import { APERTURES_LIBRARY, CAMERA_ANGLES_LIBRARY_PRODUCT, COLOR_GRADING_PRESETS, FOCAL_LENGTHS_LIBRARY, LIGHTING_DIRECTIONS_LIBRARY, LIGHT_QUALITIES_LIBRARY, CATCHLIGHT_STYLES_LIBRARY, SURFACE_LIBRARY, PRODUCT_MATERIAL_LIBRARY, THEMED_SCENE_TEMPLATES, LIGHTING_PRESETS_PRODUCT, BACKGROUNDS_LIBRARY } from '../constants';
import { geminiService } from '../services/geminiService';
import type { StudioStoreSlice } from './StudioContext';
import { getDominantColor } from '../utils/colorExtractor';
import { getComplementaryColor } from '../utils/colorUtils';

export interface ProductState {
  productImage: string | null;
  productImageCutout: string | null;
  isRemovingBackground: boolean;
  isCutout: boolean;
  productControls: ProductCreativeControls;
  isSuggestingProps: boolean;
  propSuggestions: string[];
  stagedAssets: StagedAsset[];
  suggestedBackgroundColor: string | null;
  sceneTemplates: ProductSceneTemplate[];
  productEcommercePack: ProductEcommercePack;
  productArtDirectorSuggestions: ProductArtDirectorSuggestion[] | null;
  isFetchingProductSuggestion: boolean;
  appliedProductSuggestionId: string | null;
  preProductConceptState: {
    productControls: ProductCreativeControls;
    scene: { lighting: any; background: any };
  } | null;
}

export interface ProductActions {
  setProductImage: (base64: string | null) => void;
  performBackgroundRemoval: () => Promise<void>;
  setUseCutout: (useCutout: boolean) => void;
  updateProductControl: <K extends keyof ProductCreativeControls>(key: K, value: ProductCreativeControls[K]) => void;
  fetchPropSuggestions: () => Promise<void>;
  addCompanionAsset: (base64: string) => void;
  removeCompanionAsset: (id: string) => void;
  updateStagedAsset: (id: string, partialAsset: Partial<StagedAsset>) => void;
  saveSceneTemplate: (name: string) => void;
  applySceneTemplate: (id: string) => void;
  deleteSceneTemplate: (id: string) => void;
  setProductEcommercePack: (pack: ProductEcommercePack) => void;
  applyProductArtDirectorSuggestion: (suggestion: ProductArtDirectorSuggestion) => void;
  removeProductArtDirectorSuggestion: () => void;
}

export type ProductSlice = ProductState & ProductActions;

const baseControls = {
    aperture: APERTURES_LIBRARY[0],
    focalLength: FOCAL_LENGTHS_LIBRARY[1],
    lightingDirection: LIGHTING_DIRECTIONS_LIBRARY[0],
    lightQuality: LIGHT_QUALITIES_LIBRARY[0],
    catchlightStyle: CATCHLIGHT_STYLES_LIBRARY[0],
    colorGrade: COLOR_GRADING_PRESETS[0],
    negativePrompt: 'deformed, disfigured, poor quality, bad anatomy, extra limbs, blurry, text, watermark, logo',
    isHyperRealismEnabled: true,
    cinematicLook: false,
    styleStrength: 75,
    customPrompt: '',
};

const initialProductState: ProductState = {
  productImage: null,
  productImageCutout: null,
  isRemovingBackground: false,
  isCutout: true,
  productControls: {
    ...baseControls,
    cameraAngle: CAMERA_ANGLES_LIBRARY_PRODUCT[0],
    productShadow: 'Soft',
    customProps: '',
    surface: SURFACE_LIBRARY[0],
    productMaterial: PRODUCT_MATERIAL_LIBRARY[0],
  },
  isSuggestingProps: false,
  propSuggestions: [],
  stagedAssets: [],
  suggestedBackgroundColor: null,
  sceneTemplates: [],
  productEcommercePack: 'none',
  productArtDirectorSuggestions: null,
  isFetchingProductSuggestion: false,
  appliedProductSuggestionId: null,
  preProductConceptState: null,
};

export const createProductSlice: StudioStoreSlice<ProductSlice> = (set, get) => ({
  ...initialProductState,

  setProductImage: async (base64) => {
    set({ 
        productImage: base64, 
        productImageCutout: null, 
        error: null,
        propSuggestions: [],
        stagedAssets: [],
        suggestedBackgroundColor: null,
    });
    if (base64) {
        set({
            uploadedModelImage: null,
            selectedModels: [],
            promptedModelDescription: '',
            apparel: [],
            artDirectorSuggestions: null,
            mockupImage: null,
            designImage: null,
        });
        
        get().performBackgroundRemoval();
        
        // Fetch AI Art Director suggestions for product
        set({ isFetchingProductSuggestion: true });
        try {
            const suggestions = await geminiService.getProductArtDirectorSuggestions(base64);
            set({ productArtDirectorSuggestions: suggestions });
        } catch (e) {
            console.error("Failed to fetch product art director suggestions:", e);
        } finally {
            set({ isFetchingProductSuggestion: false });
        }
        
        try {
            const dominantColor = await getDominantColor(base64);
            const complementary = getComplementaryColor(dominantColor);
            set({ suggestedBackgroundColor: complementary });
        } catch(e) {
            console.error("Could not suggest background color:", e);
        }

    }
  },

  performBackgroundRemoval: async () => {
      const { productImage } = get();
      if (!productImage) return;

      set({ isRemovingBackground: true, isCutout: false, stagedAssets: [] });
      try {
          const cutoutB64 = await geminiService.removeBackground(productImage);
          const initialAsset: StagedAsset = { id: 'product', base64: cutoutB64, x: 50, y: 50, z: 1, scale: 50 };
          set({ productImageCutout: cutoutB64, isCutout: true, stagedAssets: [initialAsset] });
      } catch (e) {
          console.error("Failed to remove background:", e);
          const initialAsset: StagedAsset = { id: 'product', base64: productImage, x: 50, y: 50, z: 1, scale: 50 };
          set({ isCutout: false, stagedAssets: [initialAsset] }); // Fallback to using original
      } finally {
          set({ isRemovingBackground: false });
      }
  },

  setUseCutout: (useCutout) => {
      const { productImage, productImageCutout, stagedAssets } = get();
      const imageToUse = useCutout ? productImageCutout : productImage;
      if (!imageToUse) return;

      const productAsset = stagedAssets.find(a => a.id === 'product');
      if (productAsset) {
          get().updateStagedAsset('product', { base64: imageToUse });
      }
      set({ isCutout: useCutout });
  },

  updateProductControl: (key, value) => {
      set(state => ({ productControls: { ...state.productControls, [key]: value } }));
  },

  fetchPropSuggestions: async () => {
      const { isCutout, productImage, productImageCutout } = get();
      const imageToAnalyze = isCutout ? productImageCutout : productImage;

      if (!imageToAnalyze) {
          set({ error: "Upload a product image to get suggestions." });
          return;
      }

      set({ isSuggestingProps: true, error: null, propSuggestions: [] });
      try {
          const suggestions = await geminiService.getPropSuggestions(imageToAnalyze);
          set({ propSuggestions: suggestions });
      } catch (e) {
          console.error("Failed to fetch prop suggestions:", e);
          set({ error: "Could not get AI prop suggestions." });
      } finally {
          set({ isSuggestingProps: false });
      }
  },
  
  addCompanionAsset: (base64) => {
    const newId = `companion_${Date.now()}`;
    const newAsset: StagedAsset = { id: newId, base64, x: 25, y: 25, z: 0, scale: 30 };
    set(state => ({ stagedAssets: [...state.stagedAssets, newAsset] }));
  },
  
  removeCompanionAsset: (id) => set(state => ({ stagedAssets: state.stagedAssets.filter(asset => asset.id !== id) })),
  
  updateStagedAsset: (id, partialAsset) => {
    set(state => ({
        stagedAssets: state.stagedAssets.map(asset => 
            asset.id === id ? { ...asset, ...partialAsset } : asset
        )
    }));
  },

  saveSceneTemplate: (name) => {
    if (!name.trim()) return;
    const { scene, productControls, stagedAssets } = get();
    const newTemplate: ProductSceneTemplate = {
      id: `template_${Date.now()}`,
      name: name.trim(),
      description: 'A custom saved scene template',
      scene: { ...scene },
      controls: { ...productControls },
      stagedAssets: [...stagedAssets],
    };
    set(state => ({
      sceneTemplates: [...state.sceneTemplates, newTemplate]
    }));
  },

  applySceneTemplate: (id) => {
    const template = get().sceneTemplates.find(t => t.id === id) || THEMED_SCENE_TEMPLATES.find(t => t.id === id);
    if (template) {
      get().updateScene(template.scene);
      set(state => ({
        productControls: { ...state.productControls, ...template.controls },
        stagedAssets: template.stagedAssets || state.stagedAssets,
      }));
    }
  },

  deleteSceneTemplate: (id) => {
    set(state => ({
      sceneTemplates: state.sceneTemplates.filter(t => t.id !== id)
    }));
  },

  setProductEcommercePack: (pack) => set({ productEcommercePack: pack }),

  applyProductArtDirectorSuggestion: (suggestion) => {
    if (get().appliedProductSuggestionId === null) {
        set(state => ({
            preProductConceptState: {
                productControls: state.productControls,
                scene: state.scene,
            }
        }));
    }
    
    if (!suggestion) return;
    
    const suggestedCameraAngle = CAMERA_ANGLES_LIBRARY_PRODUCT.find(c => c.id === suggestion.cameraAngleId);
    const suggestedLighting = LIGHTING_PRESETS_PRODUCT.find(l => l.id === suggestion.lightingId);
    const suggestedBackground = BACKGROUNDS_LIBRARY.find(b => b.id === suggestion.backgroundId);
    const suggestedSurface = SURFACE_LIBRARY.find(s => s.id === suggestion.surfaceId);
    const suggestedAperture = APERTURES_LIBRARY.find(a => a.id === suggestion.apertureId);
    const suggestedFocalLength = FOCAL_LENGTHS_LIBRARY.find(f => f.id === suggestion.focalLengthId);
    const suggestedColorGrade = COLOR_GRADING_PRESETS.find(c => c.id === suggestion.colorGradeId);
    
    if (suggestedLighting) get().updateScene({ lighting: suggestedLighting });
    if (suggestedBackground) get().updateScene({ background: suggestedBackground });
    
    if (suggestedCameraAngle) get().updateProductControl('cameraAngle', suggestedCameraAngle);
    if (suggestedSurface) get().updateProductControl('surface', suggestedSurface);
    if (suggestedAperture) get().updateProductControl('aperture', suggestedAperture);
    if (suggestedFocalLength) get().updateProductControl('focalLength', suggestedFocalLength);
    if (suggestedColorGrade) get().updateProductControl('colorGrade', suggestedColorGrade);

    set({ appliedProductSuggestionId: suggestion.id });
  },

  removeProductArtDirectorSuggestion: () => {
    const preState = get().preProductConceptState;
    if (preState) {
        get().updateScene(preState.scene);
        set({
            productControls: preState.productControls,
            appliedProductSuggestionId: null,
            preProductConceptState: null,
        });
    } else {
        set({ appliedProductSuggestionId: null });
    }
  },
});