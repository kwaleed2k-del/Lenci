import React, { useState, useEffect } from 'react';
import { User, Shirt, X, Package, Layers, Video, Film } from 'lucide-react';
import { ModelSelectionPanel } from '../model/ModelSelectionPanel';
import { ApparelUploader } from '../apparel/ApparelUploader';
import { TabButton } from './TabButton';
import { useStudio } from '../../context/StudioContext';
import { ProductUploader } from '../product/ProductUploader';
import { PropsPanel } from '../product/PropsPanel';
import { VideoSourceUploader } from '../video/VideoSourceUploader';
import { VideoAnimationPanel } from '../video/VideoAnimationPanel';

type Tab = 'model' | 'apparel' | 'product' | 'props' | 'video' | 'animation';

interface InputPanelProps {
    onClose: () => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({ onClose }) => {
    const { studioMode } = useStudio();
    const [activeTab, setActiveTab] = useState<Tab>('model');

    useEffect(() => {
        if (studioMode === 'apparel') {
            setActiveTab('model');
        } else if (studioMode === 'product') {
            setActiveTab('product');
        } else if (studioMode === 'video') {
            setActiveTab('video');
        }
    }, [studioMode]);


    const renderTabs = () => {
        switch (studioMode) {
            case 'apparel':
                return (
                    <>
                        <TabButton tabId="model" activeTab={activeTab} onClick={(tab) => setActiveTab(tab)} icon={<User size={16} />} label="Model" />
                        <TabButton tabId="apparel" activeTab={activeTab} onClick={(tab) => setActiveTab(tab)} icon={<Shirt size={16} />} label="Apparel" />
                    </>
                );
            case 'product':
                return (
                    <>
                        <TabButton tabId="product" activeTab={activeTab} onClick={(tab) => setActiveTab(tab)} icon={<Package size={16} />} label="Product" />
                        <TabButton tabId="props" activeTab={activeTab} onClick={(tab) => setActiveTab(tab)} icon={<Layers size={16} />} label="Props" />
                    </>
                );
            case 'video':
                return (
                    <>
                        <TabButton tabId="video" activeTab={activeTab} onClick={(tab) => setActiveTab(tab)} icon={<Film size={16} />} label="Source Image" />
                        <TabButton tabId="animation" activeTab={activeTab} onClick={(tab) => setActiveTab(tab)} icon={<Video size={16} />} label="Animation" />
                    </>
                );
            default:
                return null;
        }
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'model': return <ModelSelectionPanel />;
            case 'apparel': return <ApparelUploader />;
            case 'product': return <ProductUploader />;
            case 'props': return <PropsPanel />;
            case 'video': return <VideoSourceUploader />;
            case 'animation': return <VideoAnimationPanel />;
            default: return null;
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 p-4 border-b border-white/10 flex justify-between items-center">
                 <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                    Inputs
                 </h2>
                 <button onClick={onClose} className="p-1 -m-1 text-zinc-400 hover:text-white lg:hidden">
                    <X size={24} />
                </button>
            </div>
            <div className="flex-grow p-4 min-h-0 flex flex-col">
                <div id="input-panel-tabs" className="flex-shrink-0 bg-zinc-900 p-1.5 rounded-full flex items-center gap-1 mb-4 border border-zinc-800 shadow-inner-soft">
                    {renderTabs()}
                </div>
                <div className="flex-grow min-h-0">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
