import React, { useState, useRef, useEffect } from 'react';
import { generateAIResponse } from '../services/geminiService';
import { Message } from '../types';

export const AICoach: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Systems online. I am Stitch AI. Ready to analyze your performance.", timestamp: Date.now() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'video' && file.size > 20 * 1024 * 1024) {
        alert("Video too large. Please keep under 20MB for this demo.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        if (type === 'image') setSelectedImage(base64);
        else setSelectedVideo(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage && !selectedVideo) || isLoading) return;

    const userMsg: Message = {
      role: 'user',
      text: input,
      image: selectedImage || undefined,
      video: selectedVideo || undefined,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    
    // Clear attachments after sending
    const currentImage = selectedImage;
    const currentVideo = selectedVideo;
    setSelectedImage(null);
    setSelectedVideo(null);

    try {
      const responseText = await generateAIResponse(messages, userMsg.text || (currentVideo ? "Analyze this video" : "Analyze this image"), currentImage || undefined, currentVideo || undefined);
      
      const botMsg: Message = {
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-24 right-4 z-50 p-4 rounded-full shadow-[0_0_20px_rgba(0,209,255,0.4)] transition-all duration-300 hover:scale-110 ${isOpen ? 'bg-cyan-accent text-black rotate-90' : 'bg-surface-dark border border-cyan-accent text-cyan-accent'}`}
      >
        <span className="material-symbols-outlined text-2xl">smart_toy</span>
      </button>

      {/* Chat Interface */}
      <div className={`fixed bottom-40 right-4 w-[90vw] md:w-[400px] h-[600px] max-h-[70vh] bg-black/95 backdrop-blur-xl border border-cyan-accent/30 rounded-2xl shadow-2xl z-50 flex flex-col transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10 pointer-events-none'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-cyan-accent/10 to-transparent rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-cyan-accent/20 flex items-center justify-center text-cyan-accent">
              <span className="material-symbols-outlined text-sm">neurology</span>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Stitch AI Coach</h3>
              <p className="text-cyan-accent text-[10px] font-mono tracking-wider uppercase">Gemini 3 Pro Online</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 ${msg.role === 'user' ? 'bg-cyan-accent text-black rounded-tr-sm' : 'bg-white/10 text-gray-200 rounded-tl-sm border border-white/5'}`}>
                {msg.video && (
                   <div className="mb-2 rounded-lg overflow-hidden bg-black border border-white/10 flex items-center justify-center h-32 relative">
                     <span className="material-symbols-outlined text-white/50 text-3xl">play_circle</span>
                     <span className="absolute bottom-1 right-2 text-[10px] text-white/70">Video Attached</span>
                   </div>
                )}
                {msg.image && (
                  <img src={`data:image/jpeg;base64,${msg.image}`} alt="User upload" className="mb-2 rounded-lg max-h-40 object-cover border border-black/20" />
                )}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-white/5 text-cyan-accent rounded-2xl p-4 rounded-tl-sm border border-cyan-accent/20 flex items-center gap-2">
                 <span className="size-2 bg-cyan-accent rounded-full animate-bounce"></span>
                 <span className="size-2 bg-cyan-accent rounded-full animate-bounce delay-100"></span>
                 <span className="size-2 bg-cyan-accent rounded-full animate-bounce delay-200"></span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 bg-black/50">
          <div className="flex gap-2 mb-2">
             {selectedImage && (
                <div className="relative group">
                   <div className="h-12 w-12 rounded-lg bg-white/10 border border-cyan-accent/50 flex items-center justify-center overflow-hidden">
                      <img src={`data:image/jpeg;base64,${selectedImage}`} className="h-full w-full object-cover" />
                   </div>
                   <button onClick={() => setSelectedImage(null)} className="absolute -top-1 -right-1 bg-red-500 rounded-full text-white p-0.5"><span className="material-symbols-outlined text-[10px]">close</span></button>
                </div>
             )}
             {selectedVideo && (
                <div className="relative group">
                   <div className="h-12 w-12 rounded-lg bg-white/10 border border-cyan-accent/50 flex items-center justify-center text-cyan-accent">
                      <span className="material-symbols-outlined">movie</span>
                   </div>
                   <button onClick={() => setSelectedVideo(null)} className="absolute -top-1 -right-1 bg-red-500 rounded-full text-white p-0.5"><span className="material-symbols-outlined text-[10px]">close</span></button>
                </div>
             )}
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-cyan-accent hover:bg-cyan-accent/10 rounded-full transition-colors" title="Upload Image">
              <span className="material-symbols-outlined">image</span>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'image')} />
            
            <button onClick={() => videoInputRef.current?.click()} className="p-2 text-cyan-accent hover:bg-cyan-accent/10 rounded-full transition-colors" title="Upload Video">
              <span className="material-symbols-outlined">videocam</span>
            </button>
            <input type="file" ref={videoInputRef} className="hidden" accept="video/mp4,video/webm" onChange={(e) => handleFileSelect(e, 'video')} />

            <div className="flex-1 relative">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Stitch..."
                className="w-full bg-surface-dark border border-white/10 rounded-full px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-accent/50 transition-colors"
              />
            </div>
            <button 
              onClick={handleSend}
              disabled={isLoading || (!input && !selectedImage && !selectedVideo)}
              className="p-2.5 bg-cyan-accent text-black rounded-full hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-xl">send</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
