import React from 'react';
import { Play, Sparkles } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { ANIMATION_STYLES_LIBRARY } from '../../constants';

export const VideoAnimationPanel: React.FC = () => {
    const { videoSourceImage } = useStudio();
    const [selectedAnimation, setSelectedAnimation] = React.useState(ANIMATION_STYLES_LIBRARY[0]);

    if (!videoSourceImage) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <div className="text-center">
                    <Sparkles size={48} className="mx-auto mb-4 text-zinc-600" />
                    <p className="text-zinc-400 text-sm">Upload a source image first</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
                <Play size={18} className="text-violet-400" />
                <h3 className="font-semibold text-white">Animation Style</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {ANIMATION_STYLES_LIBRARY.map((anim) => (
                    <button
                        key={anim.id}
                        onClick={() => setSelectedAnimation(anim)}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                            selectedAnimation.id === anim.id
                                ? 'border-violet-500 bg-violet-500/10'
                                : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900'
                        }`}
                    >
                        <p className="font-semibold text-white text-sm mb-1">{anim.name}</p>
                        <p className="text-xs text-zinc-400">{anim.description}</p>
                    </button>
                ))}
            </div>

            <div className="mt-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                <h4 className="text-sm font-semibold text-white mb-2">Selected Animation</h4>
                <p className="text-xs text-zinc-400 mb-1">{selectedAnimation.name}</p>
                <p className="text-xs text-zinc-500">{selectedAnimation.description}</p>
            </div>

            <div className="text-xs text-zinc-500 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p>💡 Tip: Click Generate to create a video with the selected animation style</p>
            </div>
        </div>
    );
};

