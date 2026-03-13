import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  BookOpen,
  PlayCircle,
  HelpCircle,
  File,
  History,
  ClipboardList,
  ArrowLeft,
  Download,
  ExternalLink,
  Clock,
  FileQuestion,
  Upload,
  Trash2,
  CheckCircle,
  ChevronRight,
  Sparkles,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import type { Student, User } from '../App';
import { AssessmentResultView } from './AssessmentResultView';
import { AIMode } from './AIMode';

interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  color: string;
  image: string;
}

type MaterialType = 'textbooks' | 'videos' | 'quiz' | 'examination' | 'pastQuestions' | 'assignments';

interface CourseMaterialsProps {
  course: Course;
  selectedMaterial: MaterialType | null;
  onMaterialSelect: (type: MaterialType) => void;
  onBack: () => void;
  user: Student | User; // Changed from userRole
  results: any[];
  assessments: any[];
}

interface UploadedMaterial {
  id: string;
  course_id: string;
  type: MaterialType;
  title: string;
  description?: string;
  file_name?: string;
  file_size?: string;
  url?: string;
  uploaded_by: string;
  approved: any; // Can be boolean or number (1/0)
  date: string;
  assigned_student_ids?: any;
}

const materialConfig = {
  textbooks: {
    icon: BookOpen,
    title: 'Textbooks',
    description: 'Access your course textbooks and reading materials',
    color: 'from-blue-500 to-cyan-500',
  },
  videos: {
    icon: PlayCircle,
    title: 'Video Lectures',
    description: 'Watch recorded lectures and tutorials',
    color: 'from-purple-500 to-violet-500',
  },
  quiz: {
    icon: HelpCircle,
    title: 'Quizzes',
    description: 'Test your knowledge with interactive quizzes',
    color: 'from-green-500 to-emerald-500',
  },
  examination: {
    icon: File,
    title: 'Examinations',
    description: 'Take your scheduled examinations',
    color: 'from-red-500 to-orange-500',
  },
  pastQuestions: {
    icon: History,
    title: 'Past Questions',
    description: 'Practice with previous year questions',
    color: 'from-yellow-500 to-amber-500',
  },
  assignments: {
    icon: ClipboardList,
    title: 'Assignments',
    description: 'View and submit your assignments',
    color: 'from-pink-500 to-rose-500',
  },
};

export function CourseMaterials({ course, selectedMaterial, onMaterialSelect, onBack, user, results, assessments }: CourseMaterialsProps) {
  const materials: MaterialType[] = ['textbooks', 'videos', 'quiz', 'examination', 'pastQuestions', 'assignments'];
  const userRole = user.role;
  const [uploadedMaterials, setUploadedMaterials] = useState<UploadedMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`;

  const fetchMaterials = async () => {
    try {
      const res = await fetch(`${API_URL}/api/materials`);
      if (res.ok) {
        setUploadedMaterials(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch materials", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
    const interval = setInterval(fetchMaterials, 10000);
    return () => clearInterval(interval);
  }, []);

  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [showAIMode, setShowAIMode] = useState(false);

  // Upload Form State
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newMaterialTitle, setNewMaterialTitle] = useState('');
  const [newMaterialDesc, setNewMaterialDesc] = useState('');
  const [newMaterialFile, setNewMaterialFile] = useState<File | null>(null);
  const [newMaterialLink, setNewMaterialLink] = useState('');
  const [videoUploadType, setVideoUploadType] = useState<'link' | 'file'>('link');

  const handleUpload = async () => {
    if (!selectedMaterial) return;
    if (!newMaterialTitle) {
      toast.error('Please enter a title.');
      return;
    }

    const processUpload = async (fileUrl?: string) => {
      const newMaterial = {
        id: `MAT${Date.now()}`,
        course_id: course.id,
        type: selectedMaterial,
        title: newMaterialTitle,
        description: newMaterialDesc,
        file_name: newMaterialFile?.name,
        file_size: newMaterialFile ? `${(newMaterialFile.size / (1024 * 1024)).toFixed(2)} MB` : undefined,
        url: fileUrl || newMaterialLink,
        uploaded_by: user.id,
        approved: user.role === 'admin' || user.role === 'sub-admin' ? 1 : 0,
        assigned_student_ids: [],
        date: new Date().toISOString().split('T')[0]
      };

      try {
        const res = await fetch(`${API_URL}/api/materials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMaterial)
        });

        if (res.ok) {
          toast.success('Material uploaded successfully.');
          setShowUploadDialog(false);
          setNewMaterialTitle('');
          setNewMaterialDesc('');
          setNewMaterialFile(null);
          setNewMaterialLink('');
          fetchMaterials();
        } else {
          toast.error('Upload failed');
        }
      } catch (e) {
        toast.error('Network error');
      }
    };

    if (newMaterialFile && (selectedMaterial !== 'videos' || videoUploadType === 'file')) {
      const formData = new FormData();
      formData.append('file', newMaterialFile);
      try {
        const uploadRes = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData
        });
        if (!uploadRes.ok) throw new Error('Upload Failed');
        const uploadData = await uploadRes.json();
        processUpload(uploadData.url);
      } catch (err) {
        toast.error('File upload failed');
      }
    } else {
      processUpload();
    }
  };

  const handleView = (item: UploadedMaterial) => {
    const isApproved = item.approved == 1 || item.approved === true;
    if (userRole === 'student' && !isApproved && item.uploaded_by !== user.id) {
      toast.info('Access Restricted: This material is awaiting admin approval.');
      return;
    }
    
    if (item.type === 'videos' && item.url) {
      if (item.url.includes('cloudinary.com') || item.url.startsWith('http')) {
        window.open(item.url, '_blank');
      } else if (item.url.startsWith('data:video')) {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${item.title}</title>
              <style>
                body { margin: 0; background-color: #000; display: flex; justify-content: center; align-items: center; height: 100vh; }
                video { max-width: 100%; max-height: 100%; }
              </style>
            </head>
            <body>
              <video controls autoplay src="${item.url}"></video>
            </body>
            </html>
          `);
          win.document.close();
        }
      } else {
        window.open(item.url, '_blank');
      }
    } else if (item.url) {
      const win = window.open();
      if (win) {
        if (item.url.startsWith('data:application/pdf')) {
             win.document.write(`<iframe src="${item.url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        } else {
             win.location.href = item.url;
        }
      }
    } else {
      toast.info('No content available to view.');
    }
  };

  const handleDownload = (item: UploadedMaterial) => {
    const isApproved = item.approved == 1 || item.approved === true;
    if (userRole === 'student' && !isApproved && item.uploaded_by !== user.id) {
      toast.info('Download Restricted: This material is awaiting admin approval.');
      return;
    }
    if (!item.url && item.type !== 'videos') {
      toast.error('No file data found for download.');
      return;
    }

    if (item.type === 'videos' || (item.url && item.url.includes('cloudinary.com'))) {
      window.open(item.url, '_blank');
      return;
    }

    const link = document.createElement('a');
    link.href = item.url!;
    link.download = (item as any).file_name || `${item.title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started.');
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/materials/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true })
      });
      if (res.ok) {
        toast.success('Material approved.');
        fetchMaterials();
      } else {
        toast.error('Approval failed.');
      }
    } catch (e) {
      toast.error('Action failed.');
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent handleView from triggering
    if (!confirm('Are you sure you want to delete this material?')) return;
    
    fetch(`${API_URL}/api/materials/${id}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          toast.success('Material deleted.');
          fetchMaterials();
        }
      })
      .catch(() => toast.error('Action failed.'));
  };

  const filteredMaterials = useMemo(() => {
    return uploadedMaterials.filter(m => {
      if (m.type !== selectedMaterial) return false;
    
      const isForThisCourse = m.course_id === course.id;
      const isGlobal = m.course_id === 'GLOBAL';
      if (!isForThisCourse && !isGlobal) return false;
    
      // Admin and Sub-Admin can see everything in the course/global context
      if (userRole === 'admin' || userRole === 'sub-admin') {
        // Apply search even for admin
        return m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
               (m.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      }
    
      // Student Visibility Logic
      const isApproved = m.approved == 1 || m.approved === true;
      const isMyOwnUpload = m.uploaded_by === user.id;
    
      if (!isApproved && !isMyOwnUpload) {
        return false; // Hide unapproved materials that aren't mine
      }
    
      // Handle materials assigned to specific students
      let assignedIds: string[] = [];
      try {
        if (typeof m.assigned_student_ids === 'string' && m.assigned_student_ids.length > 2) {
          assignedIds = JSON.parse(m.assigned_student_ids);
        } else if (Array.isArray(m.assigned_student_ids)) {
          assignedIds = m.assigned_student_ids;
        }
      } catch (e) {
        assignedIds = [];
      }
    
      // If a material has specific assignees, I must be one of them
      if (assignedIds.length > 0 && !assignedIds.includes(user.id)) {
        return false;
      }
    
      // Apply search
      return m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
             (m.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [uploadedMaterials, selectedMaterial, course.id, user.id, userRole, searchQuery]);

  if (selectedResult) {
    return <AssessmentResultView result={selectedResult} onBack={() => setSelectedResult(null)} />;
  }

  if (showAIMode && selectedMaterial) {
    return <AIMode type={selectedMaterial} onClose={() => setShowAIMode(false)} />;
  }

  // Filter results for this course and material type
  const relevantResults = (results || []).filter(r => {
    if (r.course_id !== course.id) return false;
    
    // Find assessment definition
    const assessmentDef = (assessments || []).find((a: any) => a.id === r.assessment_id);
    const type = assessmentDef?.type || r.assessment_type;
    
    // Check type if available, otherwise check title heuristic for legacy data
    if (selectedMaterial === 'quiz') {
      return type === 'quiz' || (!type && r.assessment_title.toLowerCase().includes('quiz'));
    }
    if (selectedMaterial === 'examination') {
      return type === 'examination' || (!type && (r.assessment_title.toLowerCase().includes('exam') || r.assessment_title.toLowerCase().includes('test')));
    }
    if (selectedMaterial === 'assignments') {
      return type === 'assignment' || (!type && r.assessment_title.toLowerCase().includes('assignment'));
    }
    return false;
  });

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-alamel-darkGray hover:text-alamel-blue"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Courses
      </Button>

      {!selectedMaterial ? (
        // Material Selection Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((type, index) => {
            const config = materialConfig[type];
            const Icon = config.icon;
            
            return (
              <Card
                key={type}
                onClick={() => onMaterialSelect(type)}
                className="group cursor-pointer hover:shadow-glow transition-all duration-500 hover:-translate-y-1 animate-slide-in-up"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <CardHeader className={`bg-gradient-to-r ${config.color} p-6`}>
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">{config.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-alamel-darkGray">{config.description}</p>
                  <div className="mt-4 flex items-center text-alamel-blue text-sm font-medium group-hover:gap-2 transition-all">
                    Access Now
                    <ExternalLink className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        // Selected Material Content
        <div className="space-y-6 animate-slide-in-right">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 bg-gradient-to-r ${materialConfig[selectedMaterial].color} rounded-xl flex items-center justify-center`}>
                {(() => {
                  const Icon = materialConfig[selectedMaterial].icon;
                  return <Icon className="w-6 h-6 text-white" />;
                })()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-alamel-darkBlue">
                  {materialConfig[selectedMaterial].title}
                </h2>
                <p className="text-alamel-darkGray text-sm">{course.name}</p>
              </div>
            </div>
            
            <div className="flex flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder={`Search ${materialConfig[selectedMaterial].title.toLowerCase()}...`} 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="pl-10 h-11 rounded-xl border-gray-200 bg-white/50 focus-visible:ring-blue-500 shadow-sm"
              />
            </div>

            <div className="flex gap-2">
              {(selectedMaterial === 'textbooks' || selectedMaterial === 'videos' || selectedMaterial === 'pastQuestions') && (
                <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-alamel-blue hover:bg-alamel-seaBlue text-white gap-2">
                      <Upload className="w-4 h-4" /> Upload {selectedMaterial === 'videos' ? 'Video' : 'Material'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload {materialConfig[selectedMaterial].title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input placeholder="Enter title..." value={newMaterialTitle} onChange={(e) => setNewMaterialTitle(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Description (Optional)</Label>
                        <Input placeholder="Enter description..." value={newMaterialDesc} onChange={(e) => setNewMaterialDesc(e.target.value)} />
                      </div>
                      {selectedMaterial === 'videos' && (
                        <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                          <button 
                            type="button"
                            onClick={() => setVideoUploadType('link')}
                            className={`flex-1 py-1 text-sm rounded-md transition-all ${videoUploadType === 'link' ? 'bg-white shadow-sm font-bold text-blue-600' : 'text-gray-500'}`}
                          > Online Link</button>
                          <button 
                            type="button"
                            onClick={() => setVideoUploadType('file')}
                            className={`flex-1 py-1 text-sm rounded-md transition-all ${videoUploadType === 'file' ? 'bg-white shadow-sm font-bold text-blue-600' : 'text-gray-500'}`}
                          > Local File</button>
                        </div>
                      )}
                      {selectedMaterial === 'videos' && videoUploadType === 'link' ? (
                        <div className="space-y-2">
                          <Label>Video Link / URL</Label>
                          <Input placeholder="https://youtube.com/watch?v=..." value={newMaterialLink} onChange={(e) => setNewMaterialLink(e.target.value)} />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>{selectedMaterial === 'videos' ? 'Video File' : 'File Upload'}</Label>
                          <Input 
                            type="file" 
                            accept={selectedMaterial === 'videos' ? "video/*" : ".pdf,.doc,.docx,.txt"}
                            onChange={(e) => setNewMaterialFile(e.target.files?.[0] || null)} 
                          />
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
                      <Button onClick={handleUpload} className="bg-alamel-blue text-white">Upload</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {(selectedMaterial === 'textbooks' || selectedMaterial === 'videos' || selectedMaterial === 'pastQuestions') && (
                <Button
                  className="relative bg-black hover:bg-black/90 text-white border-0 shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:shadow-[0_0_25px_rgba(236,72,153,0.6)] transition-all duration-300 group overflow-hidden"
                  onClick={() => setShowAIMode(true)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 group-hover:opacity-40 transition-opacity" />
                  <Sparkles className="w-4 h-4 mr-2 text-cyan-400 animate-pulse" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-white to-purple-400 font-bold relative z-10">
                    AI Mode
                  </span>
                </Button>
              )}
            </div>
          </div>

          {/* List of Uploaded Materials */}
          {(selectedMaterial === 'textbooks' || selectedMaterial === 'pastQuestions' || selectedMaterial === 'videos') ? (
            <div className={`grid gap-4 ${selectedMaterial === 'videos' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {filteredMaterials.length > 0 ? (
                filteredMaterials.map((item, index) => (
                  <Card 
                    key={item.id} 
                    className={`hover:shadow-md transition-all animate-slide-in-up group relative ${
                      (userRole === 'admin' || item.approved) ? 'cursor-pointer' : 'opacity-80'
                    }`} 
                    onClick={() => handleView(item)} 
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {selectedMaterial === 'videos' ? (
                      // Video Card
                      <>
                        <div className="relative h-40 bg-black/10 flex items-center justify-center overflow-hidden rounded-t-xl">
                          {item.url && item.url.includes('youtube.com') ? (
                            <img src={`https://img.youtube.com/vi/${item.url.split('v=')[1]?.split('&')[0]}/0.jpg`} alt="Thumbnail" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/300x200?text=No+Thumbnail')} />
                          ) : item.url && item.url.includes('youtu.be') ? (
                            <img src={`https://img.youtube.com/vi/${item.url.split('/').pop()}/0.jpg`} alt="Thumbnail" className="w-full h-full object-cover" />
                          ) : item.url && item.url.includes('cloudinary.com') && item.url.endsWith('.mp4') ? (
                            <div className="flex flex-col items-center gap-2">
                              <PlayCircle className="w-12 h-12 text-alamel-blue/50" />
                              <span className="text-[10px] text-gray-400 font-bold uppercase">Cloudinary Video</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <PlayCircle className="w-12 h-12 text-alamel-blue/50" />
                              <span className="text-[10px] text-gray-400 font-bold uppercase">Local Video File</span>
                            </div>
                          )}
                          <div className={`absolute inset-0 bg-black/20 transition-colors flex items-center justify-center ${
                            (userRole === 'admin' || item.approved) ? 'group-hover:bg-black/40' : ''
                          }`}>
                            {(userRole === 'admin' || item.approved) && (
                              <PlayCircle className="w-12 h-12 text-white opacity-80 group-hover:scale-110 transition-transform" />
                            )}
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h4 className="font-bold text-alamel-darkBlue line-clamp-1">{item.title}</h4>
                          <p className="text-xs text-alamel-darkGray mt-1 line-clamp-2">{item.description || 'No description'}</p>
                          <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                            <span>{item.date}</span>
                            <span>{item.uploaded_by}</span>
                          </div>
                        </CardContent>
                      </>
                    ) : (
                      // Document Card
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-alamel-lightBlue/10 rounded-xl flex items-center justify-center text-alamel-blue">
                            {selectedMaterial === 'textbooks' ? <BookOpen className="w-6 h-6" /> : <FileQuestion className="w-6 h-6" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-alamel-darkBlue">{item.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-alamel-darkGray mt-1">
                              <span>{item.description}</span>
                              {item.file_size && <span>• {item.file_size}</span>}
                              <span>• Uploaded by {item.uploaded_by}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!item.approved && userRole === 'student' && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">Pending Approval</Badge>
                          )}
                          {!item.approved && userRole === 'admin' && (
                            <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleApprove(item.id)}>
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                          )}
                          {(userRole === 'admin' || (!item.approved && item.uploaded_by === user.id)) && (
                            <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={(e) => handleDelete(e, item.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          {(userRole === 'admin' || item.approved) && (
                            <>
                              <Button variant="ghost" size="sm" className="text-alamel-blue" onClick={() => handleView(item)}>
                                <ExternalLink className="w-4 h-4 mr-1" /> View
                              </Button>
                              <Button variant="ghost" size="sm" className="text-alamel-blue" onClick={() => handleDownload(item)}>
                                <Download className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    )}
                    
                    {/* Admin/Pending Controls for Video Grid */}
                    {selectedMaterial === 'videos' && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        {!item.approved && (
                          <Badge className="bg-yellow-500 text-white shadow-sm">Pending</Badge>
                        )}
                        {userRole === 'admin' && !item.approved && (
                          <Button size="icon" className="h-6 w-6 rounded-full bg-green-500 text-white hover:bg-green-600" onClick={() => handleApprove(item.id)}>
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                        )}
                        {(userRole === 'admin' || (!item.approved && item.uploaded_by === user.id)) && (
                          <Button size="icon" className="h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600" onClick={(e) => handleDelete(e, item.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    {selectedMaterial === 'videos' ? <PlayCircle className="w-8 h-8" /> : <File className="w-8 h-8" />}
                  </div>
                  <h3 className="text-lg font-bold text-gray-700">NO MATERIALS UPLOADED YET</h3>
                  <p className="text-gray-500 mt-1 max-w-sm mx-auto">
                    Be the first to upload {materialConfig[selectedMaterial].title.toLowerCase()} for this course.
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Quiz/Exam/Assignment View: History + Start New
            <div className="space-y-8 animate-fade-in">
              {/* History Section */}
              {relevantResults.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-500" /> Assessment History
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {relevantResults.sort((a,b) => b.id.localeCompare(a.id)).map((result) => (
                      <Card 
                        key={result.id} 
                        className="cursor-pointer hover:shadow-md transition-all border border-gray-200 hover:border-blue-200"
                        onClick={() => setSelectedResult(result)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant={result.status === 'released' ? 'default' : 'outline'} className={result.status === 'released' ? 'bg-green-500' : 'text-gray-400'}>
                              {result.status === 'released' ? 'Graded' : 'Pending'}
                            </Badge>
                            <span className="text-xs text-gray-400 font-medium">{result.timestamp?.split(',')[0]}</span>
                          </div>
                          <h4 className="font-bold text-gray-800 line-clamp-1">{result.assessment_title}</h4>
                          <div className="mt-3 flex justify-between items-end">
                             {result.status === 'released' ? (
                                <div>
                                  <p className="text-2xl font-bold text-blue-600">{result.score}%</p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase">Score</p>
                                </div>
                             ) : (
                               <p className="text-sm text-gray-400 italic">Waiting for grade...</p>
                             )}
                             <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-800 p-0 h-auto">
                               Details <ChevronRight className="w-4 h-4 ml-1" />
                             </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Start New Section */}
              <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-white border-dashed border-2">
                <div className="w-20 h-20 bg-alamel-lightBlue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 text-alamel-blue" />
                </div>
                <h3 className="text-xl font-semibold text-alamel-darkBlue mb-2">
                  New Assessment Available?
                </h3>
                <p className="text-alamel-darkGray mb-6 max-w-md mx-auto">
                  Check if there are any new {materialConfig[selectedMaterial].title.toLowerCase()} assigned to you.
                </p>
                <Button 
                  onClick={() => {
                    if (user.role === 'student' && (user as Student).status === 'suspended') {
                      toast.error('Your account is currently suspended. You cannot participate in assessments.');
                    } else {
                      onMaterialSelect(selectedMaterial);
                    }
                  }}
                  className="bg-alamel-blue hover:bg-alamel-seaBlue text-white px-8"
                >
                  View Available {materialConfig[selectedMaterial].title}
                </Button>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
