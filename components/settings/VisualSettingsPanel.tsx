import React, { useState } from 'react';
import { Camera, Palette, Sparkles, Sun, Image as ImageIcon, Smile, ChevronDown, ChevronUp } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { SHOT_TYPES_LIBRARY, BACKGROUNDS_LIBRARY, LIGHTING_PRESETS, EXPRESSIONS, COLOR_GRADING_PRESETS } from '../../constants';

export const VisualSettingsPanel: React.FC = () => {
    const { apparelControls, updateApparelControl, scene, updateScene } = useStudio();
    const [expandedSection, setExpandedSection] = useState<string | null>('pose');

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="space-y-4 p-4">
            {/* Pose & Shot Type */}
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 border border-zinc-700/50 rounded-2xl overflow-hidden">
                <button
                    onClick={() => toggleSection('pose')}
                    className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl flex items-center justify-center">
                            <Camera size={20} className="text-purple-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-white">Pose & Angle</h3>
                            <p className="text-xs text-zinc-400">{apparelControls.shotType.name}</p>
                        </div>
                    </div>
                    {expandedSection === 'pose' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {expandedSection === 'pose' && (
                    <div className="p-4 pt-0 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {SHOT_TYPES_LIBRARY.slice(0, 12).map((shot) => (
                            <button
                                key={shot.id}
                                onClick={() => updateApparelControl('shotType', shot)}
                                className={`p-3 rounded-xl text-left transition-all ${
                                    apparelControls.shotType.id === shot.id
                                        ? 'bg-purple-600/20 border-2 border-purple-500 text-white'
                                        : 'bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 text-zinc-300'
                                }`}
                            >
                                <div className="text-sm font-medium">{shot.name}</div>
                                <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{shot.description}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Background */}
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 border border-zinc-700/50 rounded-2xl overflow-hidden">
                <button
                    onClick={() => toggleSection('background')}
                    className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-xl flex items-center justify-center">
                            <ImageIcon size={20} className="text-cyan-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-white">Background</h3>
                            <p className="text-xs text-zinc-400">{scene.background.name}</p>
                        </div>
                    </div>
                    {expandedSection === 'background' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {expandedSection === 'background' && (
                    <div className="p-4 pt-0 grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                        {BACKGROUNDS_LIBRARY.slice(0, 18).map((bg) => (
                            <button
                                key={bg.id}
                                onClick={() => updateScene({ background: bg })}
                                className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                                    scene.background.id === bg.id
                                        ? 'ring-2 ring-cyan-500 scale-95'
                                        : 'hover:scale-105'
                                }`}
                            >
                                {bg.type === 'image' ? (
                                    <img src={bg.value} alt={bg.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full" style={{ background: bg.value }}></div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end">
                                    <span className="text-[10px] font-medium text-white p-1.5 w-full text-center truncate">{bg.name}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Lighting */}
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 border border-zinc-700/50 rounded-2xl overflow-hidden">
                <button
                    onClick={() => toggleSection('lighting')}
                    className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-600/20 to-orange-600/20 rounded-xl flex items-center justify-center">
                            <Sun size={20} className="text-yellow-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-white">Lighting</h3>
                            <p className="text-xs text-zinc-400">{scene.lighting.name}</p>
                        </div>
                    </div>
                    {expandedSection === 'lighting' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {expandedSection === 'lighting' && (
                    <div className="p-4 pt-0 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {LIGHTING_PRESETS.slice(0, 12).map((light) => (
                            <button
                                key={light.id}
                                onClick={() => updateScene({ lighting: light })}
                                className={`p-3 rounded-xl text-left transition-all ${
                                    scene.lighting.id === light.id
                                        ? 'bg-yellow-600/20 border-2 border-yellow-500 text-white'
                                        : 'bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 text-zinc-300'
                                }`}
                            >
                                <div className="text-sm font-medium">{light.name}</div>
                                <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{light.description}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Expression */}
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 border border-zinc-700/50 rounded-2xl overflow-hidden">
                <button
                    onClick={() => toggleSection('expression')}
                    className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-600/20 to-rose-600/20 rounded-xl flex items-center justify-center">
                            <Smile size={20} className="text-pink-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-white">Expression</h3>
                            <p className="text-xs text-zinc-400">{apparelControls.expression.name}</p>
                        </div>
                    </div>
                    {expandedSection === 'expression' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {expandedSection === 'expression' && (
                    <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                        {EXPRESSIONS.map((expr) => (
                            <button
                                key={expr.id}
                                onClick={() => updateApparelControl('expression', expr)}
                                className={`p-3 rounded-xl text-left transition-all ${
                                    apparelControls.expression.id === expr.id
                                        ? 'bg-pink-600/20 border-2 border-pink-500 text-white'
                                        : 'bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 text-zinc-300'
                                }`}
                            >
                                <div className="text-sm font-medium">{expr.name}</div>
                                <div className="text-xs text-zinc-400 mt-1">{expr.description}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Color Grade */}
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 border border-zinc-700/50 rounded-2xl overflow-hidden">
                <button
                    onClick={() => toggleSection('color')}
                    className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-xl flex items-center justify-center">
                            <Palette size={20} className="text-indigo-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-white">Color Grade</h3>
                            <p className="text-xs text-zinc-400">{apparelControls.colorGrade.name}</p>
                        </div>
                    </div>
                    {expandedSection === 'color' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {expandedSection === 'color' && (
                    <div className="p-4 pt-0 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {COLOR_GRADING_PRESETS.map((grade) => (
                            <button
                                key={grade.id}
                                onClick={() => updateApparelControl('colorGrade', grade)}
                                className={`p-3 rounded-xl text-left transition-all ${
                                    apparelControls.colorGrade.id === grade.id
                                        ? 'bg-indigo-600/20 border-2 border-indigo-500 text-white'
                                        : 'bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 text-zinc-300'
                                }`}
                            >
                                <div className="text-sm font-medium">{grade.name}</div>
                                <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{grade.description}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Toggles */}
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 border border-zinc-700/50 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-xl flex items-center justify-center">
                        <Sparkles size={20} className="text-green-400" />
                    </div>
                    <h3 className="font-semibold text-white">Quality Enhancements</h3>
                </div>
                
                <div className="space-y-2">
                    <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
                        <span className="text-sm text-zinc-300">Hyper-Realism Mode</span>
                        <input
                            type="checkbox"
                            checked={apparelControls.isHyperRealismEnabled}
                            onChange={(e) => updateApparelControl('isHyperRealismEnabled', e.target.checked)}
                            className="w-5 h-5 rounded accent-green-500"
                        />
                    </label>
                    
                    <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
                        <span className="text-sm text-zinc-300">Cinematic Look</span>
                        <input
                            type="checkbox"
                            checked={apparelControls.cinematicLook}
                            onChange={(e) => updateApparelControl('cinematicLook', e.target.checked)}
                            className="w-5 h-5 rounded accent-green-500"
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};

