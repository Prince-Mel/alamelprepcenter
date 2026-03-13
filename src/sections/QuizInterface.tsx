import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

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

export function QuizInterface({ assessment, onComplete, onCancel }: QuizInterfaceProps) {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(() => {
    const saved = localStorage.getItem(`alamel_quiz_idx_${assessment.id}`);
    return saved ? parseInt(saved, 10) : 0;
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

  // Cleanup on complete
  const clearQuizStorage = () => {
    localStorage.removeItem(`alamel_quiz_idx_${assessment.id}`);
    localStorage.removeItem(`alamel_quiz_answers_${assessment.id}`);
    localStorage.removeItem(`alamel_quiz_upload_${assessment.id}`);
    localStorage.removeItem(`alamel_quiz_flagged_${assessment.id}`);
    localStorage.removeItem(`alamel_quiz_results_${assessment.id}`);
  };

  // Auto-submit when time is up
  useEffect(() => {
    const handleTimeUp = () => {
      confirmSubmit();
    };
    window.addEventListener('alamel_time_up', handleTimeUp);
    return () => window.removeEventListener('alamel_time_up', handleTimeUp);
  }, []);

  const questions = assessment.structured_questions || [];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQuestionIdx];

  const handleAnswerSelect = (answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [currentQuestionIdx]: answerIndex }));
  };

  const handleWrittenAnswerChange = (text: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestionIdx]: text }));
  };

  const handleNext = () => {
    if (currentQuestionIdx < totalQuestions - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
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
    if (assessment.submission_mode === 'file' && !studentUpload) {
      toast.error('Please upload your submission file before submitting.');
      return;
    }

    const answeredCount = Object.keys(answers).length;
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

  if (showResults) {
    const score = calculateScore();
    const hasWrittenOrFile = questions.some(q => q.type === 'written') || assessment.submission_mode === 'file';

    return (
      <div className="max-w-2xl mx-auto animate-scale-in">
        <Card className="text-center p-8">
          <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <CardTitle className="text-3xl mb-2">Assessment Completed!</CardTitle>
          <p className="text-gray-500 mb-8">
            You have successfully submitted your {assessment.type}
          </p>
          
          {hasWrittenOrFile ? (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8">
              <p className="text-blue-800 font-medium text-lg">Your submission has been received.</p>
              <p className="text-blue-600 mt-2">This assessment requires manual review. An administrator will review and grade your work. You'll see your final score once it's released.</p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-8 mb-8 border-2 border-gray-100">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-600">{score.correct}</p>
                  <p className="text-sm text-gray-500 font-medium uppercase mt-1">Correct</p>
                </div>
                <div className="text-center border-x border-gray-200">
                  <p className="text-4xl font-bold text-gray-800">{score.total}</p>
                  <p className="text-sm text-gray-500 font-medium uppercase mt-1">Total</p>
                </div>
                <div className="text-center">
                  <p className={`text-4xl font-bold ${score.percentage >= 70 ? 'text-green-600' : score.percentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {score.percentage}%
                  </p>
                  <p className="text-sm text-gray-500 font-medium uppercase mt-1">Score</p>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={() => {
              clearQuizStorage();
              onComplete(score, answers, studentUpload || undefined);
            }}
            className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-10 h-12 text-lg rounded-xl shadow-md transition-all active:scale-95"
          >
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const handleStudentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > 50) {
          toast.error('File is too large (Max 50MB).');
          return;
        }
        setStudentUpload({ url: result, name: file.name });
        toast.success('File uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  if (!currentQuestion && assessment.mode !== 'file_upload') return null;

  return (
    <div className="max-w-5xl mx-auto animate-slide-in-right">
      {/* Progress Header - only for online structured assessments */}
      {assessment.mode !== 'file_upload' && assessment.submission_mode === 'online' && (
        <Card className="mb-6 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Progress</span>
                  <span className="text-lg font-bold text-gray-700">
                    Question {currentQuestionIdx + 1} <span className="text-gray-300 font-medium">/ {totalQuestions}</span>
                  </span>
                </div>
                <div className="h-10 w-px bg-gray-100" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Type</span>
                  <Badge variant="outline" className="mt-1 capitalize bg-gray-50">{currentQuestion.type}</Badge>
                </div>
              </div>
              {flaggedQuestions.includes(currentQuestionIdx) && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 py-1.5 px-3">
                  <Flag className="w-4 h-4 mr-1.5 fill-current" /> Flagged
                </Badge>
              )}
            </div>
            
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-6 shadow-inner">
              <div
                className="h-full bg-blue-600 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${((currentQuestionIdx + 1) / totalQuestions) * 100}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIdx(index)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all border-2 ${
                    index === currentQuestionIdx
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : answers[index] !== undefined
                      ? 'bg-blue-50 border-blue-100 text-blue-600'
                      : flaggedQuestions.includes(index)
                      ? 'bg-amber-50 border-amber-100 text-amber-600'
                      : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question Card */}
      <Card className="mb-8 overflow-hidden border-none shadow-xl min-h-[400px] flex flex-col">
        <div className="bg-blue-600 px-8 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5" /> {assessment.title}
          </h2>
          <div className="flex gap-2">
            <Badge className="bg-white/20 text-white border-none px-3 capitalize">
              {assessment.mode.replace('_', ' ')}
            </Badge>
            <Badge className="bg-white/20 text-white border-none px-3 capitalize">
              {assessment.submission_mode} Submission
            </Badge>
          </div>
        </div>
        
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-gray-800 leading-tight">
            {assessment.mode === 'file_upload' ? 'Review the attached questions below:' : currentQuestion.text}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 p-8 pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            {/* Left side: Questions */}
            <div className={`space-y-4 ${assessment.submission_mode === 'file' ? 'lg:border-r lg:pr-8' : 'lg:col-span-2'}`}>
              {assessment.mode === 'file_upload' && assessment.question_file_url ? (
                <div className="w-full h-[500px] border-2 rounded-2xl overflow-hidden bg-gray-100">
                  {assessment.question_file_url.startsWith('data:application/pdf') ? (
                    <iframe src={assessment.question_file_url} className="w-full h-full" title="Question File" />
                  ) : (
                    <img src={assessment.question_file_url} className="w-full h-full object-contain" alt="Questions" />
                  )}
                </div>
              ) : assessment.mode !== 'file_upload' ? (
                <>
                  {currentQuestion.type === 'objective' ? (
                    <RadioGroup
                      value={answers[currentQuestionIdx]?.toString()}
                      onValueChange={(value) => handleAnswerSelect(Number(value))}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      {currentQuestion.options?.map((option, index) => (
                        <div
                          key={index}
                          onClick={() => handleAnswerSelect(index)}
                          className={`flex items-center space-x-4 p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 group ${
                            answers[currentQuestionIdx] === index
                              ? 'border-blue-600 bg-blue-50/50 shadow-md ring-4 ring-blue-50'
                              : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
                            answers[currentQuestionIdx] === index ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600'
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </div>
                          <RadioGroupItem value={index.toString()} id={`opt-${index}`} className="hidden" />
                          <Label htmlFor={`opt-${index}`} className="flex-1 cursor-pointer font-semibold text-lg text-gray-700">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="space-y-4 h-full flex flex-col">
                      <Label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Type your response below</Label>
                      <Textarea
                        placeholder="Write your answer here..."
                        className="flex-1 min-h-[250px] text-lg p-6 bg-gray-50/30 border-2 border-gray-100 rounded-3xl focus:border-blue-500 focus:ring-0 focus:bg-white transition-all shadow-inner resize-none leading-relaxed"
                        value={(answers[currentQuestionIdx] as string) || ''}
                        onChange={(e) => handleWrittenAnswerChange(e.target.value)}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center text-gray-500 bg-gray-50 rounded-3xl border-2 border-dashed">
                  <AlertTriangle className="w-12 h-12 mb-4 text-amber-500" />
                  <p>No question file was uploaded by the administrator.</p>
                </div>
              )}
            </div>

            {/* Right side: Student File Upload (only if submission_mode is 'file') */}
            {assessment.submission_mode === 'file' && (
              <div className="space-y-6">
                <div className="bg-green-50/50 border-2 border-dashed border-green-200 rounded-3xl p-8 h-full flex flex-col justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                      <Flag className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Submit Your Work</h3>
                      <p className="text-sm text-gray-500">Upload your completed answers as a PDF or Image file.</p>
                    </div>
                    
                    <div className="pt-4">
                      <Input 
                        type="file" 
                        accept=".pdf,image/*" 
                        id="student-file-upload" 
                        className="hidden" 
                        onChange={handleStudentFileUpload}
                      />
                      <Label 
                        htmlFor="student-file-upload"
                        className="flex items-center justify-center gap-2 w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold cursor-pointer transition-all active:scale-95 shadow-lg shadow-green-100"
                      >
                        <CheckCircle className="w-5 h-5" />
                        {studentUpload ? 'Change Uploaded File' : 'Upload Submission'}
                      </Label>
                    </div>

                    {studentUpload && (
                      <div className="bg-white p-4 rounded-2xl border border-green-100 flex items-center gap-3 animate-fade-in">
                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-sm font-bold text-gray-800 truncate">{studentUpload.name}</p>
                          <p className="text-[10px] text-green-600 font-bold uppercase">Ready for submission</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Footer */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex gap-4">
          {assessment.mode !== 'file_upload' && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIdx === 0}
              className="h-12 px-6 rounded-xl border-gray-200 font-bold active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5 mr-2" /> Previous
            </Button>
          )}
          {assessment.mode !== 'file_upload' && (
            <Button
              variant="outline"
              onClick={handleFlag}
              className={`h-12 px-6 rounded-xl font-bold active:scale-95 transition-all ${
                flaggedQuestions.includes(currentQuestionIdx)
                  ? 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              <Flag className={`w-5 h-5 mr-2 ${flaggedQuestions.includes(currentQuestionIdx) ? 'fill-current' : ''}`} />
              {flaggedQuestions.includes(currentQuestionIdx) ? 'Unflag' : 'Flag'}
            </Button>
          )}
        </div>

        <div className="flex gap-4">
          <Button
            variant="ghost"
            onClick={() => setShowCancelDialog(true)}
            className="h-12 px-6 text-gray-400 hover:text-red-600 rounded-xl font-bold"
          >
            Cancel
          </Button>
          {assessment.mode !== 'file_upload' && currentQuestionIdx < totalQuestions - 1 ? (
            <Button
              onClick={handleNext}
              className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all"
            >
              Next Question <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="h-12 px-10 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" /> Submit Assessment
            </Button>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="rounded-3xl p-8">
          <AlertDialogHeader>
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-black text-gray-900">Finish Assessment?</AlertDialogTitle>
            <AlertDialogDescription className="text-lg text-gray-500 leading-relaxed">
              You have answered {Object.keys(answers).length} of {totalQuestions} questions. Are you ready to submit your work?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-6 rounded-xl font-bold border-gray-200">Review Answers</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSubmit}
              className="h-12 px-8 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-100"
            >
              Submit Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="rounded-3xl p-8 border-none">
          <AlertDialogHeader>
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-black text-gray-900">Exit Assessment?</AlertDialogTitle>
            <AlertDialogDescription className="text-lg text-gray-500">
              Your progress will be lost. Are you sure you want to cancel and exit this assessment?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-6 rounded-xl font-bold border-gray-200">Keep Working</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                clearQuizStorage();
                onCancel();
              }}
              className="h-12 px-8 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white border-none shadow-lg shadow-red-100"
            >
              Yes, Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
