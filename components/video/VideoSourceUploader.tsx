import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Film, X } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';

export const VideoSourceUploader: React.FC = () => {
    const { videoSourceImage, setVideoSourceImage } = useStudio();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event: ProgressEvent<FileReader>) => {
                if (event.target?.result) {
                    setVideoSourceImage(event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    }, [setVideoSourceImage]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
        multiple: false,
    });

    return (
        <div className="h-full flex flex-col">
            {!videoSourceImage ? (
                <div 
                    {...getRootProps()} 
                    className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all duration-200 ${isDragActive ? 'border-violet-500 bg-violet-500/10 shadow-glow-md' : 'border-zinc-700 hover:border-zinc-600'}`}
                >
                    <input {...getInputProps()} />
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragActive ? 'bg-violet-500/20' : 'bg-zinc-800'}`}>
                        <Film className={`transition-colors ${isDragActive ? 'text-violet-300' : 'text-zinc-400'}`} size={32} />
                    </div>
                    <p className="text-zinc-300 text-center font-semibold text-lg">
                        {isDragActive ? "Drop image here" : "Upload Source Image"}
                    </p>
                    <p className="text-sm text-zinc-500 mt-2 text-center">
                        Drop an image to animate it into a video
                    </p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col">
                    <div className="relative flex-1 rounded-lg overflow-hidden bg-zinc-900">
                        <img 
                            src={videoSourceImage} 
                            alt="Source for video" 
                            className="w-full h-full object-contain"
                        />
                        <button
                            onClick={() => setVideoSourceImage(null)}
                            className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                        >
                            <X size={16} className="text-white" />
                        </button>
                    </div>
                    <p className="text-sm text-zinc-400 mt-3 text-center">
                        Select an animation style to generate video
                    </p>
                </div>
            )}
        </div>
    );
};

