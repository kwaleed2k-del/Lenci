import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { User, X } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';

export const ModelUploader: React.FC = () => {
    const { 
        setUploadedModelImage, uploadedModelImage,
        addModelReference, removeModelReference, uploadedModelRefs = [],
        modelAttributes = {}, setModelAttributes
    } = useStudio();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            const reader = new FileReader();
            reader.onload = (event: ProgressEvent<FileReader>) => {
                if (event.target?.result) {
                    setUploadedModelImage(event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    }, [setUploadedModelImage]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
        multiple: false
    });

    const onDropRefs = useCallback((acceptedFiles: File[]) => {
        for (const file of acceptedFiles.slice(0, Math.max(0, 4 - uploadedModelRefs.length))) {
            const reader = new FileReader();
            reader.onload = (event: ProgressEvent<FileReader>) => {
                if (event.target?.result) addModelReference(event.target.result as string);
            };
            reader.readAsDataURL(file);
        }
    }, [uploadedModelRefs.length, addModelReference]);
    const { getRootProps: getRefRoot, getInputProps: getRefInput } = useDropzone({
        onDrop: onDropRefs,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
        multiple: true
    });

    if (uploadedModelImage) {
        return (
            <div className="w-full h-full animate-fade-in flex flex-col">
                <p className="text-sm font-medium text-zinc-300 mb-2 flex-shrink-0">Your Uploaded Model</p>
                 <div className="relative group flex-grow rounded-lg overflow-hidden border-2 border-violet-500/50 shadow-lg shadow-violet-900/30 bg-zinc-900 min-h-0">
                    <img src={uploadedModelImage} alt="Model preview" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <button 
                            onClick={() => setUploadedModelImage(null)}
                            className="bg-red-600/80 hover:bg-red-500 text-white p-3 rounded-full transition-all duration-200 transform scale-75 group-hover:scale-100"
                            aria-label="Remove uploaded model"
                        >
                            <X size={24} />
                        </button>
                    </div>
                 </div>

                 {/* Reference Images Uploader */}
                 <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-zinc-300">Additional Face References (up to 3)</p>
                        <span className="text-xs text-zinc-500">Use clear, frontal angles</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        {uploadedModelRefs.slice(0, 3).map((ref, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-700">
                                <img src={ref} alt={`Reference ${idx+1}`} className="w-full h-full object-cover" />
                                <button onClick={() => removeModelReference(idx)} className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white rounded-full p-1" aria-label="Remove reference">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        {uploadedModelRefs.length < 3 && (
                            <div {...getRefRoot()} className="aspect-square rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-600 flex items-center justify-center cursor-pointer">
                                <input {...getRefInput()} />
                                <span className="text-xs text-zinc-400">Add</span>
                            </div>
                        )}
                    </div>
                 </div>

                 {/* Structured Identity Attributes */}
                 <div className="mt-4 grid grid-cols-2 gap-3">
                    <input className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200" placeholder="Age (e.g., 25-30)" value={modelAttributes.age || ''} onChange={e => setModelAttributes({ age: e.target.value })} />
                    <input className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200" placeholder="Hair Type (straight/wavy/curly)" value={modelAttributes.hairType || ''} onChange={e => setModelAttributes({ hairType: e.target.value })} />
                    <input className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200" placeholder="Hair Color" value={modelAttributes.hairColor || ''} onChange={e => setModelAttributes({ hairColor: e.target.value })} />
                    <input className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200" placeholder="Skin Tone" value={modelAttributes.skinTone || ''} onChange={e => setModelAttributes({ skinTone: e.target.value })} />
                    <input className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200" placeholder="Body Type (skinny/average/athletic/plus-size)" value={modelAttributes.bodyType || ''} onChange={e => setModelAttributes({ bodyType: e.target.value })} />
                    <div className="flex gap-3">
                        <input className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200" placeholder="Height (cm)" value={modelAttributes.heightCm ?? ''} onChange={e => setModelAttributes({ heightCm: Number(e.target.value) || undefined })} />
                        <input className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200" placeholder="Weight (kg)" value={modelAttributes.weightKg ?? ''} onChange={e => setModelAttributes({ weightKg: Number(e.target.value) || undefined })} />
                    </div>
                 </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            <div {...getRootProps()} className={`flex-grow flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all duration-200 ${isDragActive ? 'border-violet-500 bg-violet-500/10 shadow-glow-md' : 'border-zinc-700 hover:border-zinc-600'}`}>
                <input {...getInputProps()} />
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragActive ? 'bg-violet-500/20' : 'bg-zinc-800'}`}>
                    <User className={`transition-colors ${isDragActive ? 'text-violet-300' : 'text-zinc-400'}`} size={32} />
                </div>
                <p className="text-zinc-100 font-semibold text-center">
                    {isDragActive ? "Drop the model image here" : "Upload Your Model"}
                </p>
                <p className="text-sm text-zinc-400 mt-1">Drag 'n' drop or click to browse</p>
            </div>
        </div>
    );
};