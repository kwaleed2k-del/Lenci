import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Sun, Smile, Palette, Sparkles, Zap } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { SHOT_TYPES_LIBRARY, BACKGROUNDS_LIBRARY, LIGHTING_PRESETS, EXPRESSIONS, COLOR_GRADING_PRESETS } from '../../constants';

export const CreativeVisualSettings: React.FC = () => {
    const { apparelControls, updateApparelControl, scene, updateScene } = useStudio();
    const [activeCategory, setActiveCategory] = useState<'pose' | 'background' | 'lighting' | 'expression' | 'color'>('pose');

    const poseImages: Record<string, string> = {
        st1: '/assets/poses/st1.jpg',
        st2: '/assets/poses/st2.jpg',
        st3: '/assets/poses/st3.jpg',
        st4: '/assets/poses/st4.jpg',
        st5: '/assets/poses/st5.jpg',
        st6: '/assets/poses/st6.jpg',
        st7: '/assets/poses/st7.jpg',
        st8: '/assets/poses/st8.jpg',
        st9: '/assets/poses/st9.jpg',
        st10: '/assets/poses/st10.jpg',
        st11: '/assets/poses/st11.jpg',
        st12: '/assets/poses/st12.jpg',
        st13: '/assets/poses/st13.jpg',
        st14: '/assets/poses/st14.jpg',
        st15: '/assets/poses/st15.jpg',
        st16: '/assets/poses/st16.jpg',
        st17: '/assets/poses/st17.jpg',
        st18: '/assets/poses/st18.jpg',
        st19: '/assets/poses/st19.jpg',
        st20: '/assets/poses/st20.jpg',
        st21: '/assets/poses/st21.jpg',
        st22: '/assets/poses/st22.jpg',
    };

    const handlePoseImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
        const target = event.currentTarget;
        if (target.dataset.fallbackApplied) return;
        target.dataset.fallbackApplied = 'true';
        target.src = '/assets/poses/st1.jpg';
    };

    const categories = [
        { id: 'pose', label: 'Pose & Angle', icon: Camera, color: 'from-purple-600 to-pink-600', count: SHOT_TYPES_LIBRARY.length },
        { id: 'background', label: 'Background', icon: ImageIcon, color: 'from-cyan-600 to-blue-600', count: BACKGROUNDS_LIBRARY.length },
        { id: 'lighting', label: 'Lighting', icon: Sun, color: 'from-yellow-600 to-orange-600', count: LIGHTING_PRESETS.length },
        { id: 'expression', label: 'Expression', icon: Smile, color: 'from-pink-600 to-rose-600', count: EXPRESSIONS.length },
        { id: 'color', label: 'Color Grade', icon: Palette, color: 'from-indigo-600 to-purple-600', count: COLOR_GRADING_PRESETS.length },
    ];

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-20 right-20 w-64 h-64 bg-gradient-to-br from-cyan-600/10 to-blue-600/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative z-10 p-6 space-y-6">
                {/* Category Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map((cat) => {
                        const Icon = cat.icon;
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id as any)}
                                className={`flex-shrink-0 flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300 ${
                                    isActive
                                        ? `bg-gradient-to-r ${cat.color} text-white shadow-lg scale-105`
                                        : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                }`}
                            >
                                <Icon size={20} />
                                <div className="text-left">
                                    <div className="font-semibold text-sm">{cat.label}</div>
                                    <div className="text-xs opacity-75">{cat.count} options</div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Pose & Angle */}
                {activeCategory === 'pose' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
                        {SHOT_TYPES_LIBRARY.map((shot) => (
                            <button
                                key={shot.id}
                                onClick={() => updateApparelControl('shotType', shot)}
                                className={`group relative aspect-[3/4] rounded-2xl overflow-hidden transition-all duration-300 ${
                                    apparelControls.shotType.id === shot.id
                                        ? 'ring-4 ring-purple-500 scale-95 shadow-2xl shadow-purple-500/50'
                                        : 'hover:scale-105 hover:shadow-xl'
                                }`}
                                >
                                <img
                                    src={poseImages[shot.id] || '/assets/poses/st1.jpg'}
                                    alt={shot.name}
                                    loading="lazy"
                                    decoding="async"
                                    onError={handlePoseImageError}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                                <div className="absolute inset-0 flex flex-col justify-end p-4">
                                    <h3 className="font-bold text-white text-lg mb-1">{shot.name}</h3>
                                    <p className="text-xs text-zinc-300 line-clamp-2">{shot.description}</p>
                                </div>
                                {apparelControls.shotType.id === shot.id && (
                                    <div className="absolute top-3 right-3 bg-purple-600 text-white rounded-full p-2">
                                        <Sparkles size={16} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Background */}
                {activeCategory === 'background' && (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3 animate-fade-in">
                        {BACKGROUNDS_LIBRARY.slice(0, 24).map((bg) => (
                            <button
                                key={bg.id}
                                onClick={() => updateScene({ background: bg })}
                                className={`group relative aspect-square rounded-xl overflow-hidden transition-all duration-300 ${
                                    scene.background.id === bg.id
                                        ? 'ring-4 ring-cyan-500 scale-95 shadow-2xl shadow-cyan-500/50'
                                        : 'hover:scale-105 hover:shadow-xl'
                                }`}
                            >
                                {bg.type === 'image' ? (
                                    <img src={bg.value} alt={bg.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full" style={{ background: bg.value }}></div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                                    <p className="text-white font-semibold text-sm text-center">{bg.name}</p>
                                </div>
                                {scene.background.id === bg.id && (
                                    <div className="absolute top-2 right-2 bg-cyan-600 text-white rounded-full p-1.5">
                                        <Zap size={14} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Lighting */}
                {activeCategory === 'lighting' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
                        {LIGHTING_PRESETS.map((light) => {
                            const lightingImages: Record<string, string> = {
                                'l_match': 'https://images.unsplash.com/photo-1558769132-cb1aea1c8a42?w=400&h=300&fit=crop', // Match Model's Lighting
                                'l1': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=300&fit=crop', // Studio Softbox - soft front light
                                'l7': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=300&fit=crop', // Flat & Even - bright even
                                'l2': 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=300&fit=crop', // Golden Hour - warm side light
                                'l3': 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=300&fit=crop', // Dramatic Hard Light - strong shadows
                                'l8': 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&h=300&fit=crop', // Midday Sun - harsh direct
                                'l9': 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400&h=300&fit=crop', // Overcast Day - soft diffused
                                'l10': 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&h=300&fit=crop', // Blue Hour - cool twilight
                                'l5': 'https://images.unsplash.com/photo-1479936343636-73cdc5aae0c3?w=400&h=300&fit=crop', // Dappled Sunlight - filtered through leaves
                                'l15': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=300&fit=crop', // Window Light - soft directional
                                'l4': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop', // Rim Light - backlit outline
                                'l6': 'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=400&h=300&fit=crop', // Neon Glow - colorful neon
                                'l11': 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=300&fit=crop', // Moonlight - cool low light
                                'l12': 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=300&fit=crop', // Split Lighting - dramatic half
                                'l13': 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=300&fit=crop', // Candlelight - warm flickering
                                'l14': 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=300&fit=crop', // Projector Light - artistic patterns
                                'l16': 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=400&h=300&fit=crop', // Gobo Patterns - patterned shadows
                            };
                            
                            return (
                                <button
                                    key={light.id}
                                    onClick={() => updateScene({ lighting: light })}
                                    className={`group relative aspect-video rounded-2xl overflow-hidden transition-all duration-300 ${
                                        scene.lighting.id === light.id
                                            ? 'ring-4 ring-yellow-500 scale-95 shadow-2xl shadow-yellow-500/50'
                                            : 'hover:scale-105 hover:shadow-xl'
                                    }`}
                                >
                                    <img
                                        src={lightingImages[light.id] || 'https://images.unsplash.com/photo-1558769132-cb1aea1c8a42?w=400&h=300&fit=crop'}
                                        alt={light.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                                    <div className="absolute inset-0 flex flex-col justify-end p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Sun size={18} className="text-yellow-400" />
                                            <h3 className="font-bold text-white">{light.name}</h3>
                                        </div>
                                        <p className="text-xs text-zinc-300 line-clamp-2">{light.description}</p>
                                    </div>
                                    {scene.lighting.id === light.id && (
                                        <div className="absolute top-3 right-3 bg-yellow-600 text-white rounded-full p-2">
                                            <Sparkles size={16} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Expression */}
                {activeCategory === 'expression' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
                        {EXPRESSIONS.map((expr) => {
                            const expressionImages: Record<string, string> = {
                                'e1': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=faces',
                                'e2': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&h=300&fit=crop&crop=faces',
                                'e3': 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300&h=300&fit=crop&crop=faces',
                                'e4': 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&h=300&fit=crop&crop=faces',
                                'e5': 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&h=300&fit=crop&crop=faces',
                                'e6': 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300&h=300&fit=crop&crop=faces',
                            };
                            
                            return (
                                <button
                                    key={expr.id}
                                    onClick={() => updateApparelControl('expression', expr)}
                                    className={`group relative aspect-square rounded-2xl overflow-hidden transition-all duration-300 ${
                                        apparelControls.expression.id === expr.id
                                            ? 'ring-4 ring-pink-500 scale-95 shadow-2xl shadow-pink-500/50'
                                            : 'hover:scale-105 hover:shadow-xl'
                                    }`}
                                >
                                    <img
                                        src={expressionImages[expr.id] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=faces'}
                                        alt={expr.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                        <h3 className="font-bold text-white text-center">{expr.name}</h3>
                                        <p className="text-xs text-zinc-300 text-center mt-1">{expr.description}</p>
                                    </div>
                                    {apparelControls.expression.id === expr.id && (
                                        <div className="absolute top-3 right-3 bg-pink-600 text-white rounded-full p-2">
                                            <Sparkles size={16} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Color Grade */}
                {activeCategory === 'color' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
                        {COLOR_GRADING_PRESETS.map((grade) => {
                            const colorGradeImages: Record<string, string> = {
                                'cg_none': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=300&fit=crop',
                                'cg_warm': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=300&fit=crop&sat=-100&hue=20',
                                'cg_cool': 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=300&fit=crop&sat=-50',
                                'cg_vintage': 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=300&fit=crop&sat=-30',
                                'cg_cinematic': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=300&fit=crop',
                                'cg_vibrant': 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&h=300&fit=crop&sat=100',
                            };
                            
                            return (
                                <button
                                    key={grade.id}
                                    onClick={() => updateApparelControl('colorGrade', grade)}
                                    className={`group relative aspect-video rounded-2xl overflow-hidden transition-all duration-300 ${
                                        apparelControls.colorGrade.id === grade.id
                                            ? 'ring-4 ring-indigo-500 scale-95 shadow-2xl shadow-indigo-500/50'
                                            : 'hover:scale-105 hover:shadow-xl'
                                    }`}
                                >
                                    <img
                                        src={colorGradeImages[grade.id] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=300&fit=crop'}
                                        alt={grade.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                                    <div className="absolute inset-0 flex flex-col justify-end p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Palette size={18} className="text-indigo-400" />
                                            <h3 className="font-bold text-white">{grade.name}</h3>
                                        </div>
                                        <p className="text-xs text-zinc-300 line-clamp-2">{grade.description}</p>
                                    </div>
                                    {apparelControls.colorGrade.id === grade.id && (
                                        <div className="absolute top-3 right-3 bg-indigo-600 text-white rounded-full p-2">
                                            <Sparkles size={16} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Quality Enhancements */}
                <div className="grid grid-cols-2 gap-4 mt-8">
                    <button
                        onClick={() => updateApparelControl('isHyperRealismEnabled', !apparelControls.isHyperRealismEnabled)}
                        className={`relative p-6 rounded-2xl transition-all duration-300 overflow-hidden ${
                            apparelControls.isHyperRealismEnabled
                                ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-2xl shadow-green-500/50 scale-105'
                                : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800'
                        }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Sparkles size={24} />
                            <h3 className="font-bold text-lg">Hyper-Realism</h3>
                        </div>
                        <p className="text-sm opacity-90">Ultra-detailed, photorealistic quality</p>
                    </button>

                    <button
                        onClick={() => updateApparelControl('cinematicLook', !apparelControls.cinematicLook)}
                        className={`relative p-6 rounded-2xl transition-all duration-300 overflow-hidden ${
                            apparelControls.cinematicLook
                                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-500/50 scale-105'
                                : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800'
                        }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Zap size={24} />
                            <h3 className="font-bold text-lg">Cinematic Look</h3>
                        </div>
                        <p className="text-sm opacity-90">Film-grade color & grain</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

