import React from 'react';
import { Lightbulb, Check, Loader2, X } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { CAMERA_ANGLES_LIBRARY_PRODUCT, LIGHTING_PRESETS_PRODUCT, BACKGROUNDS_LIBRARY, SURFACE_LIBRARY } from '../../constants';

export const ProductArtDirectorPanel: React.FC = () => {
    const { productArtDirectorSuggestions, isFetchingProductSuggestion, applyProductArtDirectorSuggestion, appliedProductSuggestionId, removeProductArtDirectorSuggestion } = useStudio();
    
    if (isFetchingProductSuggestion) {
        return (
            <div className="mt-4 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg flex items-center justify-center">
                <Loader2 size={18} className="animate-spin text-violet-400 mr-3" />
                <span className="text-sm text-zinc-300">AI Director is analyzing your product...</span>
            </div>
        );
    }

    if (!productArtDirectorSuggestions || productArtDirectorSuggestions.length === 0) {
        return null;
    }
    
    return (
        <div className="mt-4 animate-fade-in overflow-hidden">
            <div className="flex items-start gap-3 mb-4 px-1">
                <div className="flex-shrink-0 bg-violet-500/10 text-violet-400 rounded-full p-2">
                    <Lightbulb size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-zinc-100">AI Art Director Concepts</h4>
                    <p className="text-sm text-zinc-400">Here are creative photoshoot directions for your product. Choose one to apply settings.</p>
                </div>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 model-filter-scrollbar">
                {productArtDirectorSuggestions.map((suggestion) => {
                    const cameraAngle = CAMERA_ANGLES_LIBRARY_PRODUCT.find(c => c.id === suggestion.cameraAngleId);
                    const lighting = LIGHTING_PRESETS_PRODUCT.find(l => l.id === suggestion.lightingId);
                    const background = BACKGROUNDS_LIBRARY.find(b => b.id === suggestion.backgroundId);
                    const surface = SURFACE_LIBRARY.find(s => s.id === suggestion.surfaceId);
                    const isApplied = appliedProductSuggestionId === suggestion.id;
                    const isAnyApplied = !!appliedProductSuggestionId;

                    return (
                        <div 
                            key={suggestion.id} 
                            className={`
                                flex-shrink-0 w-64 bg-zinc-900/70 rounded-lg flex flex-col
                                transition-all duration-300 ease-in-out
                                ${isApplied 
                                    ? 'border-2 border-violet-500 shadow-glow-lg shadow-violet-500/20' 
                                    : isAnyApplied 
                                        ? 'border-2 border-transparent opacity-50 scale-95 hover:opacity-100 hover:scale-100 hover:border-violet-500/40 hover:shadow-glow-md'
                                        : 'border-2 border-violet-500/20 hover:border-violet-500/50 shadow-glow-sm hover:shadow-glow-md'
                                }
                            `}
                        >
                             <div className="flex-grow p-4 min-h-0 relative">
                                {isApplied && (
                                    <button 
                                        onClick={() => removeProductArtDirectorSuggestion()}
                                        className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-zinc-700/80 hover:bg-red-600 text-zinc-300 hover:text-white transition-all duration-200"
                                        aria-label="Remove applied concept"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                                <h5 className="font-bold text-white truncate">{suggestion.conceptName}</h5>
                                <p className="text-xs text-zinc-400 mt-2 h-20 overflow-hidden">{suggestion.reasoning}</p>
                                <div className="mt-3 space-y-1.5 text-xs">
                                    <div className="flex items-center gap-2 text-zinc-300"><span className="font-semibold text-zinc-500 w-16 text-right">Angle:</span> {cameraAngle?.name || 'N/A'}</div>
                                    <div className="flex items-center gap-2 text-zinc-300"><span className="font-semibold text-zinc-500 w-16 text-right">Lighting:</span> {lighting?.name || 'N/A'}</div>
                                    <div className="flex items-center gap-2 text-zinc-300"><span className="font-semibold text-zinc-500 w-16 text-right">BG:</span> {background?.name || 'N/A'}</div>
                                    <div className="flex items-center gap-2 text-zinc-300"><span className="font-semibold text-zinc-500 w-16 text-right">Surface:</span> {surface?.name || 'N/A'}</div>
                                </div>
                            </div>
                            <div className="flex-shrink-0 p-3 bg-zinc-900/50 rounded-b-lg">
                                <button
                                    onClick={() => applyProductArtDirectorSuggestion(suggestion)}
                                    disabled={isApplied}
                                    className={`
                                        w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-semibold transition-colors duration-200 border
                                        ${isApplied 
                                            ? 'bg-green-500/20 border-green-500/30 text-green-300 cursor-default' 
                                            : 'bg-violet-600 hover:bg-violet-500 text-white border-transparent'
                                        }`}
                                >
                                    {isApplied ? <Check size={16} /> : null}
                                    {isApplied ? 'Applied' : 'Apply Concept'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

