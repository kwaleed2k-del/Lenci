import React from 'react';
import { useStudio } from '../../context/StudioContext';

export const GenerationGrid: React.FC = () => {
    const { generatedImages } = useStudio();

    if (!generatedImages || generatedImages.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="text-center text-zinc-400">
                    <p className="text-lg font-semibold mb-2">No generations yet</p>
                    <p className="text-sm">Switch back to Studio to create your first images.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-auto p-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {generatedImages.map((img, idx) => (
                    <div key={idx} className="relative bg-zinc-900/60 border border-zinc-700/50 rounded-xl overflow-hidden">
                        <img src={img} alt={`Generated ${idx + 1}`} className="w-full h-48 object-cover" />
                    </div>
                ))}
            </div>
        </div>
    );
};
