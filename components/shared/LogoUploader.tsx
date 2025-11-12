import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Image as ImageIcon, X } from 'lucide-react';

interface LogoUploaderProps {
  logo: string | null;
  onLogoChange: (base64: string | null) => void;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  onPositionChange: (position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center') => void;
  size: number;
  onSizeChange: (size: number) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
}

export const LogoUploader: React.FC<LogoUploaderProps> = ({
  logo,
  onLogoChange,
  position,
  onPositionChange,
  size,
  onSizeChange,
  opacity,
  onOpacityChange,
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        if (event.target?.result) {
          onLogoChange(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onLogoChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.webp'] },
    multiple: false,
  });

  const positions: Array<{ value: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'; label: string }> = [
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'center', label: 'Center' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100">Brand Logo Overlay</h3>
      </div>

      {!logo ? (
        <div {...getRootProps()} className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all duration-200 ${isDragActive ? 'border-violet-500 bg-violet-500/10 shadow-glow-md' : 'border-zinc-700 hover:border-zinc-600'}`}>
          <input {...getInputProps()} />
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${isDragActive ? 'bg-violet-500/20' : 'bg-zinc-800'}`}>
            <ImageIcon className={`transition-colors ${isDragActive ? 'text-violet-300' : 'text-zinc-400'}`} size={24} />
          </div>
          <p className="text-zinc-100 font-semibold text-center">
            {isDragActive ? "Drop logo here" : "Upload Brand Logo"}
          </p>
          <p className="text-xs text-zinc-400 mt-1">PNG, SVG, JPG (transparent PNG recommended)</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative group rounded-lg overflow-hidden border-2 border-violet-500/50 shadow-lg shadow-violet-900/30 bg-zinc-900 p-4 flex items-center justify-center" style={{ minHeight: '120px' }}>
            <img src={logo} alt="Brand logo" className="max-h-24 max-w-full object-contain" style={{ opacity: opacity / 100 }} />
            <button 
              onClick={() => onLogoChange(null)}
              className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-500 text-white p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
              aria-label="Remove logo"
            >
              <X size={16} />
            </button>
          </div>

          {/* Position Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300">Logo Position</label>
            <div className="grid grid-cols-3 gap-2">
              {positions.map((pos) => (
                <button
                  key={pos.value}
                  onClick={() => onPositionChange(pos.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    position === pos.value
                      ? 'bg-violet-600 text-white shadow-glow-sm'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300">Logo Size</label>
              <span className="text-xs font-semibold text-violet-400">{size}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="25"
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider-thumb"
            />
          </div>

          {/* Opacity Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300">Logo Opacity</label>
              <span className="text-xs font-semibold text-violet-400">{opacity}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={opacity}
              onChange={(e) => onOpacityChange(Number(e.target.value))}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider-thumb"
            />
          </div>
        </div>
      )}
    </div>
  );
};

