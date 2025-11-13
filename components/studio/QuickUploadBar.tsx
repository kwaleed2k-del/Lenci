import React, { useState } from 'react';
import { ModelUploader } from '../model/ModelUploader';
import { ApparelUploader } from '../apparel/ApparelUploader';
import { useStudio } from '../../context/StudioContext';

export const QuickUploadBar: React.FC = () => {
    const { promptedModelDescription, setPromptedModelDescription, studioMode } = useStudio();
    const [text, setText] = useState(promptedModelDescription || '');

    if (studioMode !== 'apparel') return null;

    return (
        <div className="fixed bottom-3 left-3 right-3 z-30">
            <div className="mx-auto max-w-6xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-3 shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="min-h-[120px]">
                        <ModelUploader />
                    </div>
                    <div className="min-h-[120px]">
                        <ApparelUploader />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs text-zinc-400 mb-1">Describe your image (affects the prompt)</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onBlur={() => setPromptedModelDescription(text)}
                            placeholder="e.g., 25-year-old Arabian female model, elegant street-style coat, golden hour in Dubai"
                            className="flex-1 min-h-[120px] rounded-lg bg-zinc-800/70 border border-zinc-700 p-3 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
