import React, { useState, useEffect, useRef } from 'react';
import { Wand2, ArrowRight, Command, UserPlus, Shirt, Package } from 'lucide-react';
import { CreateUserForm } from '../auth/CreateUserForm';
import { BrandLogo } from '../shared/BrandLogo';

// --- Reusable Components ---

const WhyLenciSection: React.FC = () => {
    const items = [
        {
            title: "Face‑Locked Try‑On",
            desc: "Identity is preserved. Change only apparel and scene—never the person.",
            gradient: "from-violet-500 via-purple-500 to-violet-600",
            bgGradient: "from-violet-500/10 via-purple-500/5 to-transparent",
            icon: (
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="url(#gradient1)"/>
                    <defs>
                        <linearGradient id="gradient1" x1="2" y1="2" x2="22" y2="22">
                            <stop offset="0%" stopColor="#8b5cf6"/>
                            <stop offset="100%" stopColor="#a78bfa"/>
                        </linearGradient>
                    </defs>
                </svg>
            ),
            particles: ["🎭", "👤", "✨"]
        },
        {
            title: "Director‑Level Control",
            desc: "Backgrounds, lighting, camera angle, surface—all follow your settings exactly.",
            gradient: "from-blue-500 via-cyan-500 to-blue-600",
            bgGradient: "from-blue-500/10 via-cyan-500/5 to-transparent",
            icon: (
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 3V5H16V3H8V5H6V3H4V21H6V19H8V21H16V19H18V21H20V3H18ZM8 17H6V15H8V17ZM8 13H6V11H8V13ZM8 9H6V7H8V9ZM18 17H16V15H18V17ZM18 13H16V11H18V13ZM18 9H16V7H18V9ZM14 17H10V7H14V17Z" fill="url(#gradient2)"/>
                    <defs>
                        <linearGradient id="gradient2" x1="4" y1="3" x2="20" y2="21">
                            <stop offset="0%" stopColor="#3b82f6"/>
                            <stop offset="100%" stopColor="#06b6d4"/>
                        </linearGradient>
                    </defs>
                </svg>
            ),
            particles: ["🎬", "💡", "📸"]
        },
        {
            title: "Commerce‑Ready Output",
            desc: "Generate single shots or full packs with logo overlay and consistent quality.",
            gradient: "from-green-500 via-emerald-500 to-green-600",
            bgGradient: "from-green-500/10 via-emerald-500/5 to-transparent",
            icon: (
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 18C5.9 18 5.01 18.9 5.01 20C5.01 21.1 5.9 22 7 22C8.1 22 9 21.1 9 20C9 18.9 8.1 18 7 18ZM1 2V4H3L6.6 11.59L5.25 14.04C5.09 14.32 5 14.65 5 15C5 16.1 5.9 17 7 17H19V15H7.42C7.28 15 7.17 14.89 7.17 14.75L7.2 14.63L8.1 13H15.55C16.3 13 16.96 12.59 17.3 11.97L20.88 5.48C20.96 5.34 21 5.17 21 5C21 4.45 20.55 4 20 4H5.21L4.27 2H1ZM17 18C15.9 18 15.01 18.9 15.01 20C15.01 21.1 15.9 22 17 22C18.1 22 19 21.1 19 20C19 18.9 18.1 18 17 18Z" fill="url(#gradient3)"/>
                    <defs>
                        <linearGradient id="gradient3" x1="1" y1="2" x2="21" y2="22">
                            <stop offset="0%" stopColor="#10b981"/>
                            <stop offset="100%" stopColor="#34d399"/>
                        </linearGradient>
                    </defs>
                </svg>
            ),
            particles: ["🛍️", "💎", "🚀"]
        }
    ];
    
    return (
        <section className="relative py-20 sm:py-32 overflow-hidden">
            {/* Animated background gradient orbs */}
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
                <div className="absolute top-20 left-10 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            </div>
            
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />
            
            <div className="relative max-w-7xl mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <div className="inline-block mb-4">
                        <span className="px-4 py-2 bg-gradient-to-r from-violet-600/20 to-blue-600/20 border border-violet-500/30 rounded-full text-sm font-semibold text-violet-300 backdrop-blur-sm">
                            ⚡ Powered by Advanced AI
                        </span>
                    </div>
                    <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-blue-200">
                            Why Lenci?
                        </span>
                    </h2>
                    <p className="mt-6 text-xl text-zinc-400 leading-relaxed">
                        Creative control of a real studio—without the studio. <br className="hidden sm:block" />
                        <span className="text-violet-300 font-semibold">Pick a concept, we'll follow it exactly.</span>
                    </p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                    {items.map((item, idx) => (
                        <div 
                            key={item.title} 
                            className="group relative"
                            style={{ animationDelay: `${idx * 150}ms` }}
                        >
                            {/* Floating particles */}
                            <div className="absolute -top-4 -right-4 text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-float-slow">
                                {item.particles[0]}
                            </div>
                            <div className="absolute top-1/2 -left-4 text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-float-slow" style={{ animationDelay: '0.5s' }}>
                                {item.particles[1]}
                            </div>
                            <div className="absolute -bottom-4 right-8 text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-float-slow" style={{ animationDelay: '1s' }}>
                                {item.particles[2]}
                            </div>
                            
                            {/* Card */}
                            <div className={`relative h-full p-8 rounded-3xl border border-white/10 bg-gradient-to-br ${item.bgGradient} backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:border-white/30 hover:shadow-2xl overflow-hidden group`}>
                                {/* Animated gradient border on hover */}
                                <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r ${item.gradient} p-[2px]`}>
                                    <div className="w-full h-full rounded-3xl bg-zinc-900" />
                                </div>
                                
                                {/* Content */}
                                <div className="relative z-10">
                                    {/* Icon with gradient background */}
                                    <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${item.bgGradient} border border-white/10 mb-6 group-hover:scale-110 transition-transform duration-500`}>
                                        {item.icon}
                                    </div>
                                    
                                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-violet-200 transition-all duration-500">
                                        {item.title}
                                    </h3>
                                    
                                    <p className="text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors duration-500">
                                        {item.desc}
                                    </p>
                                    
                                    {/* Decorative corner accent */}
                                    <div className="absolute top-4 right-4 w-12 h-12 opacity-0 group-hover:opacity-20 transition-opacity duration-500">
                                        <div className={`w-full h-full rounded-full bg-gradient-to-br ${item.gradient} blur-xl`} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Bottom decorative line */}
                <div className="mt-16 flex justify-center">
                    <div className="h-1 w-64 bg-gradient-to-r from-transparent via-violet-500 to-transparent rounded-full" />
                </div>
            </div>
        </section>
    );
};

// --- Page Sections (Overhauled) ---

const Header: React.FC<{ onShowCreateUser: () => void }> = ({ onShowCreateUser }) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`fixed top-0 left-0 right-0 px-4 sm:px-6 py-4 flex items-center justify-between z-50 transition-all duration-300 ${scrolled ? 'bg-zinc-950/70 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'}`}>
            <a href="/" className="flex items-center gap-3 group">
                <div className="transition-all duration-300">
                    <BrandLogo width={40} height={40} src="https://i.ibb.co/rfR90C6Z/Siyada-Tech-Logo-with-Blue-and-Green-Palette.png" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-zinc-100 to-zinc-400">Lenci</h1>
            </a>
            <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-zinc-300">
                <a href="#features" className="hover:text-white transition-colors">Features</a>
                <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
                <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </nav>
            <div className="flex items-center space-x-2">
                <a href="/login.html" className="hidden sm:inline-block px-4 py-2 text-sm font-semibold text-zinc-200 hover:text-white hover:bg-zinc-800 rounded-md transition-colors">Log in</a>
                <button 
                    onClick={onShowCreateUser}
                    className="px-4 py-2 text-sm font-semibold text-white bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors border border-white/10 shadow-glass-inset flex items-center gap-2"
                >
                    <UserPlus size={16} />
                    Create User
                </button>
            </div>
        </header>
    );
};

const HeroSection: React.FC<{ onShowCreateUser: () => void }> = ({ onShowCreateUser }) => (
    <section className="relative h-screen min-h-[700px] flex items-center justify-center text-center overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-violet-950/10 to-blue-950/10 z-0"></div>
        
        {/* Multiple animated orbs with different sizes and colors */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl animate-pulse z-0"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-1000 z-0"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-green-600/8 rounded-full blur-3xl animate-pulse delay-500 z-0"></div>
        <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-purple-600/8 rounded-full blur-3xl animate-pulse delay-700 z-0"></div>
        <div className="absolute bottom-1/3 left-1/2 w-56 h-56 bg-cyan-600/8 rounded-full blur-3xl animate-pulse delay-300 z-0"></div>
        
        {/* Floating text elements */}
        <div className="absolute top-1/4 left-1/4 text-6xl font-bold text-violet-600/5 z-0 animate-float-slow">AI</div>
        <div className="absolute top-1/3 right-1/3 text-7xl font-bold text-blue-600/5 z-0 animate-float-slow delay-1000">FASHION</div>
        <div className="absolute bottom-1/4 left-1/3 text-5xl font-bold text-green-600/5 z-0 animate-float-slow delay-500">STUDIO</div>
        <div className="absolute top-2/3 right-1/4 text-6xl font-bold text-violet-600/5 z-0 animate-float-slow delay-700">DESIGN</div>
        <div className="absolute top-1/2 right-1/2 text-5xl font-bold text-purple-600/5 z-0 animate-float-slow delay-200">PRODUCT</div>
        <div className="absolute bottom-1/3 right-1/3 text-4xl font-bold text-cyan-600/5 z-0 animate-float-slow delay-900">CREATIVE</div>
        
        {/* Animated geometric shapes */}
        <div className="absolute top-1/4 right-1/4 w-32 h-32 border-2 border-violet-500/10 rounded-lg rotate-12 animate-spin-slow z-0"></div>
        <div className="absolute bottom-1/4 left-1/4 w-24 h-24 border-2 border-blue-500/10 rounded-full animate-ping-slow z-0"></div>
        <div className="absolute top-1/2 left-1/3 w-20 h-20 border-2 border-green-500/10 rotate-45 animate-pulse z-0"></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:100px_100px] z-0"></div>
        
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/50 via-zinc-950/70 to-zinc-950 z-10"></div>
        
        <div className="relative z-20 px-4 animate-float-in">
            {/* MASSIVE Lenci Logo - No Background */}
            <div className="mb-12 flex justify-center">
                <div className="hover:scale-105 transition-transform duration-500">
                    <BrandLogo width={350} height={350} src="https://i.ibb.co/rfR90C6Z/Siyada-Tech-Logo-with-Blue-and-Green-Palette.png" />
                </div>
            </div>
            
             <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-violet-200 to-blue-200 leading-tight drop-shadow-2xl">
                The End of the Photoshoot.
            </h1>
            <p className="max-w-2xl mx-auto mt-6 text-lg md:text-xl text-zinc-300 font-medium">
                Generate world-class, commercially-ready visuals for your brand—on-model, on-product, on-demand.
            </p>
            
            {/* Feature badges */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
                <span className="px-4 py-2 bg-violet-600/10 border border-violet-500/20 rounded-full text-sm text-violet-300 font-semibold backdrop-blur-sm">
                    ✨ AI-Powered
                </span>
                <span className="px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-full text-sm text-blue-300 font-semibold backdrop-blur-sm">
                    🚀 Instant Results
                </span>
                <span className="px-4 py-2 bg-green-600/10 border border-green-500/20 rounded-full text-sm text-green-300 font-semibold backdrop-blur-sm">
                    💎 Studio Quality
                </span>
            </div>
            
            <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
                <button 
                    onClick={onShowCreateUser}
                    className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2 h-14 px-10 text-base font-bold text-white rounded-xl transition-all duration-300 ease-in-out hover:scale-105 active:scale-100 shadow-2xl shadow-violet-600/20 hover:shadow-violet-600/40 bg-gradient-to-br from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 border border-violet-400/50"
                >
                    Create Your Account
                    <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                </button>
                <a href="#features" className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2 h-14 px-10 text-base font-semibold text-zinc-200 hover:text-white bg-zinc-800/50 hover:bg-zinc-800/80 rounded-xl transition-all duration-300 border border-white/10 hover:border-white/20 backdrop-blur-sm">
                    See How It Works
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </a>
            </div>
        </div>
    </section>
);


const ScrollingFeatures: React.FC = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [activeMode, setActiveMode] = useState<'apparel' | 'product'>('apparel');
    const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = parseInt(entry.target.getAttribute('data-step-index') || '0', 10);
                        setActiveStep(index);
                    }
                });
            },
            { rootMargin: '-50% 0px -50% 0px', threshold: 0 }
        );

        const currentRefs = stepRefs.current;
        currentRefs.forEach((ref) => {
            if (ref) observer.observe(ref);
        });

        return () => {
            currentRefs.forEach((ref) => {
                if (ref) observer.unobserve(ref);
            });
        };
    }, []);

    const apparelSteps = [
        { title: "Start with any apparel.", description: "Upload a flat-lay or mannequin shot. Our AI instantly understands its form, texture, and style." },
        { title: "Add your model.", description: "Bring your brand to life. Choose from our diverse library of AI models or upload your own for perfect identity preservation." },
        { title: "Direct the scene.", description: "Become the art director. Set the background, master the lighting, and define the mood with professional-grade controls." },
        { title: "Generate infinite variations.", description: "From e-commerce packshots to editorial campaigns, create a universe of on-brand visuals with a single click." }
    ];

    const productSteps = [
        { title: "Upload your product.", description: "Start with a clean product shot. Our AI analyzes it and suggests creative photoshoot concepts tailored to your item." },
        { title: "Choose your scene.", description: "Place your product in stunning environments—beaches, cafes, studios, galleries. Every setting is photorealistic and customizable." },
        { title: "Fine-tune every detail.", description: "Control camera angles, lighting, surfaces, aperture, and color grading. Get the exact look your brand demands." },
        { title: "Export commerce-ready shots.", description: "Generate single hero images or complete e-commerce packs. Add your logo, adjust props, and download instantly." }
    ];

    const apparelImages = [
        "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=1972&auto=format&fit=crop&ixlib=rb-4.0.3",
        "https://images.unsplash.com/photo-1581338834647-b0fb40704e21?q=80&w=1964&auto=format&fit=crop&ixlib=rb-4.0.3",
        "https://images.unsplash.com/photo-1551232864-3f0890e58e3b?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3",
        "https://images.unsplash.com/photo-1545291730-faff8ca1d4b0?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3",
    ];

    const productImages = [
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1999&auto=format&fit=crop&ixlib=rb-4.0.3",
        "https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=1780&auto=format&fit=crop&ixlib=rb-4.0.3",
        "https://images.unsplash.com/photo-1560343090-f0409e92791a?q=80&w=1964&auto=format&fit=crop&ixlib=rb-4.0.3",
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.0.3",
    ];

    const steps = activeMode === 'apparel' ? apparelSteps : productSteps;
    const images = activeMode === 'apparel' ? apparelImages : productImages;

    return (
        <section id="features" className="relative py-20 sm:py-32 bg-zinc-950 overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-20 right-10 w-72 h-72 bg-violet-600/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 left-10 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            
            {/* Floating geometric shapes */}
            <div className="absolute top-1/4 left-10 w-16 h-16 border border-violet-500/10 rotate-45 animate-spin-slow"></div>
            <div className="absolute bottom-1/3 right-20 w-12 h-12 border border-blue-500/10 rounded-full animate-ping-slow"></div>
            
            <div className="relative max-w-6xl mx-auto px-4">
                {/* Mode Switcher */}
                <div className="flex justify-center mb-12">
                    <div className="inline-flex p-1.5 bg-zinc-900 rounded-full border border-white/10">
                        <button
                            onClick={() => setActiveMode('apparel')}
                            className={`px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 ${
                                activeMode === 'apparel'
                                    ? 'bg-violet-600 text-white shadow-lg'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            👕 Apparel Photoshoot
                        </button>
                        <button
                            onClick={() => setActiveMode('product')}
                            className={`px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 ${
                                activeMode === 'product'
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            📦 Product Photography
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-16 md:gap-24">
                    <div className="md:sticky top-0 h-screen max-h-[700px] flex items-center">
                        <div className="relative w-full aspect-[4/3] rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
                            {images.map((src, index) => (
                                <img
                                    key={src}
                                    src={src}
                                    alt={`${activeMode} feature step ${index + 1}`}
                                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${activeStep === index ? 'opacity-100' : 'opacity-0'}`}
                                />
                            ))}
                            {/* Mode indicator badge */}
                            <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full border border-white/20 text-xs font-semibold text-white">
                                {activeMode === 'apparel' ? '👕 Apparel Mode' : '📦 Product Mode'}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center">
                        <div className="space-y-32">
                            {steps.map((step, index) => (
                                <div key={`${activeMode}-${index}`} ref={el => { stepRefs.current[index] = el; }} data-step-index={index} className="min-h-[25vh]">
                                    <h3 className="text-3xl sm:text-4xl font-bold text-white transition-opacity duration-500">{step.title}</h3>
                                    <p className="mt-4 text-lg text-zinc-400 transition-opacity duration-500">{step.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};


const HowItWorksSection: React.FC = () => (
    <section id="how-it-works" className="py-20 sm:py-28 px-4 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-4xl sm:text-5xl font-bold text-white">Two Powerful Studios. One Workflow.</h2>
                <p className="max-w-2xl mx-auto mt-4 text-lg text-zinc-400">
                    Whether you're shooting apparel or products, the process is simple, fast, and professional.
                </p>
            </div>
            
            {/* Apparel Studio */}
            <div className="mb-16 p-8 bg-gradient-to-br from-violet-500/5 to-purple-500/5 rounded-3xl border border-violet-500/20">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-violet-600 rounded-xl">
                        <Shirt size={24} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Apparel Studio (Virtual Try-On)</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="p-6 bg-zinc-900/50 rounded-xl border border-white/10">
                        <div className="text-2xl font-bold text-violet-400 mb-2">1.</div>
                        <h4 className="font-bold text-lg text-white mb-2">Upload Model & Apparel</h4>
                        <p className="text-zinc-400 text-sm">Add your model (or choose from our library) and upload clothing items. AI detects apparel type automatically.</p>
                    </div>
                    <div className="p-6 bg-zinc-900/50 rounded-xl border border-white/10">
                        <div className="text-2xl font-bold text-violet-400 mb-2">2.</div>
                        <h4 className="font-bold text-lg text-white mb-2">Set Scene & Style</h4>
                        <p className="text-zinc-400 text-sm">Choose backgrounds, lighting, camera angles, and expressions. AI Art Director suggests concepts that preserve face identity.</p>
                    </div>
                    <div className="p-6 bg-zinc-900/50 rounded-xl border border-white/10">
                        <div className="text-2xl font-bold text-violet-400 mb-2">3.</div>
                        <h4 className="font-bold text-lg text-white mb-2">Generate & Export</h4>
                        <p className="text-zinc-400 text-sm">Create 1-4 images at once. Add logo overlays, apply color grades, and download commerce-ready visuals.</p>
                    </div>
                </div>
            </div>

            {/* Product Studio */}
            <div className="p-8 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-3xl border border-blue-500/20">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-600 rounded-xl">
                        <Package size={24} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Product Studio (AI Product Shoot)</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="p-6 bg-zinc-900/50 rounded-xl border border-white/10">
                        <div className="text-2xl font-bold text-blue-400 mb-2">1.</div>
                        <h4 className="font-bold text-lg text-white mb-2">Upload Product</h4>
                        <p className="text-zinc-400 text-sm">Upload your product on a clean background. AI analyzes it and suggests 6 creative photoshoot concepts instantly.</p>
                    </div>
                    <div className="p-6 bg-zinc-900/50 rounded-xl border border-white/10">
                        <div className="text-2xl font-bold text-blue-400 mb-2">2.</div>
                        <h4 className="font-bold text-lg text-white mb-2">Design Your Scene</h4>
                        <p className="text-zinc-400 text-sm">Place products in realistic environments (beach, cafe, studio). Control camera, lighting, surfaces, aperture, and color.</p>
                    </div>
                    <div className="p-6 bg-zinc-900/50 rounded-xl border border-white/10">
                        <div className="text-2xl font-bold text-blue-400 mb-2">3.</div>
                        <h4 className="font-bold text-lg text-white mb-2">Create & Download</h4>
                        <p className="text-zinc-400 text-sm">Generate multiple angles, add props with AI assistance, overlay your brand logo, and export e-commerce packs.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

const GuidedToursSection: React.FC = () => {
    return (
        <section className="relative py-20 sm:py-24 px-4 bg-gradient-to-b from-black via-zinc-950 to-black overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute top-1/2 left-10 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute top-1/3 right-10 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            
            {/* Decorative shapes */}
            <div className="absolute top-20 right-1/4 w-20 h-20 border-2 border-violet-500/10 rounded-lg rotate-12 animate-spin-slow"></div>
            <div className="absolute bottom-20 left-1/4 w-16 h-16 border-2 border-blue-500/10 rounded-full animate-pulse"></div>
            
            <div className="relative max-w-5xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white">New to Lenci?</h2>
                    <p className="max-w-2xl mx-auto mt-3 text-lg text-zinc-400">Take an interactive tour and learn how to create stunning visuals in minutes.</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Apparel Tour */}
                    <div className="group relative p-8 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 hover:border-violet-500/40 transition-all duration-300 hover:scale-105">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/0 to-violet-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative">
                            <div className="inline-flex p-4 bg-violet-600/20 rounded-xl mb-4">
                                <Shirt size={32} className="text-violet-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Apparel Virtual Try-On</h3>
                            <p className="text-zinc-400 mb-6">Learn how to create professional model photoshoots with face-preserving AI technology.</p>
                            <button
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent('startStudioGuide', { detail: { flow: 'apparel' } }));
                                }}
                                className="group/btn w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold border border-violet-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/30"
                            >
                                <Wand2 size={18} />
                                Start Apparel Tour
                                <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                            </button>
                        </div>
                    </div>

                    {/* Product Tour */}
                    <div className="group relative p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-105">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-blue-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative">
                            <div className="inline-flex p-4 bg-blue-600/20 rounded-xl mb-4">
                                <Package size={32} className="text-blue-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Product Photography</h3>
                            <p className="text-zinc-400 mb-6">Discover how to create stunning product shots with AI-powered scene generation and styling.</p>
                            <button
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent('startStudioGuide', { detail: { flow: 'product' } }));
                                }}
                                className="group/btn w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold border border-blue-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30"
                            >
                                <Wand2 size={18} />
                                Start Product Tour
                                <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};


const FAQItem: React.FC<{ q: string, a: string }> = ({ q, a }) => {
    return (
        <details className="group border-b border-zinc-800 py-4">
            <summary className="flex justify-between items-center text-left cursor-pointer list-none">
                <h4 className="text-lg font-medium text-zinc-100">{q}</h4>
                <div className="relative w-6 h-6 flex items-center justify-center transition-transform duration-300 group-open:rotate-45">
                   <span className="absolute h-px w-4 bg-zinc-400"></span>
                   <span className="absolute h-px w-4 bg-zinc-400 rotate-90"></span>
                </div>
            </summary>
            <p className="mt-4 text-zinc-400 leading-relaxed animate-fade-in">{a}</p>
        </details>
    );
};


const FAQSection: React.FC = () => (
    <section id="faq" className="relative py-20 sm:py-28 px-4 bg-black overflow-hidden">
        {/* Background graphics */}
        <div className="absolute top-10 left-10 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        <div className="relative max-w-3xl mx-auto">
             <div className="text-center">
                <div className="inline-block mb-4">
                    <span className="px-4 py-2 bg-gradient-to-r from-violet-600/20 to-blue-600/20 border border-violet-500/30 rounded-full text-sm font-semibold text-violet-300 backdrop-blur-sm">
                        💬 Got Questions?
                    </span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white">Frequently Asked Questions</h2>
            </div>
            <div className="mt-12">
                <FAQItem 
                    q="What is the AI Virtual Photoshoot Studio?" 
                    a="It's an all-in-one platform that uses generative AI to create high-quality, professional photos for your brand. You can generate on-model photos for apparel, place products in virtual scenes, and create realistic design mockups without needing a physical studio, cameras, or models."
                />
                <FAQItem 
                    q="Can I use the generated images commercially?" 
                    a="Yes, all images you generate with your subscription can be used for any commercial purpose, including e-commerce stores, marketing campaigns, social media, and advertising."
                />
                 <FAQItem 
                    q="Can I use my own models or products?" 
                    a="Absolutely. The 'Apparel' mode is designed for you to upload a photo of your own model for a true-to-brand virtual try-on experience. Similarly, 'Product' and 'Design' modes start with you uploading your own product or apparel mockup."
                />
                  <FAQItem 
                    q="How realistic are the results?" 
                    a="Our platform is powered by a state-of-the-art AI model fine-tuned for photorealism. It excels at creating natural lighting, shadows, fabric textures, and preserving human identity, resulting in images that are often indistinguishable from real photos."
                />
            </div>
        </div>
    </section>
);

const Footer: React.FC<{ onShowCreateUser: () => void }> = ({ onShowCreateUser }) => (
    <footer className="relative bg-zinc-950 px-4 sm:px-6 py-16 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-t from-violet-950/20 to-transparent"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        {/* Floating icons */}
        <div className="absolute top-10 left-10 text-4xl opacity-10 animate-float-slow">✨</div>
        <div className="absolute top-20 right-20 text-3xl opacity-10 animate-float-slow" style={{ animationDelay: '0.5s' }}>🚀</div>
        <div className="absolute bottom-20 left-1/3 text-3xl opacity-10 animate-float-slow" style={{ animationDelay: '1s' }}>💎</div>
        <div className="absolute bottom-10 right-1/3 text-4xl opacity-10 animate-float-slow" style={{ animationDelay: '1.5s' }}>🎨</div>
        
        <div className="relative max-w-6xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-blue-200">
                Ready to change how you create?
            </h2>
            <p className="max-w-xl mx-auto mt-4 text-lg text-zinc-400">
                Stop shooting, start creating. Join the brands building the future of visual content with Lenci.
            </p>
             <div className="mt-10">
                <button 
                    onClick={onShowCreateUser}
                    className="group relative inline-flex items-center justify-center gap-2 h-12 px-8 text-base font-semibold text-white rounded-lg transition-all duration-300 ease-in-out hover:scale-105 active:scale-100 shadow-button-glow-pro hover:shadow-button-glow-pro-hover bg-gradient-to-br from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 border border-violet-400/50"
                >
                    Get Started for Free
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </button>
            </div>
        </div>
         <div className="max-w-6xl mx-auto mt-24 border-t border-zinc-800 pt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-zinc-500">
            <p>&copy; {new Date().getFullYear()} Lenci. All rights reserved.</p>
            <div className="flex items-center space-x-6 mt-4 sm:mt-0">
                 <a href="#" className="hover:text-zinc-300 transition-colors">Terms</a>
                 <a href="#" className="hover:text-zinc-300 transition-colors">Privacy</a>
            </div>
        </div>
    </footer>
);


export const LandingPage: React.FC = () => {
    const [showCreateUser, setShowCreateUser] = useState(false);
    
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                }
            });
        }, { threshold: 0.1 });

        const elements = document.querySelectorAll('.animate-fade-in, .animate-slide-up');
        elements.forEach(el => observer.observe(el));

        const currentElements = Array.from(elements);
        return () => currentElements.forEach(el => {
            if (el) observer.unobserve(el);
        });
    }, []);
    
    return (
        <div className="bg-black text-zinc-100 font-sans antialiased">
            <Header onShowCreateUser={() => setShowCreateUser(true)} />
            <main>
                <HeroSection onShowCreateUser={() => setShowCreateUser(true)} />
                <WhyLenciSection />
                <ScrollingFeatures />
                <HowItWorksSection />
                <GuidedToursSection />
                <FAQSection />
            </main>
            <Footer onShowCreateUser={() => setShowCreateUser(true)} />
            
            {/* Create User Modal */}
            {showCreateUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="relative">
                        <button
                            onClick={() => setShowCreateUser(false)}
                            className="absolute -top-4 -right-4 w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                        >
                            ×
                        </button>
                        <CreateUserForm 
                            onUserCreated={(user) => {
                                console.log('User created:', user);
                                setShowCreateUser(false);
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
