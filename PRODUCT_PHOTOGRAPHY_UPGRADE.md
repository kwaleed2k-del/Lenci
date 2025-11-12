# 🎯 Product Photography Complete Solution - Implementation Plan

## Issues to Fix

### 1. ❌ Multiple Images Not Working
**Problem**: When selecting 2, 3, or 4 images, only 1 is generated.
**Root Cause**: The generation logic is correct (`state.numberOfImages`), but might be a UI state issue.
**Fix**: Ensure `numberOfImages` state is properly set when clicking the buttons.

### 2. ❌ Settings/Prompts Not Applied
**Problem**: Custom prompts and settings don't affect the output.
**Root Cause**: The `extraPrompt` and `customPrompt` fields aren't being passed to the AI.
**Fix**: Update prompt generation to include all custom fields.

### 3. ❌ Missing Lifestyle Shot Options
**Problem**: No way to specify product usage (hand-held, worn, in-use).
**Fix**: Add lifestyle shot selector with presets.

## New Features Implemented

### ✅ 1. Lifestyle Shot Library
Created `constants/productLifestyle.ts` with 30+ preset scenarios:

**Wearable Products:**
- Watch on Wrist
- Necklace on Neck
- Bracelet, Ring, Earrings
- Sunglasses, Hats

**Hand-Held Products:**
- Phone in Hand
- Bottle, Perfume, Cosmetics
- Books, Mugs, Bags

**In-Use Scenarios:**
- Laptop in Use
- Headphones, Camera
- Watch Check Time

**Lifestyle Settings:**
- Coffee Shop, Office Desk
- Outdoor Nature, Beach
- Luxury Setting, Gym

**Flat Lay:**
- Minimal, Styled, Luxury

### ✅ 2. Gender Selection
- Male, Female, Neutral options
- Applied to lifestyle shots that need human models/hands

### ✅ 3. Product Context Library
Predefined contexts for better prompts:
- Airport, Hotel, Restaurant
- Car Interior, Home, Garden
- City Street, Rooftop, Studio

### ✅ 4. Extra Prompt Field
Dedicated field for custom instructions that WILL be applied.

## Implementation Status

### Completed:
- ✅ Created lifestyle shot constants
- ✅ Updated ProductState with new fields
- ✅ Added actions to productStore

### Remaining Tasks:

#### 1. Update Prompt Service
File: `services/promptService.ts`

Add to product prompt generation:
```typescript
// Include lifestyle shot
if (state.lifestyleShot) {
    let lifestylePrompt = state.lifestyleShot.prompt;
    if (state.lifestyleShot.requiresGender) {
        lifestylePrompt = lifestylePrompt.replace('[GENDER]', state.lifestyleGender);
    }
    prompt += lifestylePrompt + '. ';
}

// Include product context
if (state.productContext) {
    const context = PRODUCT_CONTEXTS.find(c => c.id === state.productContext);
    if (context) {
        prompt += context.prompt + '. ';
    }
}

// Include extra prompt (CRITICAL - this was missing!)
if (state.extraPrompt && state.extraPrompt.trim()) {
    prompt += state.extraPrompt.trim() + '. ';
}

// Include custom prompt from controls
if (state.productControls.customPrompt && state.productControls.customPrompt.trim()) {
    prompt += state.productControls.customPrompt.trim() + '. ';
}
```

#### 2. Create Lifestyle Shot Selector UI
File: `components/product/ProductLifestylePanel.tsx` (NEW)

Features:
- Category tabs (Wearable, Hand-Held, In-Use, Lifestyle, Flat-Lay)
- Shot cards with preview icons
- Gender selector (shows only when needed)
- Context dropdown
- Extra prompt textarea

#### 3. Create Extra Prompt Component
File: `components/product/ProductExtraPrompt.tsx` (NEW)

Features:
- Large textarea for custom instructions
- Character counter
- Example prompts
- Clear button

#### 4. Update ProductControlPanel
File: `components/product/ProductControlPanel.tsx`

Add new sections:
```tsx
<SettingSection title="Lifestyle Shot" icon={<Camera />}>
    <ProductLifestylePanel />
</SettingSection>

<SettingSection title="Extra Instructions" icon={<MessageSquare />}>
    <ProductExtraPrompt />
</SettingSection>
```

#### 5. Fix Number of Images
File: `context/sharedStore.ts`

Verify the logic at line 483:
```typescript
const totalGenerations = isPackMode 
    ? PRODUCT_ECOMMERCE_PACKS[productEcommercePack].shots.length 
    : state.numberOfImages;  // This should work!
```

Check if `numberOfImages` is being set correctly when buttons are clicked.

#### 6. Update Server Prompt Generation
File: `server/geminiRoutes.ts`

Ensure all new fields are included in the prompt sent to Gemini:
- `lifestyleShot`
- `lifestyleGender`
- `productContext`
- `extraPrompt`

## UI Design

### Product Control Panel Layout:
```
┌─────────────────────────────────┐
│ 📸 Lifestyle Shot               │
│ ┌─────────────────────────────┐ │
│ │ [Wearable] [Hand-Held] ...  │ │
│ │                             │ │
│ │ ○ Watch on Wrist            │ │
│ │ ○ Necklace on Neck          │ │
│ │ ○ Phone in Hand             │ │
│ │                             │ │
│ │ Gender: [Male][Female][Neu] │ │
│ │ Context: [Airport ▼]        │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ✏️  Extra Instructions          │
│ ┌─────────────────────────────┐ │
│ │ Describe exactly what you   │ │
│ │ want...                     │ │
│ │                             │ │
│ │ Example: "Product at        │ │
│ │ airport, luggage visible in │ │
│ │ background"                 │ │
│ └─────────────────────────────┘ │
│ 250 characters                  │
└─────────────────────────────────┘
```

## Example Workflows

### Workflow 1: Watch Product
1. Upload watch image
2. Select "Watch on Wrist" lifestyle shot
3. Choose "Female" gender
4. Set number of images: 4
5. Add extra prompt: "Elegant business setting, natural daylight"
6. Generate → Get 4 different professional shots

### Workflow 2: Bag at Airport
1. Upload bag image
2. Select "Bag in Hand" lifestyle shot
3. Choose "Female" gender
4. Select "Airport" context
5. Set number of images: 3
6. Add extra prompt: "Modern airport terminal, traveler aesthetic"
7. Generate → Get 3 airport lifestyle shots

### Workflow 3: Perfume Bottle
1. Upload perfume image
2. Select "Perfume in Hand" lifestyle shot
3. Choose "Female" gender
4. Select "Luxury Setting" context
5. Set number of images: 2
6. Add extra prompt: "Soft pink background, elegant lighting"
7. Generate → Get 2 luxury perfume shots

## Priority Implementation Order

1. **HIGH PRIORITY** - Fix Extra Prompt Integration
   - Update promptService.ts to include extraPrompt
   - This fixes the "settings don't work" issue

2. **HIGH PRIORITY** - Fix Multiple Images
   - Debug numberOfImages state
   - Ensure UI buttons update state correctly

3. **MEDIUM PRIORITY** - Add Lifestyle Shot UI
   - Create ProductLifestylePanel component
   - Add to ProductControlPanel

4. **MEDIUM PRIORITY** - Add Extra Prompt UI
   - Create ProductExtraPrompt component
   - Add to ProductControlPanel

5. **LOW PRIORITY** - Polish & Testing
   - Add examples and tooltips
   - Test all combinations

## Expected Results

After implementation:
- ✅ Multiple images work (2, 3, 4 images generated)
- ✅ Custom prompts are applied
- ✅ Lifestyle shots available (30+ presets)
- ✅ Gender selection for human-involved shots
- ✅ Product context selection
- ✅ Professional, varied product photography
- ✅ Complete solution for e-commerce needs

## Next Steps

Would you like me to:
1. **Implement the critical fixes first** (extra prompt + multiple images)?
2. **Create the full lifestyle UI** (all components)?
3. **Do both in sequence**?

Let me know and I'll proceed!

