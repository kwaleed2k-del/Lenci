export type Ratio = 'square' | 'portrait' | 'landscape';

export interface BaseItem {
  id: string;                // stable id
  src: string;               // URL or /public path
  alt: string;
  ratio?: Ratio;             // default 'square'
  tags?: string[];           // e.g., ['model','arab','beard']
}

export interface FashionModelItem extends BaseItem {
  kind: 'model';             // people only (no products)
}

export interface ProductItem extends BaseItem {
  kind: 'product';
  groupId?: string | null;   // for showing 3–4 variants of the SAME product (used later)
  variant?: string | null;   // e.g., 'front','angled','in-situ','packshot'
}

export interface AiModelItem extends BaseItem {
  kind: 'model';
  name: string;              // Model name for display
  category: string;           // Category description
  gradient: string;           // Tailwind gradient classes (e.g., "from-amber-500 to-orange-600")
  ethnicityHint?: 'arab' | 'ksa' | 'mena' | 'other';
  beard?: boolean;
}

// Fashion Models (Apparel Showcase Section)
// These are models wearing apparel - from ApparelShowcaseSection
export const fashionModels: FashionModelItem[] = [
  {
    id: 'fashion-1',
    kind: 'model',
    src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=1067&fit=crop',
    alt: 'Model in apparel - Lenci Generated',
    ratio: 'portrait',
    tags: ['model', 'apparel']
  },
  {
    id: 'fashion-2',
    kind: 'model',
    src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&h=1067&fit=crop',
    alt: 'Model in apparel - Lenci Generated',
    ratio: 'portrait',
    tags: ['model', 'apparel']
  },
  {
    id: 'fashion-3',
    kind: 'model',
    src: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&h=1067&fit=crop',
    alt: 'Model in apparel - Lenci Generated',
    ratio: 'portrait',
    tags: ['model', 'apparel']
  },
  {
    id: 'fashion-4',
    kind: 'model',
    src: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&h=1067&fit=crop',
    alt: 'Model in apparel - Lenci Generated',
    ratio: 'portrait',
    tags: ['model', 'apparel']
  },
  {
    id: 'fashion-5',
    kind: 'model',
    src: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&h=1000&fit=crop',
    alt: 'Model in apparel - Lenci Generated',
    ratio: 'portrait',
    tags: ['model', 'apparel']
  },
  {
    id: 'fashion-6',
    kind: 'model',
    src: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&h=1000&fit=crop',
    alt: 'Model in apparel - Lenci Generated',
    ratio: 'portrait',
    tags: ['model', 'apparel']
  },
  {
    id: 'fashion-7',
    kind: 'model',
    src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=1000&fit=crop',
    alt: 'Model in apparel - Lenci Generated',
    ratio: 'portrait',
    tags: ['model', 'apparel']
  },
  {
    id: 'fashion-8',
    kind: 'model',
    src: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=900&h=1200&fit=crop',
    alt: 'Model in apparel - Lenci Generated',
    ratio: 'portrait',
    tags: ['model', 'apparel']
  },
  {
    id: 'fashion-9',
    kind: 'model',
    src: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&h=1200&fit=crop',
    alt: 'Model in apparel - Lenci Generated',
    ratio: 'portrait',
    tags: ['model', 'apparel']
  }
];

// Product Showcase (Product Photography Section)
// These are product images - from ProductShowcaseSection
export const productShowcase: ProductItem[] = [
  {
    id: 'product-1',
    kind: 'product',
    src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop',
    alt: 'Lenci Product',
    ratio: 'square',
    tags: ['product']
  },
  {
    id: 'product-2',
    kind: 'product',
    src: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
    alt: 'Lenci Product',
    ratio: 'square',
    tags: ['product']
  },
  {
    id: 'product-3',
    kind: 'product',
    src: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop',
    alt: 'Lenci Product',
    ratio: 'square',
    tags: ['product']
  },
  {
    id: 'product-4',
    kind: 'product',
    src: 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&h=800&fit=crop',
    alt: 'Lenci Product',
    ratio: 'square',
    tags: ['product']
  },
  {
    id: 'product-5',
    kind: 'product',
    src: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=1000&fit=crop',
    alt: 'Lenci Product',
    ratio: 'portrait',
    tags: ['product']
  },
  {
    id: 'product-6',
    kind: 'product',
    src: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&h=1000&fit=crop',
    alt: 'Lenci Product',
    ratio: 'portrait',
    tags: ['product']
  },
  {
    id: 'product-7',
    kind: 'product',
    src: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&h=1000&fit=crop',
    alt: 'Lenci Product',
    ratio: 'portrait',
    tags: ['product']
  },
  {
    id: 'product-8',
    kind: 'product',
    src: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=1000&h=1000&fit=crop',
    alt: 'Lenci Product',
    ratio: 'square',
    tags: ['product']
  },
  {
    id: 'product-9',
    kind: 'product',
    src: 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=1000&h=1000&fit=crop',
    alt: 'Lenci Product',
    ratio: 'square',
    tags: ['product']
  }
];

// AI Models (Meet Our AI Models Section)
// These are the AI model cards - from AIModelsSection
export const aiModels: AiModelItem[] = [
  {
    id: 'ai-model-1',
    kind: 'model',
    name: 'Layla Al-Rahman',
    category: 'Arabian Elegance',
    gradient: 'from-amber-500 to-orange-600',
    src: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&h=1067&fit=crop',
    alt: 'Layla Al-Rahman - Arabian Elegance',
    ratio: 'portrait',
    tags: ['Arabian', 'Elegant', 'Luxury'],
    ethnicityHint: 'arab'
  },
  {
    id: 'ai-model-2',
    kind: 'model',
    name: 'Omar Hassan',
    category: 'Middle Eastern Fashion',
    gradient: 'from-blue-500 to-cyan-600',
    src: 'https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?q=80&w=800&auto=format&fit=crop',
    alt: 'Omar Hassan - Middle Eastern Fashion',
    ratio: 'portrait',
    tags: ['Arabian', 'Contemporary', 'Style'],
    ethnicityHint: 'mena',
    beard: true
  },
  {
    id: 'ai-model-3',
    kind: 'model',
    name: 'Sophia Chen',
    category: 'Fashion & Editorial',
    gradient: 'from-rose-500 to-pink-600',
    src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800&auto=format&fit=crop',
    alt: 'Sophia Chen - Fashion & Editorial',
    ratio: 'portrait',
    tags: ['Editorial', 'Luxury', 'High Fashion'],
    ethnicityHint: 'other'
  },
  {
    id: 'ai-model-4',
    kind: 'model',
    name: 'Yasmin Al-Farsi',
    category: 'Arabian Couture',
    gradient: 'from-purple-500 to-indigo-600',
    src: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=800&auto=format&fit=crop',
    alt: 'Yasmin Al-Farsi - Arabian Couture',
    ratio: 'portrait',
    tags: ['Arabian', 'Couture', 'Glamour'],
    ethnicityHint: 'arab'
  },
  {
    id: 'ai-model-5',
    kind: 'model',
    name: 'Marcus Johnson',
    category: 'Urban & Streetwear',
    gradient: 'from-emerald-500 to-teal-600',
    src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop',
    alt: 'Marcus Johnson - Urban & Streetwear',
    ratio: 'portrait',
    tags: ['Street Style', 'Casual', 'Urban'],
    ethnicityHint: 'other'
  },
  {
    id: 'ai-model-6',
    kind: 'model',
    name: 'Khalid Al-Maktoum',
    category: 'Arabian Heritage',
    gradient: 'from-orange-500 to-yellow-600',
    src: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop',
    alt: 'Khalid Al-Maktoum - Arabian Heritage',
    ratio: 'portrait',
    tags: ['Arabian', 'Traditional', 'Modern'],
    ethnicityHint: 'ksa',
    beard: true
  },
  {
    id: 'ai-model-7',
    kind: 'model',
    name: 'Fatima Al-Sayed',
    category: 'Arabian Modest Fashion',
    gradient: 'from-teal-500 to-emerald-600',
    src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop',
    alt: 'Fatima Al-Sayed - Arabian Modest Fashion',
    ratio: 'portrait',
    tags: ['Arabian', 'Modest', 'Contemporary'],
    ethnicityHint: 'arab'
  },
  {
    id: 'ai-model-8',
    kind: 'model',
    name: 'Isabella Rodriguez',
    category: 'Latin Fashion',
    gradient: 'from-red-500 to-pink-600',
    src: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=800&auto=format&fit=crop',
    alt: 'Isabella Rodriguez - Latin Fashion',
    ratio: 'portrait',
    tags: ['Latin', 'Vibrant', 'Bold'],
    ethnicityHint: 'other'
  },
  {
    id: 'ai-model-9',
    kind: 'model',
    name: 'Ahmed Al-Nasser',
    category: 'Arabian Executive',
    gradient: 'from-slate-500 to-blue-600',
    src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop',
    alt: 'Ahmed Al-Nasser - Arabian Executive',
    ratio: 'portrait',
    tags: ['Arabian', 'Business', 'Professional'],
    ethnicityHint: 'arab',
    beard: true
  },
  {
    id: 'ai-model-10',
    kind: 'model',
    name: 'Priya Sharma',
    category: 'South Asian Fashion',
    gradient: 'from-pink-500 to-purple-600',
    src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=800&auto=format&fit=crop',
    alt: 'Priya Sharma - South Asian Fashion',
    ratio: 'portrait',
    tags: ['South Asian', 'Traditional', 'Elegant'],
    ethnicityHint: 'other'
  },
  {
    id: 'ai-model-11',
    kind: 'model',
    name: 'Zara Al-Hashimi',
    category: 'Arabian Luxury',
    gradient: 'from-gold-500 to-yellow-600',
    src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop',
    alt: 'Zara Al-Hashimi - Arabian Luxury',
    ratio: 'portrait',
    tags: ['Arabian', 'Luxury', 'High-End'],
    ethnicityHint: 'arab'
  },
  {
    id: 'ai-model-12',
    kind: 'model',
    name: 'James Parker',
    category: 'Menswear & Suiting',
    gradient: 'from-gray-500 to-slate-600',
    src: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=800&auto=format&fit=crop',
    alt: 'James Parker - Menswear & Suiting',
    ratio: 'portrait',
    tags: ['Formal', 'Suiting', 'Classic'],
    ethnicityHint: 'other'
  },
  {
    id: 'ai-model-13',
    kind: 'model',
    name: 'Mariam Al-Kuwari',
    category: 'Arabian Bridal',
    gradient: 'from-rose-400 to-pink-500',
    src: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=800&auto=format&fit=crop',
    alt: 'Mariam Al-Kuwari - Arabian Bridal',
    ratio: 'portrait',
    tags: ['Arabian', 'Bridal', 'Glamour'],
    ethnicityHint: 'arab'
  },
  {
    id: 'ai-model-14',
    kind: 'model',
    name: 'Kenji Tanaka',
    category: 'Asian Contemporary',
    gradient: 'from-indigo-500 to-purple-600',
    src: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=800&auto=format&fit=crop',
    alt: 'Kenji Tanaka - Asian Contemporary',
    ratio: 'portrait',
    tags: ['Asian', 'Minimalist', 'Modern'],
    ethnicityHint: 'other'
  },
  {
    id: 'ai-model-15',
    kind: 'model',
    name: 'Noor Al-Qassimi',
    category: 'Arabian Sports & Active',
    gradient: 'from-green-500 to-teal-600',
    src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop',
    alt: 'Noor Al-Qassimi - Arabian Sports & Active',
    ratio: 'portrait',
    tags: ['Arabian', 'Athletic', 'Active'],
    ethnicityHint: 'arab'
  },
  {
    id: 'ai-model-16',
    kind: 'model',
    name: 'Emma Thompson',
    category: 'European Chic',
    gradient: 'from-violet-500 to-purple-600',
    src: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=800&auto=format&fit=crop',
    alt: 'Emma Thompson - European Chic',
    ratio: 'portrait',
    tags: ['European', 'Chic', 'Sophisticated'],
    ethnicityHint: 'other'
  },
  {
    id: 'ai-model-17',
    kind: 'model',
    name: 'Hassan Al-Bader',
    category: 'Arabian Streetwear',
    gradient: 'from-orange-500 to-red-600',
    src: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=800&auto=format&fit=crop',
    alt: 'Hassan Al-Bader - Arabian Streetwear',
    ratio: 'portrait',
    tags: ['Arabian', 'Street', 'Urban'],
    ethnicityHint: 'arab',
    beard: true
  },
  {
    id: 'ai-model-18',
    kind: 'model',
    name: 'Aisha Abdullah',
    category: 'Arabian Youth Fashion',
    gradient: 'from-cyan-500 to-blue-600',
    src: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=800&auto=format&fit=crop',
    alt: 'Aisha Abdullah - Arabian Youth Fashion',
    ratio: 'portrait',
    tags: ['Arabian', 'Youth', 'Trendy'],
    ethnicityHint: 'arab'
  },
  {
    id: 'ai-model-19',
    kind: 'model',
    name: 'Lucas Silva',
    category: 'Fitness & Athleisure',
    gradient: 'from-lime-500 to-green-600',
    src: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?q=80&w=800&auto=format&fit=crop',
    alt: 'Lucas Silva - Fitness & Athleisure',
    ratio: 'portrait',
    tags: ['Fitness', 'Athletic', 'Sporty'],
    ethnicityHint: 'other'
  },
  {
    id: 'ai-model-20',
    kind: 'model',
    name: 'Salma Al-Mansoori',
    category: 'Arabian Business',
    gradient: 'from-blue-500 to-indigo-600',
    src: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800&auto=format&fit=crop',
    alt: 'Salma Al-Mansoori - Arabian Business',
    ratio: 'portrait',
    tags: ['Arabian', 'Business', 'Corporate'],
    ethnicityHint: 'arab'
  },
  {
    id: 'ai-model-21',
    kind: 'model',
    name: 'David Kim',
    category: 'K-Fashion',
    gradient: 'from-fuchsia-500 to-pink-600',
    src: 'https://images.unsplash.com/photo-1463453091185-61582044d556?q=80&w=800&auto=format&fit=crop',
    alt: 'David Kim - K-Fashion',
    ratio: 'portrait',
    tags: ['Korean', 'Trendy', 'Street'],
    ethnicityHint: 'other'
  },
  {
    id: 'ai-model-22',
    kind: 'model',
    name: 'Rania Al-Thani',
    category: 'Arabian Evening Wear',
    gradient: 'from-purple-500 to-pink-600',
    src: 'https://images.unsplash.com/photo-1479936343636-73cdc5aae0c3?q=80&w=800&auto=format&fit=crop',
    alt: 'Rania Al-Thani - Arabian Evening Wear',
    ratio: 'portrait',
    tags: ['Arabian', 'Evening', 'Elegant'],
    ethnicityHint: 'arab'
  },
  {
    id: 'ai-model-23',
    kind: 'model',
    name: 'Andre Williams',
    category: 'Plus Size Fashion',
    gradient: 'from-amber-500 to-orange-600',
    src: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?q=80&w=800&auto=format&fit=crop',
    alt: 'Andre Williams - Plus Size Fashion',
    ratio: 'portrait',
    tags: ['Plus Size', 'Inclusive', 'Confident'],
    ethnicityHint: 'other'
  },
  {
    id: 'ai-model-24',
    kind: 'model',
    name: 'Sara Al-Jaber',
    category: 'Arabian Casual',
    gradient: 'from-sky-500 to-cyan-600',
    src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800&auto=format&fit=crop',
    alt: 'Sara Al-Jaber - Arabian Casual',
    ratio: 'portrait',
    tags: ['Arabian', 'Casual', 'Everyday'],
    ethnicityHint: 'arab'
  },
  {
    id: 'ai-model-25',
    kind: 'model',
    name: 'Nina Petrov',
    category: 'Avant-Garde',
    gradient: 'from-red-500 to-orange-600',
    src: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?q=80&w=800&auto=format&fit=crop',
    alt: 'Nina Petrov - Avant-Garde',
    ratio: 'portrait',
    tags: ['Avant-Garde', 'Artistic', 'Bold'],
    ethnicityHint: 'other'
  }
];


