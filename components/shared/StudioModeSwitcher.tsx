import React from 'react';
import { Shirt, Package, Video } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';

export const StudioModeSwitcher: React.FC = () => {
    const { studioMode, setStudioMode } = useStudio();

    return (
        <div className="flex-shrink-0 bg-zinc-900 p-1 rounded-full flex items-center gap-1 border border-zinc-800 shadow-inner-soft">
            <button
                onClick={() => setStudioMode('apparel')}
                className={`flex-1 flex items-center justify-center gap-2 py-1 px-3 lg:px-4 text-sm font-medium rounded-full transition-colors duration-200 h-8
                ${studioMode === 'apparel' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}
            >
                <Shirt size={16} />
                <span className="hidden lg:inline">Apparel</span>
            </button>
            <button
                onClick={() => setStudioMode('product')}
                className={`flex-1 flex items-center justify-center gap-2 py-1 px-3 lg:px-4 text-sm font-medium rounded-full transition-colors duration-200 h-8
                ${studioMode === 'product' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}
            >
                <Package size={16} />
                <span className="hidden lg:inline">Product</span>
            </button>
            <button
                onClick={() => setStudioMode('video')}
                className={`flex-1 flex items-center justify-center gap-2 py-1 px-3 lg:px-4 text-sm font-medium rounded-full transition-colors duration-200 h-8
                ${studioMode === 'video' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}
            >
                <Video size={16} />
                <span className="hidden lg:inline">Video</span>
            </button>
        </div>
    );
};
