import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ArrowLeft, MessageSquare, FileText, Download } from 'lucide-react';

interface AssessmentResultViewProps {
  result: any;
  onBack: () => void;
}

export function AssessmentResultView({ result, onBack }: AssessmentResultViewProps) {
  const {
    assessment_title,
    course_name,
    score,
    status,
    feedback,
    structured_questions,
    answers,
    manual_marking,
    student_file
  } = result;

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={onBack} className="text-gray-500 hover:text-blue-600">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
      </Button>

      <Card className="border-none shadow-md overflow-hidden">
        <div className={`h-2 w-full ${status === 'released' ? (score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500') : 'bg-gray-300'}`} />
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800">{assessment_title}</CardTitle>
              <p className="text-gray-500 font-medium">{course_name}</p>
            </div>
            {status === 'released' ? (
              <Badge className={`text-lg px-4 py-1 ${score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                {score}% - {score >= 70 ? 'Distinction' : score >= 50 ? 'Pass' : 'Fail'}
              </Badge>
            ) : (
              <Badge className="text-lg px-4 py-1 bg-gray-500">
                Pending Grading
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Feedback Section */}
          {feedback && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-4">
              <div className="mt-1">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-blue-800">Teacher Feedback</h4>
                <p className="text-blue-700 mt-1 leading-relaxed">{feedback}</p>
              </div>
            </div>
          )}

          {/* Student File Submission */}
          {student_file && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
               <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                 <FileText className="w-5 h-5 text-gray-500" /> Your Submission
               </h4>
               <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                 <span className="text-sm font-medium truncate max-w-[200px]">{student_file.name}</span>
                 <Button 
                   size="sm" 
                   variant="outline" 
                   className="gap-2"
                   onClick={() => {
                     const link = document.createElement('a');
                     link.href = student_file.url;
                     link.download = student_file.name;
                     document.body.appendChild(link);
                     link.click();
                     document.body.removeChild(link);
                   }}
                 >
                   <Download className="w-4 h-4" /> Download
                 </Button>
               </div>
            </div>
          )}

          {/* Questions Review */}
          {structured_questions && structured_questions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Detailed Review</h3>
              {structured_questions.map((q: any, index: number) => {
                const studentAns = answers?.[index];
                const isManual = q.type === 'written';
                
                // Determine correctness
                let isCorrect = false;
                if (status === 'released') {
                   const manualCorrect = manual_marking?.[index];
                   const autoCorrect = q.type === 'objective' && studentAns === q.correctAnswer;
                   isCorrect = manualCorrect !== undefined ? manualCorrect : autoCorrect;
                }

                return (
                  <div key={q.id || index} className={`p-4 rounded-xl border-l-4 ${status === 'released' ? (isCorrect ? 'border-l-green-500 bg-green-50/30' : 'border-l-red-500 bg-red-50/30') : 'border-l-gray-300 bg-gray-50'} border-y border-r shadow-sm`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-bold text-gray-500 uppercase">Question {index + 1}</span>
                      {status === 'released' && (
                        <div className="flex items-center gap-1">
                          {isCorrect ? (
                            <span className="flex items-center text-green-600 text-xs font-bold uppercase"><CheckCircle className="w-4 h-4 mr-1" /> Correct</span>
                          ) : (
                            <span className="flex items-center text-red-600 text-xs font-bold uppercase"><XCircle className="w-4 h-4 mr-1" /> Incorrect</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <p className="font-medium text-gray-800 mb-4">{q.text}</p>

                    <div className="space-y-3">
                      <div className="bg-white p-3 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Your Answer</p>
                        <p className="text-gray-700">
                           {isManual ? (studentAns || 'No response') : (studentAns !== undefined && q.options ? q.options[studentAns] : 'No answer')}
                        </p>
                      </div>
                      
                      {status === 'released' && !isCorrect && !isManual && q.type === 'objective' && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                          <p className="text-xs text-green-600 font-bold uppercase mb-1">Correct Answer</p>
                          <p className="text-green-800 font-medium">{q.options[q.correctAnswer]}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
