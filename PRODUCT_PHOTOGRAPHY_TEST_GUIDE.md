# 🧪 Product Photography - Testing Guide

## ✅ What's Been Implemented

### 1. Lifestyle Photography Panel
- **Location**: Product Control Panel → "Lifestyle Photography" section
- **Features**:
  - 30+ professional lifestyle presets
  - 5 categories: Wearable, Hand-Held, In-Use, Lifestyle, Flat-Lay
  - Gender selection (Male/Female/Neutral) for shots with human models
  - Product context selection (Airport, Hotel, Restaurant, etc.)
  - Visual preset selector with descriptions

### 2. Extra Instructions Field
- **Location**: Product Control Panel → "Extra Instructions" section
- **Features**:
  - 500-character textarea for custom instructions
  - Character counter
  - Clear button
  - Visual confirmation when active

### 3. Prompt Integration
- All lifestyle settings are now integrated into the AI prompt
- Extra instructions are applied with "CRITICAL" priority
- Custom prompts from controls are also included

---

## 🧪 Test Cases

### Test 1: Multiple Images Generation (CRITICAL)

**Purpose**: Verify that selecting 2, 3, or 4 images actually generates that many images.

**Steps**:
1. Go to Product mode
2. Upload a product image (any product)
3. In the Settings panel (right side), find "Number of Images"
4. Click **"2"** button
5. Click **Generate**
6. **Expected Result**: 2 images should be generated and displayed

**Repeat for**:
- 3 images
- 4 images

**Current Status**: The logic is correct in the code (line 483 in `sharedStore.ts`):
```typescript
const totalGenerations = isPackMode 
    ? PRODUCT_ECOMMERCE_PACKS[productEcommercePack].shots.length 
    : state.numberOfImages;  // ✅ This uses the numberOfImages state
```

**If it doesn't work**: The issue might be:
- UI state not updating when clicking buttons
- Check browser console for errors
- Verify the `numberOfImages` state is being set

---

### Test 2: Extra Instructions

**Purpose**: Verify custom instructions are applied to the generation.

**Steps**:
1. Upload a product (e.g., a bag)
2. In "Extra Instructions", type:
   ```
   Product at modern airport terminal, luggage and travelers visible in background, natural daylight
   ```
3. Click Generate
4. **Expected Result**: Generated image should show the product at an airport with luggage/travelers in the background

**Variations to test**:
- "Held by elegant female hand with red nail polish"
- "On marble table in luxury hotel lobby"
- "Beach setting with sand and ocean in background"

---

### Test 3: Lifestyle Shot Presets

**Purpose**: Verify lifestyle presets work correctly.

**Test 3a: Wearable Product (Watch)**
1. Upload a watch image
2. Go to "Lifestyle Photography" section
3. Select category: **Wearable**
4. Click on **"Watch on Wrist"** preset
5. Select Gender: **Female**
6. Set Number of Images: **2**
7. Click Generate
8. **Expected Result**: 2 images of the watch worn on a female wrist

**Test 3b: Hand-Held Product (Bottle)**
1. Upload a bottle/perfume image
2. Select category: **Hand-Held**
3. Click on **"Bottle in Hand"** preset
4. Select Gender: **Female**
5. Click Generate
6. **Expected Result**: Image of bottle held in a female hand

**Test 3c: Lifestyle Setting**
1. Upload any product
2. Select category: **Lifestyle**
3. Click on **"Coffee Shop Setting"** preset
4. Click Generate
5. **Expected Result**: Product photographed in a coffee shop environment

---

### Test 4: Product Context

**Purpose**: Verify context selection adds the right environment.

**Steps**:
1. Upload a bag
2. In "Lifestyle Photography", select **"Bag in Hand"** preset
3. Select Gender: **Female**
4. In "Product Context" dropdown, select: **Airport**
5. Click Generate
6. **Expected Result**: Bag held by female hand in an airport terminal setting

**Other contexts to test**:
- Hotel Lobby
- City Street
- Luxury Car Interior

---

### Test 5: Combined Features

**Purpose**: Test all features working together.

**Steps**:
1. Upload a watch
2. **Lifestyle Shot**: "Watch on Wrist" (Female)
3. **Product Context**: "Luxury Hotel"
4. **Extra Instructions**: "Model wearing elegant business attire, soft natural window light"
5. **Number of Images**: 3
6. **Hyper Realism**: ON
7. **Color Grade**: "Cinematic Teal & Orange"
8. Click Generate

**Expected Result**: 3 professional images of watch on female wrist in luxury hotel, with business attire, cinematic color grading

---

### Test 6: E-commerce Pack Mode

**Purpose**: Verify pack mode still works with new features.

**Steps**:
1. Upload a product
2. In "Output" section, select **E-commerce Pack**: "Essential"
3. In "Extra Instructions", add: "Clean white studio background"
4. Click Generate
5. **Expected Result**: 4 images (Essential pack shots) with clean white background

---

## 🐛 Troubleshooting

### Issue: Only 1 image generates when selecting 2/3/4

**Possible Causes**:
1. UI state not updating
2. Check if `numberOfImages` in store is actually changing

**Debug Steps**:
1. Open browser console (F12)
2. Before generating, type: `window.location.reload()` to ensure fresh state
3. Click the "2" button
4. In console, check the state (if you have React DevTools)
5. Generate and watch console for errors

### Issue: Extra instructions not applied

**Check**:
1. Is the text field showing your input?
2. Is there a green checkmark showing "Your custom instructions will be applied"?
3. Check browser console for any errors during generation

### Issue: Lifestyle preset not working

**Check**:
1. Is the preset highlighted in purple when selected?
2. If it requires gender, is gender selected?
3. Is there a green summary box at the bottom showing "Active Preset"?

---

## 📊 Expected Behavior Summary

| Feature | Expected Behavior |
|---------|-------------------|
| **Number of Images: 2** | Generates exactly 2 images |
| **Number of Images: 3** | Generates exactly 3 images |
| **Number of Images: 4** | Generates exactly 4 images |
| **Extra Instructions** | Custom text is added to AI prompt with CRITICAL priority |
| **Lifestyle Shot** | Preset prompt is applied (e.g., "watch on wrist") |
| **Gender Selection** | Replaces [GENDER] in prompt with selected gender |
| **Product Context** | Adds environment description (e.g., "at airport") |
| **Combined Settings** | All settings work together in one generation |

---

## ✅ Success Criteria

The implementation is successful if:
- ✅ Selecting 2/3/4 images generates that exact number
- ✅ Extra instructions visibly affect the output
- ✅ Lifestyle presets create appropriate scenarios
- ✅ Gender selection affects the model/hands in the image
- ✅ Product context changes the environment
- ✅ All settings can be combined without conflicts
- ✅ E-commerce packs still work correctly

---

## 📝 Test Results Log

### Test 1: Multiple Images
- [ ] 2 images: ___________
- [ ] 3 images: ___________
- [ ] 4 images: ___________

### Test 2: Extra Instructions
- [ ] Airport scene: ___________
- [ ] Hand-held: ___________
- [ ] Hotel lobby: ___________

### Test 3: Lifestyle Presets
- [ ] Watch on wrist: ___________
- [ ] Bottle in hand: ___________
- [ ] Coffee shop: ___________

### Test 4: Product Context
- [ ] Airport context: ___________
- [ ] Hotel context: ___________

### Test 5: Combined Features
- [ ] All features together: ___________

### Test 6: E-commerce Pack
- [ ] Essential pack: ___________

---

## 🎯 Next Steps After Testing

If tests pass:
- ✅ Feature is complete and ready for production use
- Consider adding more lifestyle presets
- Consider adding preset favorites/custom presets

If tests fail:
- Check browser console for errors
- Verify state management in React DevTools
- Check network tab for API call issues
- Review prompt generation logs in terminal

