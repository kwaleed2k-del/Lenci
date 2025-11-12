/**
 * Overlay a logo on a base image
 * @param baseImageDataUrl - Base image as data URL
 * @param logoDataUrl - Logo image as data URL
 * @param position - Position of the logo
 * @param sizePercentage - Size of logo as percentage of image width (5-25)
 * @param opacityPercentage - Opacity of logo (0-100)
 * @returns Promise with the combined image as data URL
 */
export async function overlayLogo(
  baseImageDataUrl: string,
  logoDataUrl: string,
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center',
  sizePercentage: number,
  opacityPercentage: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Load base image
    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';
    
    baseImg.onload = () => {
      // Load logo
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      logoImg.onload = () => {
        try {
          // Create canvas
          const canvas = document.createElement('canvas');
          canvas.width = baseImg.width;
          canvas.height = baseImg.height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Draw base image first
          ctx.drawImage(baseImg, 0, 0);
          
          // Calculate logo dimensions (maintain aspect ratio)
          const logoWidth = (baseImg.width * sizePercentage) / 100;
          const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
          
          // Calculate logo position
          const padding = baseImg.width * 0.03; // 3% padding from edges
          let x = 0;
          let y = 0;
          
          switch (position) {
            case 'top-left':
              x = padding;
              y = padding;
              break;
            case 'top-right':
              x = baseImg.width - logoWidth - padding;
              y = padding;
              break;
            case 'bottom-left':
              x = padding;
              y = baseImg.height - logoHeight - padding;
              break;
            case 'bottom-right':
              x = baseImg.width - logoWidth - padding;
              y = baseImg.height - logoHeight - padding;
              break;
            case 'center':
              x = (baseImg.width - logoWidth) / 2;
              y = (baseImg.height - logoHeight) / 2;
              break;
          }
          
          // Set opacity and draw logo on top
          ctx.globalAlpha = opacityPercentage / 100;
          ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
          ctx.globalAlpha = 1.0;
          
          // Convert to data URL
          const result = canvas.toDataURL('image/png');
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      logoImg.onerror = () => reject(new Error('Failed to load logo image'));
      logoImg.src = logoDataUrl;
    };
    
    baseImg.onerror = () => reject(new Error('Failed to load base image'));
    baseImg.src = baseImageDataUrl;
  });
}

