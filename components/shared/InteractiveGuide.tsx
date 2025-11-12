import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { useStudio } from '../../context/StudioContext';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';

const buildTourSteps = (flow: 'apparel' | 'product') => {
  if (flow === 'product') {
    return [
      {
        targetId: 'input-panel-tabs',
        title: '1. Choose Product Mode',
        description: "Switch to Product mode here if you're not already in it.",
        position: 'right',
        requireTab: null,
      },
      {
        targetId: 'product-uploader-dropzone',
        title: '2. Upload Product',
        description: "Upload your product image (ideally on a clean background). We'll analyze it and suggest creative concepts.",
        position: 'right',
        requireTab: 'product',
      },
      {
        targetId: 'settings-panel-scene',
        title: '3. Scene & Background',
        description: "Pick a background (beach, cafe, city, gallery), adjust lighting and environment. Concepts you apply will update these automatically.",
        position: 'left',
        requireTab: null,
      },
      {
        targetId: 'settings-panel-creative',
        title: '4. Camera & Look',
        description: "Set camera angle, focal length, aperture, and color grading to match your brand.",
        position: 'left',
        requireTab: null,
      },
      {
        targetId: 'generate-button-container',
        title: '5. Generate Images',
        description: "Click Generate to create 1–4 images. You can add a logo overlay afterward from the settings.",
        position: 'bottom',
        requireTab: null,
      },
    ];
  }
  // Apparel default
  return [
    {
      targetId: 'input-panel-tabs',
      title: '1. Add Inputs',
      description: "Select your Model (or upload) and add Apparel items to try on.",
      position: 'right',
      requireTab: null,
    },
    {
      targetId: 'apparel-uploader-dropzone',
      title: '2. Upload Apparel',
      description: "First, click the 'Apparel' tab above, then drag and drop your clothing items. If you have both front and back, upload them for best results.",
      position: 'right',
      requireTab: 'apparel',
    },
    {
      targetId: 'settings-panel-scene',
      title: '3. Scene & Lighting',
      description: "Choose a background and lighting. AI Art Director concepts will update these automatically.",
      position: 'left',
      requireTab: null,
    },
    {
      targetId: 'settings-panel-creative',
      title: '4. Direct the Shoot',
      description: "Set camera angle, expression, aperture, and color grade. Face is preserved by default.",
      position: 'left',
      requireTab: null,
    },
    {
      targetId: 'generate-button-container',
      title: '5. Generate!',
      description: "Press Generate to create professional, photorealistic images.",
      position: 'bottom',
      requireTab: null,
    },
  ];
};


interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const InteractiveGuide: React.FC = () => {
  const { setGuideActive, guideFlow, setStudioMode } = useStudio();
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<Rect | null>(null);
  const steps = useMemo(() => buildTourSteps(guideFlow || 'apparel'), [guideFlow]);

  const currentStepConfig = steps[currentStep];

  useEffect(() => {
    // Ensure correct studio mode is selected for the guide
    if (guideFlow === 'product') setStudioMode('product');
    if (guideFlow === 'apparel') setStudioMode('apparel');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideFlow]);

  useLayoutEffect(() => {
    let cancelled = false;
    
    // If this step requires a specific tab, click it
    const requireTab = (currentStepConfig as any).requireTab;
    if (requireTab) {
      const tabButtons = document.querySelectorAll('[data-tab-id]');
      tabButtons.forEach((btn) => {
        if (btn.getAttribute('data-tab-id') === requireTab) {
          (btn as HTMLElement).click();
        }
      });
    }
    
    const calculateRect = () => {
      if (cancelled) return;
      const targetElement = document.getElementById(currentStepConfig.targetId);
      if (targetElement) {
        // If the target is a <details> element (our SettingSection), force it open
        if (targetElement.tagName.toLowerCase() === 'details' && !targetElement.hasAttribute('open')) {
          targetElement.setAttribute('open', '');
        }
        // Scroll into view to avoid offscreen targets
        try { targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch {}
        const rect = targetElement.getBoundingClientRect();
        setHighlightRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      } else {
        setHighlightRect(null);
      }
    };

    // Initial attempt after mount/step change
    const timeoutId = setTimeout(calculateRect, 80);
    // Poll until target appears (handles async mounting)
    const intervalId = window.setInterval(() => {
      const el = document.getElementById(currentStepConfig.targetId);
      if (el) {
        calculateRect();
        window.clearInterval(intervalId);
      }
    }, 200);

    window.addEventListener('resize', calculateRect);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      window.removeEventListener('resize', calculateRect);
    };
  }, [currentStep, currentStepConfig]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    setGuideActive(false);
  };
  
  const getTooltipPosition = () => {
    if (!highlightRect) return { top: '-9999px', left: '-9999px', opacity: 0 };
    
    const tooltipWidth = 320; 
    const tooltipHeight = 180;
    const gap = 24;

    let top, left;

    switch(currentStepConfig.position) {
        case 'right':
            top = highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2;
            left = highlightRect.left + highlightRect.width + gap;
            break;
        case 'left':
            top = highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2;
            left = highlightRect.left - tooltipWidth - gap;
            break;
        case 'bottom':
             top = highlightRect.top + highlightRect.height + gap;
             left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;
            break;
        default:
             top = window.innerHeight / 2 - tooltipHeight / 2;
             left = window.innerWidth / 2 - tooltipWidth / 2;
    }
    
    // Clamp values to be within viewport
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

    return { top: `${top}px`, left: `${left}px`, opacity: 1 };
  };

  const arrowClass = `tooltip-arrow tooltip-arrow-${currentStepConfig.position}`;

  return (
    <div className="fixed inset-0 z-[100]">
        {/* Backdrop */}
        <div 
            className="absolute inset-0 bg-black/50 transition-opacity duration-300"
            onClick={handleFinish}
        />
        
        {/* Spotlight & border */}
        {highlightRect && (
            <>
                <div
                    className="absolute pointer-events-none rounded-xl transition-all duration-300 guide-spotlight"
                    style={{
                        top: `${highlightRect.top - 8}px`,
                        left: `${highlightRect.left - 8}px`,
                        width: `${highlightRect.width + 16}px`,
                        height: `${highlightRect.height + 16}px`,
                    }}
                />
                {/* Corner brackets for extra emphasis */}
                <div
                    className="absolute pointer-events-none transition-all duration-300"
                    style={{
                        top: `${highlightRect.top - 8}px`,
                        left: `${highlightRect.left - 8}px`,
                        width: `${highlightRect.width + 16}px`,
                        height: `${highlightRect.height + 16}px`,
                    }}
                >
                    {/* Top-left corner */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-violet-400 rounded-tl-xl animate-pulse" />
                    {/* Top-right corner */}
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-violet-400 rounded-tr-xl animate-pulse" style={{ animationDelay: '0.15s' }} />
                    {/* Bottom-left corner */}
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-violet-400 rounded-bl-xl animate-pulse" style={{ animationDelay: '0.3s' }} />
                    {/* Bottom-right corner */}
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-violet-400 rounded-br-xl animate-pulse" style={{ animationDelay: '0.45s' }} />
                </div>
            </>
        )}

        {/* Tooltip */}
         <div 
            className="absolute w-80 bg-zinc-800 p-5 rounded-xl border border-white/10 shadow-glow-lg text-white transition-all duration-300 animate-fade-in"
            style={getTooltipPosition()}
        >
            <div className={arrowClass} />
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-violet-300">{currentStepConfig.title}</h3>
                <span className="text-sm font-medium text-zinc-400">{currentStep + 1} / {steps.length}</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed mb-4">{currentStepConfig.description}</p>
            <div className="flex justify-between items-center">
                <button onClick={handleFinish} className="text-sm text-zinc-400 hover:text-white transition-colors">Skip</button>
                <div className="flex items-center gap-2">
                     <button 
                        onClick={handlePrev} 
                        disabled={currentStep === 0}
                        className="p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                     <button 
                        onClick={handleNext} 
                        className="flex items-center gap-2 py-2 px-4 rounded-full bg-violet-600 hover:bg-violet-500 font-semibold text-sm transition-colors"
                    >
                        {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};