import React, { useEffect, useMemo, useState } from 'react';

interface BrandLogoProps {
    className?: string;
    width?: number;
    height?: number;
    src?: string; // optional override for logo source
    alt?: string;
}

// Simple chroma-key style background removal that samples the top-left pixel
// and makes similar colors transparent. Works well for flat background logos.
export const BrandLogo: React.FC<BrandLogoProps> = ({
    className,
    width = 28,
    height = 28,
    src = '/assets/siyada-tech.png',
    alt = 'Siyada Tech'
}) => {
    const [processedSrc, setProcessedSrc] = useState<string | null>(null);

    const tolerance = useMemo(() => 28, []); // color distance tolerance (0-441)

    useEffect(() => {
        let cancelled = false;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Sample background from top-left pixel
                const br = data[0];
                const bg = data[1];
                const bb = data[2];

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const dr = r - br;
                    const dg = g - bg;
                    const db = b - bb;
                    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
                    if (dist <= tolerance) {
                        data[i + 3] = 0; // make transparent
                    }
                }

                ctx.putImageData(imageData, 0, 0);
                const url = canvas.toDataURL('image/png');
                if (!cancelled) setProcessedSrc(url);
            } catch {
                // Fallback to original source if processing fails
                if (!cancelled) setProcessedSrc(src);
            }
        };
        img.onerror = () => {
            if (!cancelled) setProcessedSrc(src);
        };
        img.src = src;
        return () => { cancelled = true; };
    }, [src, tolerance]);

    return (
        <img
            src={processedSrc || src}
            width={width}
            height={height}
            alt={alt}
            className={className}
            style={{ display: 'inline-block' }}
        />
    );
};


