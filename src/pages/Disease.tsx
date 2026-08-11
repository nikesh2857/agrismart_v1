import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, ShieldAlert, Store, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { apiClient } from '../lib/apiClient';

export function Disease() {
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setAnalyzing(true);
    setResult(null);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const data = await apiClient.post('/api/disease/analyze', { imageBase64: base64 });
          setResult(data);
        } catch (err: any) {
          console.error('Disease analysis error:', err);
          alert(err.message || 'Failed to analyze image.');
        } finally {
          setAnalyzing(false);
        }
      };
    } catch (err) {
      console.error(err);
      setAnalyzing(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    if (!analyzing && !result) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Upload Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-full flex flex-col">
            <div>
              <h3 className="text-xl font-semibold text-slate-800">AI Disease Diagnostics</h3>
              <p className="text-sm text-slate-500 mt-1">Upload a clear photo of the affected plant leaf.</p>
            </div>
            
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={onFileChange} 
            />

            <div 
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className={cn(
                "mt-6 flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all relative overflow-hidden group cursor-pointer",
                dragActive ? "border-green-500 bg-green-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400"
              )}
              onClick={handleClick}
            >
              {analyzing ? (
                <div className="flex flex-col items-center text-green-600">
                  <Loader2 className="w-12 h-12 animate-spin mb-4" />
                  <p className="font-medium">AI is analyzing the image...</p>
                  <p className="text-xs mt-1 text-slate-500">Checking against 10,000+ disease patterns</p>
                </div>
              ) : result ? (
                <div className="w-full h-full absolute inset-0">
                  <img src={previewUrl || "https://images.unsplash.com/photo-1590680193635-4dbb75220c3a?auto=format&fit=crop&w=800&q=80"} alt="Analyzed Leaf" className="w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full font-medium text-slate-800 shadow-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Analysis Complete
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="font-medium text-slate-700">Drag & drop image here</p>
                  <p className="text-xs text-slate-400 mt-2">or click to browse from device</p>
                </>
              )}
            </div>

            {result && (
              <button 
                onClick={() => {
                  setResult(null);
                  setPreviewUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="mt-6 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
              >
                Scan Another Image
              </button>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100"
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        "px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider",
                        result.isHealthy ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {result.isHealthy ? "Healthy" : "High Risk"}
                      </span>
                      {result.primaryDisease && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                          {Math.round(result.primaryDisease.probability * 100)}% Confidence
                        </span>
                      )}
                      {result.isHealthy && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                          {Math.round(result.healthyProbability * 100)}% Confidence
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">
                      {result.isHealthy ? 'Plant looks healthy!' : (result.primaryDisease?.name || 'Unknown Disease')}
                    </h2>
                    {result.plantName && (
                      <p className="text-green-600 font-medium mt-1 text-sm">
                        Plant: {result.plantName}
                      </p>
                    )}
                    {result.primaryDisease && !result.isHealthy && (
                      <p className="text-slate-500 italic mt-1 text-sm">
                        {result.primaryDisease.details?.description || 'Treatment required'}
                      </p>
                    )}
                  </div>
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                    result.isHealthy ? "bg-green-50" : "bg-red-50"
                  )}>
                    {result.isHealthy ? (
                       <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                       <ShieldAlert className="w-6 h-6 text-red-500" />
                    )}
                  </div>
                </div>

                {!result.isHealthy && result.primaryDisease && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-2">Possible Recommendations</h4>
                      <ul className="space-y-3">
                        <li className="flex gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0 font-bold text-xs">1</div>
                          <p>{result.primaryDisease.details?.treatment?.chemical?.[0] || 'Apply appropriate fungicides immediately.'}</p>
                        </li>
                        <li className="flex gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0 font-bold text-xs">2</div>
                          <p>{result.primaryDisease.details?.treatment?.biological?.[0] || 'Remove and destroy severely infected leaves.'}</p>
                        </li>
                        <li className="flex gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0 font-bold text-xs">3</div>
                          <p>{result.primaryDisease.details?.treatment?.prevention?.[0] || 'Avoid overhead irrigation; water at the base of the plants.'}</p>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {result.isHealthy && (
                  <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-green-800">
                    Your crop shows no obvious signs of disease. Continue standard care!
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="bg-slate-100 rounded-3xl p-8 border border-slate-200 h-full flex flex-col items-center justify-center text-center">
                <ShieldAlert className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-500">Awaiting Image</h3>
                <p className="text-sm text-slate-400 max-w-xs mt-2">Upload an image of your crop to receive an AI-powered diagnostic report.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
