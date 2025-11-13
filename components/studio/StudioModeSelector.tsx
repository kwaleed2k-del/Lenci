import React from 'react';
import { Shirt, Package, Sparkles, ArrowRight, Wand2 } from 'lucide-react';

interface StudioModeSelectorProps {
    onSelectMode: (mode: 'apparel' | 'product') => void;
}

export const StudioModeSelector: React.FC<StudioModeSelectorProps> = ({ onSelectMode }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-8 relative overflow-hidden">
            {/* Animated Background Orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-orange-600/10 to-yellow-600/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Floating Geometric Shapes */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 border-2 border-purple-500/20 rounded-lg rotate-12 animate-float"></div>
                <div className="absolute bottom-1/4 right-1/4 w-24 h-24 border-2 border-cyan-500/20 rounded-full animate-float" style={{ animationDelay: '1.5s' }}></div>
                <div className="absolute top-1/3 right-1/3 w-16 h-16 border-2 border-pink-500/20 rotate-45 animate-float" style={{ animationDelay: '0.5s' }}></div>
            </div>

            <div className="relative z-10 max-w-6xl w-full">
                {/* Header */}
                <div className="text-center mb-16 animate-fade-in">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-full mb-6">
                        <Sparkles size={16} className="text-purple-400" />
                        <span className="text-sm font-medium text-purple-300">AI-Powered Studio</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
                            Choose Your Studio
                        </span>
                    </h1>
                    <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                        Select the type of photoshoot you want to create with AI
                    </p>
                </div>

                {/* Studio Mode Cards */}
                <div className="grid md:grid-cols-2 gap-8 animate-slide-up">
                    {/* Fashion Model Studio */}
                    <button
                        onClick={() => onSelectMode('apparel')}
                        className="group relative bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 backdrop-blur-xl border border-zinc-700/50 rounded-3xl p-8 hover:border-purple-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 text-left overflow-hidden"
                    >
                        {/* Card Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 to-pink-600/0 group-hover:from-purple-600/10 group-hover:to-pink-600/10 transition-all duration-500 rounded-3xl"></div>
                        
                        {/* Icon */}
                        <div className="relative mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <Shirt size={40} className="text-purple-400" />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="relative">
                            <h2 className="text-3xl font-bold text-white mb-3 flex items-center gap-3">
                                Fashion Model Studio
                                <ArrowRight size={24} className="text-purple-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300" />
                            </h2>
                            <p className="text-zinc-400 text-lg mb-6 leading-relaxed">
                                Create professional fashion photoshoots with AI models wearing your apparel designs
                            </p>

                            {/* Features */}
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 text-sm text-zinc-300">
                                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                                    <span>25+ AI Models or upload your own</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-zinc-300">
                                    <div className="w-1.5 h-1.5 bg-pink-400 rounded-full"></div>
                                    <span>Virtual try-on with perfect fit</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-zinc-300">
                                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                                    <span>Professional poses & backgrounds</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-zinc-300">
                                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                                    <span>Facial identity preservation</span>
                                </div>
                            </div>

                            {/* Sample Images */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="aspect-[3/4] rounded-lg overflow-hidden border border-zinc-700/50">
                                    <img 
                                        src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=533&fit=crop" 
                                        alt="Fashion sample" 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                                <div className="aspect-[3/4] rounded-lg overflow-hidden border border-zinc-700/50">
                                    <img 
                                        src="https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=533&fit=crop" 
                                        alt="Fashion sample" 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                                <div className="aspect-[3/4] rounded-lg overflow-hidden border border-zinc-700/50">
                                    <img 
                                        src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=533&fit=crop" 
                                        alt="Fashion sample" 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                            </div>

                            {/* CTA */}
                            <div className="flex items-center gap-2 text-purple-400 font-semibold group-hover:gap-4 transition-all duration-300">
                                <Wand2 size={20} />
                                <span>Start Fashion Shoot</span>
                            </div>
                        </div>
                    </button>

                    {/* Product Photography Studio */}
                    <button
                        onClick={() => onSelectMode('product')}
                        className="group relative bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 backdrop-blur-xl border border-zinc-700/50 rounded-3xl p-8 hover:border-cyan-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20 text-left overflow-hidden"
                    >
                        {/* Card Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/0 to-blue-600/0 group-hover:from-cyan-600/10 group-hover:to-blue-600/10 transition-all duration-500 rounded-3xl"></div>
                        
                        {/* Icon */}
                        <div className="relative mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <Package size={40} className="text-cyan-400" />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="relative">
                            <h2 className="text-3xl font-bold text-white mb-3 flex items-center gap-3">
                                Product Photography Studio
                                <ArrowRight size={24} className="text-cyan-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300" />
                            </h2>
                            <p className="text-zinc-400 text-lg mb-6 leading-relaxed">
                                Generate stunning product photos with professional lighting and creative scenes
                            </p>

                            {/* Features */}
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 text-sm text-zinc-300">
                                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                                    <span>E-commerce ready product shots</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-zinc-300">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                    <span>Creative backgrounds & scenes</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-zinc-300">
                                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full"></div>
                                    <span>Professional lighting setups</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-zinc-300">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                                    <span>Multiple angles & compositions</span>
                                </div>
                            </div>

                            {/* Sample Images */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="aspect-square rounded-lg overflow-hidden border border-zinc-700/50">
                                    <img 
                                        src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop" 
                                        alt="Product sample" 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                                <div className="aspect-square rounded-lg overflow-hidden border border-zinc-700/50">
                                    <img 
                                        src="https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop" 
                                        alt="Product sample" 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                                <div className="aspect-square rounded-lg overflow-hidden border border-zinc-700/50">
                                    <img 
                                        src="https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&h=400&fit=crop" 
                                        alt="Product sample" 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                            </div>

                            {/* CTA */}
                            <div className="flex items-center gap-2 text-cyan-400 font-semibold group-hover:gap-4 transition-all duration-300">
                                <Wand2 size={20} />
                                <span>Start Product Shoot</span>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Bottom Info */}
                <div className="text-center mt-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <p className="text-zinc-500 text-sm">
                        Not sure which to choose? Both studios offer professional AI-powered photography
                    </p>
                </div>
            </div>
        </div>
    );
};

