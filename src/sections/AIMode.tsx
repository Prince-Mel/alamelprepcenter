import { Button } from '@/components/ui/button';
import { Sparkles, X, BrainCircuit, Bot, Zap } from 'lucide-react';

interface AIModeProps {
  onClose: () => void;
  type: string;
}

export function AIMode({ onClose, type }: AIModeProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black animate-fade-in overflow-hidden flex flex-col">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-black to-black pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-6 border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">AI Companion</h1>
            <p className="text-xs text-cyan-400 font-medium uppercase tracking-wider">
              {type === 'videos' ? 'Video Analysis' : type === 'textbooks' ? 'Smart Reader' : 'Study Assistant'} Mode
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={onClose}
          className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full w-10 h-10 p-0"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center">
        
        {/* Central Visual */}
        <div className="relative w-48 h-48 mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full blur-3xl opacity-20 animate-pulse" />
          <div className="relative w-full h-full bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-full flex items-center justify-center shadow-2xl">
            <BrainCircuit className="w-24 h-24 text-white/80 animate-pulse" />
          </div>
          
          {/* Orbiting Elements */}
          <div className="absolute inset-0 animate-spin-slow">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 w-6 h-6 bg-cyan-500 rounded-full blur-sm" />
          </div>
          <div className="absolute inset-0 animate-spin-slow-reverse" style={{ animationDuration: '7s' }}>
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-3 w-4 h-4 bg-purple-500 rounded-full blur-sm" />
          </div>
        </div>

        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-400 mb-4 tracking-tight">
          AI Learning Assistant
        </h2>
        
        <p className="text-lg text-gray-400 max-w-lg mx-auto leading-relaxed">
          I'm here to help you analyze {type}, summarize content, and answer your questions in real-time.
        </p>

        <div className="mt-12 flex gap-4">
          <div className="px-6 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur text-sm text-gray-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Initializing Neural Engine...
          </div>
        </div>

        {/* Placeholder Chat Input Area */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6">
           <div className="w-full h-14 bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center px-4 text-gray-500">
             <Sparkles className="w-5 h-5 mr-3 text-cyan-500" />
             <span>Ask anything about this {type === 'videos' ? 'video' : 'topic'}...</span>
           </div>
        </div>

      </div>
    </div>
  );
}
