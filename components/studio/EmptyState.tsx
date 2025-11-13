import React from 'react';
import { Wand2 } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';

export const EmptyState: React.FC = () => {
    const { studioMode } = useStudio();
    
    const message = studioMode === 'apparel'
        ? "Your generated images will appear here. Begin by adding a model and apparel in the left panel."
        : studioMode === 'product'
        ? "Your generated product photos will appear here. Begin by uploading a product in the left panel."
        : "Your generated mockups will appear here. Begin by uploading a mockup and a design in the left panel.";

    const title = studioMode === 'apparel' 
        ? "Lenci Canvas" 
        : studioMode === 'product'
        ? "Product Stage Canvas"
        : "Design Canvas";

    return (
        <div className="flex flex-col items-center justify-center text-center text-zinc-500 p-8 animate-fade-in">
            <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-zinc-900/80 border border-white/10 mb-6 animate-float shadow-2xl shadow-black">
                <div className="absolute inset-0 rounded-full bg-aurora opacity-60 animate-pulse-slow"></div>
                <Wand2 size={48} className="text-violet-300" style={{ filter: 'drop-shadow(0 0 10px rgba(167, 139, 250, 0.6))' }} />
            </div>
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">{title}</h3>
            <p className="text-md mt-2 max-w-sm text-zinc-400">{message}</p>
            <div className="mt-6 text-left">
                <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2">Ideas to explore</p>
                <ul className="space-y-2 text-sm text-zinc-300">
                    <li className="flex items-start gap-2"><span className="text-violet-400 mt-0.5">✦</span> Luxury promotional imagery featuring products</li>
                    <li className="flex items-start gap-2"><span className="text-violet-400 mt-0.5">✦</span> Lifestyle context shots for social media campaign</li>
                    <li className="flex items-start gap-2"><span className="text-violet-400 mt-0.5">✦</span> High-fashion lookbook with cinematic lighting</li>
                </ul>
            </div>
        </div>
    );
}