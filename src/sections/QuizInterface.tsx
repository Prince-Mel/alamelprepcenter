import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  AlertTriangle,
  CheckCircle,
  BookOpen,
  Clock,
  List,
  Eye,
  Send,
  XCircle,
  Trophy,
  ArrowRight,
  Upload,
  FileText,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Timer } from './Timer';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  type: 'objective' | 'written';
  text: string;
  options?: string[];
  correctAnswer?: number;
}

interface Assessment {
  id: string;
  course_id: string;
  type: 'quiz' | 'examination' | 'assignment';
  title: string;
  mode: 'objectives' | 'written' | 'integrated' | 'file_upload';
  submission_mode: 'online' | 'file';
  question_file_url?: string;
  question_file_name?: string;
  structured_questions: Question[];
  duration: number;
}

interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  color: string;
  image: string;
}

interface QuizInterfaceProps {
  assessment: Assessment;
  course: Course;
  onComplete: (score: { correct: number; total: number; percentage: number }, answers?: any, studentFile?: { url: string, name: string }) => void;
  onCancel: () => void;
}

export function QuizInterface({ assessment, course, onComplete, onCancel }: QuizInterfaceProps) {
  const questions = assessment.structured_questions || [];
  const totalQuestions = questions.length;

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(() => {
    const saved = localStorage.getItem(`alamel_quiz_idx_${assessment.id}`);
    const idx = saved ? parseInt(saved, 10) : 0;
    return idx < totalQuestions ? idx : 0;
  });
  const [answers, setAnswers] = useState<Record<number, number | string>>(() => {
    const saved = localStorage.getItem(`alamel_quiz_answers_${assessment.id}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [studentUpload, setStudentUpload] = useState<{ url: string, name: string } | null>(() => {
    const saved = localStorage.getItem(`alamel_quiz_upload_${assessment.id}`);
    return saved ? JSON.parse(saved) : null;
  });
  const [flaggedQuestions, setFlaggedQuestions] = useState<number[]>(() => {
    const saved = localStorage.getItem(`alamel_quiz_flagged_${assessment.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showResults, setShowResults] = useState(() => {
    return localStorage.getItem(`alamel_quiz_results_${assessment.id}`) === 'true';
  });
  const [isReviewMode, setIsReviewMode] = useState(false);

  const currentQuestion = questions[currentQuestionIdx];

  // Auto-save effects
  useEffect(() => {
    localStorage.setItem(`alamel_quiz_idx_${assessment.id}`, currentQuestionIdx.toString());
  }, [currentQuestionIdx, assessment.id]);

  useEffect(() => {
    localStorage.setItem(`alamel_quiz_answers_${assessment.id}`, JSON.stringify(answers));
  }, [answers, assessment.id]);

  useEffect(() => {
    if (studentUpload) {
      localStorage.setItem(`alamel_quiz_upload_${assessment.id}`, JSON.stringify(studentUpload));
    } else {
      localStorage.removeItem(`alamel_quiz_upload_${assessment.id}`);
    }
  }, [studentUpload, assessment.id]);

  useEffect(() => {
    localStorage.setItem(`alamel_quiz_flagged_${assessment.id}`, JSON.stringify(flaggedQuestions));
  }, [flaggedQuestions, assessment.id]);

  useEffect(() => {
    localStorage.setItem(`alamel_quiz_results_${assessment.id}`, showResults.toString());
  }, [showResults, assessment.id]);

  const clearQuizStorage = () => {
    localStorage.removeItem(`alamel_quiz_idx_${assessment.id}`);
    localStorage.removeItem(`alamel_quiz_answers_${assessment.id}`);
    localStorage.removeItem(`alamel_quiz_upload_${assessment.id}`);
    localStorage.removeItem(`alamel_quiz_flagged_${assessment.id}`);
    localStorage.removeItem(`alamel_quiz_results_${assessment.id}`);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [currentQuestionIdx]: answerIndex }));
  };

  const handleWrittenAnswerChange = (text: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestionIdx]: text }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`;

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setStudentUpload({ url: data.url, name: file.name });
        toast.success('File uploaded successfully!');
      } else {
        toast.error('Upload failed.');
      }
    } catch (error) {
      toast.error('Network error during upload.');
    }
  };

  const handleNext = () => {
    if (currentQuestionIdx < totalQuestions - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
    } else {
      setIsReviewMode(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx((prev) => prev - 1);
    }
  };

  const handleFlag = () => {
    setFlaggedQuestions((prev) =>
      prev.includes(currentQuestionIdx)
        ? prev.filter((q) => q !== currentQuestionIdx)
        : [...prev, currentQuestionIdx]
    );
  };

  const handleSubmit = () => {
    const answeredCount = Object.keys(answers).length;
    
    // For file submission mode, we warn if no file is uploaded but don't block
    if (assessment.submission_mode === 'file' && !studentUpload) {
      toast.warning('Warning: You have not uploaded any file for this submission.');
    }

    if (assessment.submission_mode === 'online' && answeredCount < totalQuestions) {
      toast.warning(`You have ${totalQuestions - answeredCount} unanswered questions!`);
    }
    
    setShowSubmitDialog(true);
  };

  const confirmSubmit = () => {
    setShowSubmitDialog(false);
    setShowResults(true);
  };

  const calculateScore = () => {
    let correct = 0;
    let autoGradableCount = 0;

    questions.forEach((q, idx) => {
      if (q.type === 'objective') {
        autoGradableCount++;
        if (answers[idx] === q.correctAnswer) {
          correct++;
        }
      }
    });

    return {
      correct,
      total: totalQuestions,
      autoGradableCount,
      percentage: autoGradableCount > 0 ? Math.round((correct / autoGradableCount) * 100) : 0,
    };
  };

  const progress = useMemo(() => {
    const answered = Object.keys(answers).length;
    return (answered / totalQuestions) * 100;
  }, [answers, totalQuestions]);

  const stats = useMemo(() => {
    const answeredCount = Object.keys(answers).length;
    const flaggedCount = flaggedQuestions.length;
    const remainingCount = totalQuestions - answeredCount;
    return { answeredCount, flaggedCount, remainingCount };
  }, [answers, flaggedQuestions, totalQuestions]);

  if (showResults) {
    const score = calculateScore();
    const hasWrittenOrFile = questions.some(q => q.type === 'written') || assessment.submission_mode === 'file';

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 shadow-2xl border-none rounded-[40px] overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-emerald-400" />
          
          <div className="text-center relative z-10">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-12 floating">
              <Trophy className="w-12 h-12 text-white -rotate-12" />
            </div>
            
            <CardTitle className="text-4xl font-black text-gray-900 mb-2 uppercase tracking-tight italic">
              {hasWrittenOrFile ? 'Submission Received!' : 'Results Analysis'}
            </CardTitle>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-10">
              {assessment.title} • {course.code}
            </p>
            
            {hasWrittenOrFile ? (
              <div className="bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-[32px] p-8 mb-8">
                <p className="text-blue-900 font-black text-xl mb-3">CONGRATULATIONS!</p>
                <p className="text-blue-700 font-bold text-sm leading-relaxed max-w-sm mx-auto">
                  Your assessment has been successfully logged. Since this involves written components or file uploads, an instructor will manually review your work.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 group hover:border-blue-500 transition-all duration-300">
                  <p className="text-4xl font-black text-blue-600 group-hover:scale-110 transition-transform">{score.correct}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase mt-2 tracking-widest">Correct</p>
                </div>
                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 group hover:border-blue-500 transition-all duration-300">
                  <p className="text-4xl font-black text-gray-800 group-hover:scale-110 transition-transform">{score.total}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase mt-2 tracking-widest">Questions</p>
                </div>
                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 group hover:border-emerald-500 transition-all duration-300">
                  <p className={cn(
                    "text-4xl font-black group-hover:scale-110 transition-transform",
                    score.percentage >= 70 ? 'text-emerald-500' : score.percentage >= 50 ? 'text-blue-500' : 'text-rose-500'
                  )}>
                    {score.percentage}%
                  </p>
                  <p className="text-[10px] font-black text-gray-400 uppercase mt-2 tracking-widest">Final Grade</p>
                </div>
              </div>
            )}

            <Button
              onClick={() => {
                clearQuizStorage();
                onComplete(score, answers, studentUpload || undefined);
              }}
              className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all group"
            >
              Back to Course Room <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-arial selection:bg-blue-100">
      {/* Top Navigation Bar */}
      <header className="h-20 bg-white/80 backdrop-blur-md border-b flex items-center justify-between px-6 lg:px-12 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 uppercase tracking-tight">{assessment.title}</h1>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{course.name} • {course.code}</p>
          </div>
          {!isReviewMode && (
            <div className="hidden lg:flex items-center gap-2 ml-8 border-l border-gray-100 pl-8">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handlePrevious} 
                disabled={currentQuestionIdx === 0}
                className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-blue-600 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleNext} 
                className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-blue-600"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              {currentQuestionIdx === totalQuestions - 1 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSubmit} 
                  className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-rose-600"
                >
                  Submit <Send className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-6 pr-6 border-r border-gray-100">
            <div className="text-right">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Progress</p>
              <p className="text-sm font-black text-gray-900">{stats.answeredCount} / {totalQuestions}</p>
            </div>
            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-700 ease-liquid" 
                style={{ width: `${progress}%` }} 
              />
            </div>
          </div>
          
          <Timer duration={assessment.duration} onTimeUp={confirmSubmit} />
          
          <Button 
            variant="ghost" 
            onClick={() => setShowCancelDialog(true)}
            className="w-12 h-12 rounded-2xl hover:bg-rose-50 hover:text-rose-600 text-gray-400"
          >
            <XCircle className="w-6 h-6" />
          </Button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar - Question Grid */}
        <aside className="lg:col-span-3 order-2 lg:order-1 space-y-6">
          <Card className="rounded-[32px] border-none shadow-xl p-6 bg-white overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <List className="w-4 h-4" /> Question Navigator
            </h3>
            
            <div className="grid grid-cols-5 gap-3">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentQuestionIdx(idx);
                    setIsReviewMode(false);
                  }}
                  className={cn(
                    "w-full aspect-square rounded-xl text-xs font-black transition-all duration-300 active:scale-90 relative",
                    currentQuestionIdx === idx && !isReviewMode
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-100 scale-110 z-10"
                      : answers[idx] !== undefined
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : flaggedQuestions.includes(idx)
                      ? "bg-amber-50 text-amber-600 border border-amber-100"
                      : "bg-gray-50 text-gray-400 hover:bg-white hover:border-gray-200"
                  )}
                >
                  {idx + 1}
                  {flaggedQuestions.includes(idx) && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 border-2 border-white rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-50 space-y-3">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span>Completed</span>
                <span className="text-emerald-500">{stats.answeredCount}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span>Flagged</span>
                <span className="text-amber-500">{stats.flaggedCount}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span>Remaining</span>
                <span className="text-gray-900">{stats.remainingCount}</span>
              </div>
            </div>
          </Card>

          <Button
            onClick={() => setIsReviewMode(true)}
            className={cn(
              "w-full h-16 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 group",
              isReviewMode ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-white text-gray-900 hover:bg-gray-50 border-none"
            )}
          >
            <Eye className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" /> Review & Submit
          </Button>
        </aside>

        {/* Main Workspace */}
        <main className="lg:col-span-9 order-1 lg:order-2">
          {totalQuestions === 0 ? (
            <div className="space-y-8 animate-scale-in">
              <Card className="rounded-[40px] border-none shadow-2xl bg-white p-12 text-center overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
                <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl rotate-12">
                  <FileText className="w-12 h-12 text-blue-600 -rotate-12" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-4 italic leading-none">Submission Required</h2>
                <p className="text-gray-500 font-bold text-sm max-w-md mx-auto mb-10 leading-relaxed uppercase tracking-widest">
                  This task requires you to upload a file response. Please prepare your work and upload it below to proceed.
                </p>
                
                <div className="max-w-md mx-auto p-8 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
                  {studentUpload ? (
                    <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-sm font-bold text-gray-700 truncate max-w-[180px]">{studentUpload.name}</p>
                          <p className="text-[10px] font-black text-emerald-500 uppercase">Ready for submission</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setStudentUpload(null)} className="text-rose-500 hover:bg-rose-50 rounded-lg">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Label htmlFor="file-upload-main" className="cursor-pointer">
                        <div className="flex flex-col items-center gap-4 group">
                          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                            <Upload className="w-10 h-10 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-blue-600 uppercase tracking-widest group-hover:text-blue-700">Choose Response File</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">PDF, DOCX, ZIP, JPG, PNG</p>
                          </div>
                        </div>
                      </Label>
                      <Input id="file-upload-main" type="file" className="hidden" onChange={handleFileUpload} />
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleSubmit}
                  className="mt-12 h-16 px-12 bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-100 active:scale-95 transition-all w-full max-w-md mx-auto flex items-center justify-center gap-3"
                >
                  Confirm Submission <Send className="w-5 h-5" />
                </Button>
              </Card>
            </div>
          ) : isReviewMode ? (
            <div className="space-y-8 animate-scale-in">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Review Session</h2>
                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 py-1.5 px-4 font-black">Ready to Submit</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {questions.map((q, idx) => (
                  <Card key={idx} className="p-6 rounded-[28px] border-none shadow-lg bg-white group hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {idx + 1}
                        </span>
                        <Badge variant="outline" className="capitalize text-[9px] font-black border-gray-100">{q.type}</Badge>
                      </div>
                      {answers[idx] !== undefined ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <p className="text-sm font-bold text-gray-700 line-clamp-2 mb-4">{q.text}</p>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setCurrentQuestionIdx(idx);
                        setIsReviewMode(false);
                      }}
                      className="w-full justify-between h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50"
                    >
                      Return to Question <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Card>
                ))}
              </div>

              <div className="bg-white p-10 rounded-[40px] shadow-2xl border-none text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Send className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">Final Confirmation</h3>
                <p className="text-gray-500 font-bold text-sm max-w-md mx-auto mb-10 leading-relaxed">
                  You've reviewed your answers. Once you submit, you will not be able to change your responses. Are you sure you're ready?
                </p>

                {assessment.submission_mode === 'file' && (
                  <div className="max-w-md mx-auto mb-10 p-6 bg-blue-50/50 rounded-[32px] border-2 border-dashed border-blue-200">
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Required: File Submission</h4>
                    {studentUpload ? (
                      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="text-left overflow-hidden">
                            <p className="text-sm font-bold text-gray-700 truncate">{studentUpload.name}</p>
                            <p className="text-[10px] font-black text-emerald-500 uppercase">Ready to submit</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setStudentUpload(null)}
                          className="text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Label htmlFor="file-upload-review" className="cursor-pointer">
                          <div className="flex flex-col items-center gap-2 group">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                              <Upload className="w-8 h-8 text-blue-500" />
                            </div>
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Click to upload response file</p>
                          </div>
                        </Label>
                        <Input 
                          id="file-upload-review" 
                          type="file" 
                          className="hidden" 
                          onChange={handleFileUpload}
                          accept=".pdf,.doc,.docx,.zip,.jpg,.png"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsReviewMode(false)}
                    className="flex-1 h-14 rounded-2xl border-gray-100 font-black text-xs uppercase tracking-widest"
                  >
                    Keep Working
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-100"
                  >
                    Submit Now
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-slide-in-right">
              <Card className="rounded-[40px] border-none shadow-2xl bg-white overflow-hidden relative">
                <div className="h-24 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 p-8 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl font-black text-white/20 italic">#{currentQuestionIdx + 1}</span>
                    <div>
                      <h2 className="text-white font-black text-lg uppercase tracking-tight leading-none">Question Phase</h2>
                      <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mt-1">Status: Active</p>
                    </div>
                  </div>
                  <Badge className="bg-white/20 text-white border-none py-2 px-4 font-black uppercase tracking-widest text-[9px]">
                    {currentQuestion.type} Mode
                  </Badge>
                </div>

                <div className="p-8 lg:p-12">
                  <div className="space-y-10">
                    <h3 className="text-2xl lg:text-3xl font-black text-gray-800 leading-[1.3] italic">
                      {currentQuestion.text}
                    </h3>

                    {currentQuestion.type === 'objective' ? (
                      <RadioGroup
                        value={answers[currentQuestionIdx]?.toString()}
                        onValueChange={(value) => handleAnswerSelect(Number(value))}
                        className="grid grid-cols-1 md:grid-cols-2 gap-5"
                      >
                        {currentQuestion.options?.map((option, index) => {
                          const isSelected = answers[currentQuestionIdx] === index;
                          return (
                            <div
                              key={index}
                              onClick={() => handleAnswerSelect(index)}
                              className={cn(
                                "relative group cursor-pointer p-6 rounded-[28px] border-2 transition-all duration-500 ease-expo overflow-hidden",
                                isSelected 
                                  ? "border-blue-600 bg-blue-50/50 shadow-xl shadow-blue-50" 
                                  : "border-gray-50 bg-gray-50/50 hover:border-blue-200 hover:bg-white"
                              )}
                            >
                              <div className="flex items-center gap-4 relative z-10">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all duration-500",
                                  isSelected ? "bg-blue-600 text-white rotate-6" : "bg-white text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                                )}>
                                  {String.fromCharCode(65 + index)}
                                </div>
                                <RadioGroupItem value={index.toString()} id={`opt-${index}`} className="hidden" />
                                <Label htmlFor={`opt-${index}`} className="flex-1 cursor-pointer font-bold text-lg text-gray-700 leading-snug">
                                  {option}
                                </Label>
                              </div>
                              {isSelected && (
                                <div className="absolute top-0 right-0 p-4">
                                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </RadioGroup>
                    ) : (
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Type your response below</Label>
                        <Textarea
                          placeholder="Your answer here..."
                          className="min-h-[300px] text-lg p-8 bg-gray-50/50 border-none rounded-[32px] focus-visible:ring-4 focus-visible:ring-blue-100 focus-visible:bg-white transition-all shadow-inner resize-none leading-relaxed font-bold italic"
                          value={(answers[currentQuestionIdx] as string) || ''}
                          onChange={(e) => handleWrittenAnswerChange(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-8 bg-gray-50/50 border-t flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <Button
                      variant="ghost"
                      onClick={handlePrevious}
                      disabled={currentQuestionIdx === 0}
                      className="flex-1 sm:flex-none h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 hover:text-blue-600 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-5 h-5 mr-2" /> Previous
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleFlag}
                      className={cn(
                        "flex-1 sm:flex-none h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                        flaggedQuestions.includes(currentQuestionIdx)
                          ? "bg-amber-100 text-amber-600"
                          : "text-gray-400 hover:text-amber-600"
                      )}
                    >
                      <Flag className={cn("w-5 h-5 mr-2", flaggedQuestions.includes(currentQuestionIdx) && "fill-current")} />
                      {flaggedQuestions.includes(currentQuestionIdx) ? 'Flagged' : 'Flag'}
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    {currentQuestionIdx < totalQuestions - 1 ? (
                      <Button
                        onClick={handleNext}
                        className="w-full sm:w-auto h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 group active:scale-95 transition-all"
                      >
                        Next <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    ) : (
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <Button
                          onClick={() => setIsReviewMode(true)}
                          className="w-full sm:w-auto h-14 px-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 group active:scale-95 transition-all"
                        >
                          Next <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <Button
                          onClick={handleSubmit}
                          className="w-full sm:w-auto h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 group active:scale-95 transition-all"
                        >
                          Submit <Send className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <div className="flex items-center justify-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <div className="w-2 h-2 rounded-full bg-blue-200" />
                <div className="w-2 h-2 rounded-full bg-blue-100" />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Dialogs */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="rounded-[40px] p-10 border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mb-6">
              <Send className="w-10 h-10" />
            </div>
            <AlertDialogTitle className="text-3xl font-black text-gray-900 uppercase tracking-tight italic">Confirm Submission</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 font-bold text-lg leading-relaxed">
              You are about to submit your {assessment.type}. Once submitted, your answers will be final and cannot be modified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-4">
            <AlertDialogCancel className="h-14 px-8 rounded-2xl border-gray-100 font-black text-xs uppercase tracking-widest">Review Work</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSubmit}
              className="h-14 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white border-none font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100"
            >
              Submit Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="rounded-[40px] p-10 border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <AlertDialogTitle className="text-3xl font-black text-gray-900 uppercase tracking-tight italic">Abort Assessment?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 font-bold text-lg leading-relaxed">
              Exiting now will cause you to lose all progress in this session. Are you absolutely sure you want to quit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-4">
            <AlertDialogCancel className="h-14 px-8 rounded-2xl border-gray-100 font-black text-xs uppercase tracking-widest">Resume Session</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                clearQuizStorage();
                onCancel();
              }}
              className="h-14 px-10 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white border-none font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-100"
            >
              Quit Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
