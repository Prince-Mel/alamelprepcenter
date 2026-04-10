import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, X, BrainCircuit, Bot, Zap, Send, Loader2, Lightbulb, Upload, FileText, Trash2, Video, Link2 } from 'lucide-react';

interface AIModeProps {
  onClose: () => void;
  type: string;
  courseInfo?: string;
  userName?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
  fileName?: string;
  videoUrl?: string;
  videoTitle?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
}

interface VideoInfo {
  url: string;
  title: string;
  isAnalyzing: boolean;
}

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

export function AIMode({ onClose, type, courseInfo, userName }: AIModeProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Check AI service health on mount
  useEffect(() => {
    checkHealth();
    loadSuggestions();
  }, []);

  const checkHealth = async () => {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/health`);
      if (response.ok) {
        setIsConnected(true);
        // Add welcome message
        const welcomeMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: getWelcomeMessage(),
          timestamp: new Date().toISOString(),
          suggestions: getDefaultSuggestions()
        };
        setMessages([welcomeMessage]);
        setSuggestions(welcomeMessage.suggestions || []);
      } else {
        throw new Error('Service unavailable');
      }
    } catch (error) {
      console.error('AI Service health check failed:', error);
      setIsConnected(false);
      // Add offline message
      const offlineMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: getOfflineMessage(),
        timestamp: new Date().toISOString()
      };
      setMessages([offlineMessage]);
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/suggestions?context=${type}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const getWelcomeMessage = () => {
    const typeMessages: Record<string, string> = {
      textbooks: `📖 Welcome to **Smart Reader** mode! I can help you analyze textbooks, extract key concepts, and create study materials.\n\nWhat would you like to do?`,
      videos: `🎥 Welcome to **Video Analysis** mode! I can help you extract key points, create summaries, and answer questions about video content.\n\nHow can I assist you?`,
      pastQuestions: `📝 Welcome to **Exam Prep** mode! I can help you practice with past questions, understand solutions, and create study plans.\n\nWhat would you like to focus on?`
    };
    
    return typeMessages[type] || `👋 Welcome to **AI Learning Assistant**! I'm here to help you study, understand concepts, and prepare for exams.\n\nWhat would you like help with today?`;
  };

  const getDefaultSuggestions = () => {
    const suggestionMap: Record<string, string[]> = {
      textbooks: ['Summarize content', 'Explain concepts', 'Create study notes', 'Generate quiz'],
      videos: ['Extract key points', 'Create summary', 'Answer questions', 'Related topics'],
      pastQuestions: ['Practice questions', 'Explain solutions', 'Study plan', 'Weak areas'],
      default: ['Help me study', 'Explain a topic', 'Create a quiz', 'Study tips']
    };
    return suggestionMap[type] || suggestionMap.default;
  };

  const getOfflineMessage = () => {
    return `⚠️ **AI Service is Offline**\n\nThe Python AI server is not running. To enable full AI features:\n\n1. Open a terminal in the \`backend\` folder\n2. Run: \`start-ai.bat\`\n3. Wait for the server to start\n\nIn the meantime, I can provide basic study assistance. What topic are you studying?`;
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversation_id: conversationId,
          context: type,
          course_info: courseInfo,
          file_id: uploadedFile?.id,
          user_name: userName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      // Update conversation ID
      if (!conversationId) {
        setConversationId(data.conversation_id);
      }

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: data.timestamp,
        suggestions: data.suggestions || []
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `❌ Sorry, I encountered an error. Please try again.\n\nIf the issue persists, make sure the AI server is running (run \`backend/start-ai.bat\`).`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['.txt', '.pdf', '.docx', '.md'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(fileExt)) {
      alert(`Unsupported file type. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum size: 10MB');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${AI_SERVICE_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      setUploadedFile({
        id: data.file_id,
        name: data.filename,
        type: data.file_type,
        size: data.file_size
      });

      // Get the user's typed message if any
      const userMessage = inputValue.trim();

      // Add upload notification to chat
      const uploadMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: userMessage || `Uploaded file: ${file.name}`,
        timestamp: new Date().toISOString(),
        fileName: file.name
      };
      setMessages(prev => [...prev, uploadMessage]);

      // If user has typed a message, send it WITH the file
      // If not, just notify the file is uploaded and wait for user input
      if (userMessage) {
        setIsLoading(true);
        setInputValue('');

        const aiResponse = await fetch(`${AI_SERVICE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            conversation_id: conversationId,
            context: type,
            course_info: courseInfo,
            file_id: data.file_id,
            user_name: userName
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const assistantMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: aiData.response,
            timestamp: aiData.timestamp,
            suggestions: aiData.suggestions || []
          };
          setMessages(prev => [...prev, assistantMessage]);
          setSuggestions(aiData.suggestions || []);
          if (!conversationId) {
            setConversationId(aiData.conversation_id);
          }
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  const handleVideoAnalyze = async () => {
    if (!videoUrlInput.trim()) return;

    const url = videoUrlInput.trim();
    
    // Basic URL validation
    if (!url.includes('http') || (!url.includes('youtube') && !url.includes('youtu.be') && !url.includes('.mp4') && !url.includes('.webm'))) {
      alert('Please enter a valid video URL (YouTube, MP4, etc.)');
      return;
    }

    setVideoInfo({ url, title: 'Analyzing video...', isAnalyzing: true });
    setShowVideoInput(false);
    setVideoUrlInput('');

    // Add user message about video
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: `Analyze this video: ${url}`,
      timestamp: new Date().toISOString(),
      videoUrl: url
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Analyze this video and provide a comprehensive summary of the content, key points, and important concepts discussed.',
          conversation_id: conversationId,
          context: 'videos',
          course_info: courseInfo,
          user_name: userName,
          video_url: url
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze video');
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: data.timestamp,
        suggestions: data.suggestions || [],
        videoTitle: url.includes('youtube') || url.includes('youtu.be') ? 'YouTube Video Analysis' : 'Video Analysis'
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSuggestions(data.suggestions || []);
      setVideoInfo(null);
      
      if (!conversationId) {
        setConversationId(data.conversation_id);
      }
    } catch (error) {
      console.error('Video analysis error:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `❌ Sorry, I couldn't analyze that video. This could be because:\n\n• The video doesn't have transcripts/captions available\n• The video URL is not accessible\n• The video format is not supported\n\nTry providing a YouTube video with English captions, or paste the video transcript directly.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      setVideoInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content.split('\n').map((line, i) => {
      // Bold text
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const formatted = parts.map((part, j) => 
        j % 2 === 1 ? <strong key={j} className="font-semibold text-white">{part}</strong> : part
      );
      
      return (
        <span key={i}>
          {i > 0 && <br />}
          {formatted}
        </span>
      );
    });
  };

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
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-wide">AI Companion</h1>
              {isConnected ? (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-green-400 font-medium">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  <span className="text-[10px] text-yellow-400 font-medium">Offline</span>
                </div>
              )}
            </div>
            <p className="text-xs text-cyan-400 font-medium uppercase tracking-wider">
              {type === 'videos' ? 'Video Analysis' : type === 'textbooks' ? 'Smart Reader' : type === 'pastQuestions' ? 'Exam Prep' : 'Study Assistant'} Mode
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

      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="relative z-10 flex-1 px-6 py-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6 min-h-0">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                    : 'bg-gray-900/80 border border-white/10 text-gray-200'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <BrainCircuit className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-cyan-400 font-semibold">AI Assistant</span>
                  </div>
                )}
                <div className="text-sm leading-relaxed">
                  {formatMessage(message.content)}
                </div>
                {message.timestamp && message.role === 'assistant' && (
                  <div className="text-[10px] text-gray-500 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="max-w-[80%] rounded-2xl p-4 bg-gray-900/80 border border-white/10">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span className="text-sm text-gray-400">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="relative z-10 px-6 pb-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400 font-medium">Suggestions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="relative z-10 px-6 pb-8 pt-4 border-t border-white/10 bg-black/30 backdrop-blur-md">
        <div className="max-w-4xl mx-auto">
          {/* Uploaded File Display */}
          {uploadedFile && (
            <div className="mb-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-sm text-white font-medium">{uploadedFile.name}</p>
                  <p className="text-[10px] text-gray-400">{formatFileSize(uploadedFile.size)} • {uploadedFile.type.toUpperCase()}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                className="w-8 h-8 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Video Analysis Display */}
          {videoInfo && (
            <div className="mb-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5 text-purple-400 animate-pulse" />
                <div>
                  <p className="text-sm text-white font-medium">{videoInfo.title}</p>
                  <p className="text-[10px] text-gray-400">Analyzing video content...</p>
                </div>
              </div>
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            </div>
          )}

          {/* Video URL Input Dialog */}
          {showVideoInput && (
            <div className="mb-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-white font-medium">Video URL for Analysis</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  placeholder="Paste YouTube or video URL..."
                  className="flex-1 h-10 bg-gray-900/80 border border-white/10 rounded-xl text-white placeholder:text-gray-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleVideoAnalyze()}
                />
                <Button onClick={handleVideoAnalyze} size="sm" className="h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-xl">
                  <Link2 className="w-4 h-4 mr-1" /> Analyze
                </Button>
                <Button onClick={() => { setShowVideoInput(false); setVideoUrlInput(''); }} variant="ghost" size="sm" className="h-10 text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">Supports YouTube videos with captions/transcripts</p>
            </div>
          )}

          <div className="flex gap-3">
            {/* File Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.docx,.md"
              onChange={handleFileUpload}
              className="hidden"
              disabled={!isConnected || isUploading}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={!isConnected || isUploading}
              className="h-14 w-14 rounded-2xl border-white/10 bg-gray-900/80 hover:bg-white/10 hover:border-cyan-500/50 text-gray-400 hover:text-cyan-400 disabled:opacity-50"
              title="Upload file for analysis"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </Button>

            {/* Video Analysis Button - Only visible in video mode */}
            {type === 'videos' && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowVideoInput(!showVideoInput)}
                disabled={!isConnected}
                className="h-14 w-14 rounded-2xl border-white/10 bg-gray-900/80 hover:bg-white/10 hover:border-purple-500/50 text-gray-400 hover:text-purple-400 disabled:opacity-50"
                title="Analyze video URL"
              >
                <Video className="w-5 h-5" />
              </Button>
            )}

            {/* Text Input */}
            <div className="flex-1 relative">
              <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-500 pointer-events-none" />
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isConnected ? `Ask anything about this ${type === 'videos' ? 'video' : type === 'textbooks' ? 'textbook' : 'topic'}...` : 'Type your message...'}
                className="pl-12 h-14 bg-gray-900/80 border border-white/10 rounded-2xl text-white placeholder:text-gray-500 focus-visible:ring-cyan-500 focus-visible:border-cyan-500"
                disabled={!isConnected && messages.length === 0}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              className="h-14 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-gray-500">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span>AI-Powered Learning</span>
            </div>
            <span>•</span>
            <span>Context: {type}</span>
            <span>•</span>
            <span>Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
}
