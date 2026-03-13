import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardTitle, CardHeader, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MultiSelect, type Option } from '@/components/ui/multi-select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import type { User, Student } from '../App';
import {
  Users,
  Plus,
  Search,
  Trash2,
  LogOut,
  Shield,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Files,
  Download,
  Upload,
  Menu,
  Clock,
  GraduationCap,
  FolderLock,
  BookUser,
  CheckCircle,
  Eye,
  Activity as ActivityIcon,
  Key
} from 'lucide-react';

import { useIsMobile } from '@/hooks/use-mobile';

interface SubAdminDashboardProps {
  user: User;
  onLogout: () => void;
  onSwitchToStudent: () => void;
  onUpdateUser: (updatedUser: User, oldId?: string) => void;
}

interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  color: string;
  image: string;
}

interface AssessmentConfig {
  id:string;
  course_id: string;
  type: 'quiz' | 'examination' | 'assignment';
  title: string;
  mode: 'objectives' | 'written' | 'integrated' | 'file_upload';
  submission_mode: 'online' | 'file';
  duration: number;
  end_date: string;
  assigned_student_ids: string[];
}

interface UploadedMaterial {
  id: string;
  course_id: string;
  type: 'textbooks' | 'videos' | 'pastQuestions';
  title: string;
  url?: string;
  uploaded_by: string;
  approved: boolean;
  date: string;
  assigned_student_ids?: string[] | string;
}

export function SubAdminDashboard({ user, onLogout, onSwitchToStudent }: SubAdminDashboardProps) {
  const isMobile = useIsMobile();
  const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<AssessmentConfig[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [uploadedMaterials, setUploadedMaterials] = useState<UploadedMaterial[]>([]);
  const [regRequests, setRegRequests] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI State
  const [sidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAdminUploadDialog, setShowAdminUploadDialog] = useState(false);

  // Form States
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [generatedCredentials, setGeneratedCredentials] = useState<{id: string, password: string} | null>(null);

  // Assessment Form
  const [selectedCourse, setSelectedCourse] = useState('');
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [endDate, setEndDate] = useState('');
  const [assignedStudents, setAssignedStudents] = useState<string[]>([]);

  const [studentToAssign, setStudentToAssign] = useState('');
  const [courseToAssign, setCourseToAssign] = useState('');

  const [showAddCourseDialog, setShowAddCourseDialog] = useState(false);
  const [newCourse, setNewCourse] = useState({ id: '', name: '', code: '', instructor: '', color: 'from-blue-500 to-indigo-500', image: '/course-placeholder.svg' });

  const handleAddCourse = async () => {
    if (!newCourse.id || !newCourse.name || !newCourse.code) {
      toast.error('Required fields missing');
      return;
    }
    const res = await fetch(`${API_URL}/api/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCourse)
    });
    if (res.ok) {
      fetchData();
      setShowAddCourseDialog(false);
      setNewCourse({ id: '', name: '', code: '', instructor: '', color: 'from-blue-500 to-indigo-500', image: '/course-placeholder.svg' });
      toast.success('Course Created');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure? This will also remove student enrollments for this course.')) return;
    const res = await fetch(`${API_URL}/api/courses/${id}`, { method: 'DELETE' });
    if (res.ok) { fetchData(); toast.success('Course Deleted'); }
  };

  // Material Upload
  const [adminNewMaterialTitle, setAdminNewMaterialTitle] = useState('');
  const [adminNewMaterialFile, setAdminNewMaterialFile] = useState<File | null>(null);
  const [adminNewMaterialLink, setAdminNewMaterialLink] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'file' | 'link'>('file');
  const [adminSelectedCourseId, setAdminSelectedCourseId] = useState('');
  const [adminSelectedMaterialType, setAdminSelectedMaterialType] = useState<'textbooks' | 'videos' | 'pastQuestions'>('textbooks');
  const [adminSelectedStudentIds, setAdminSelectedStudentIds] = useState<string[]>([]);

  const [newAssessmentQuestions, setNewAssessmentQuestions] = useState<any[]>([]);
  const [globalAssessmentMode, setGlobalAssessmentMode] = useState<'objective' | 'written' | 'integrated'>('objective');

  const addQuestion = () => {
    setNewAssessmentQuestions([...newAssessmentQuestions, { 
      id: Date.now().toString(), 
      type: globalAssessmentMode, 
      text: '', 
      objectiveText: '',
      modelAnswer: '',
      options: ['', '', '', ''], 
      correctAnswer: 0,
      activeTab: 'objective'
    }]);
  };

  const handleGlobalModeChange = (val: 'objective' | 'written' | 'integrated') => {
    setGlobalAssessmentMode(val);
    setNewAssessmentQuestions(newAssessmentQuestions.map(q => ({ ...q, type: val, activeTab: val === 'written' ? 'written' : 'objective' })));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...newAssessmentQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setNewAssessmentQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setNewAssessmentQuestions(newAssessmentQuestions.filter((_, i) => i !== index));
  };

  // Fetch all data from MySQL
  const fetchData = async () => {
    try {
      const [coursesRes, studentsRes, assessmentsRes, resultsRes, materialsRes, regRes, activityRes] = await Promise.all([
        fetch(`${API_URL}/api/courses`),
        fetch(`${API_URL}/api/students`),
        fetch(`${API_URL}/api/assessments`),
        fetch(`${API_URL}/api/results`),
        fetch(`${API_URL}/api/materials`),
        fetch(`${API_URL}/api/reg-requests`),
        fetch(`${API_URL}/api/activity`)
      ]);

      if (coursesRes.ok) setCourses(await coursesRes.json());
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        const parsedStudents = data.map((s: any) => {
          let details = s.details;
          for (let i = 0; i < 3; i++) {
            if (typeof details === 'string' && details.length > 0) {
              try {
                const parsed = JSON.parse(details);
                if (typeof parsed === 'object' || typeof parsed === 'string') {
                  if (parsed === details) break;
                  details = parsed;
                } else break;
              } catch (e) { break; }
            } else break;
          }
          return { ...s, details };
        });
        setStudents(parsedStudents);

        // Refresh selected student to update enrollment view
        setSelectedStudent(prev => {
          if (!prev) return null;
          const updated = parsedStudents.find((s: any) => s.id === prev.id);
          return updated || prev;
        });
      }
      if (assessmentsRes.ok) setAssessments(await assessmentsRes.json());
      if (resultsRes.ok) setResults(await resultsRes.json());
      if (materialsRes.ok) setUploadedMaterials(await materialsRes.json());
      if (regRes.ok) {
        const allReqs = await regRes.json();
        setRegRequests(allReqs.filter((r: any) => r.admin_code === user.id));
      }
      if (activityRes.ok) {
        const allLogs = await activityRes.json();
        setActivityLogs(allLogs.filter((l: any) => l.user_id === user.id || l.details.includes(user.id)));
      }
    } catch (error) { console.error("Sync error", error); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [user.id]);

  // Derived Data
  const myStudents = students.filter(s => {
    const creatorId = (s as any).created_by || '';
    return creatorId.toUpperCase() === user.id.toUpperCase();
  });
  const filteredStudents = myStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase()));
  const studentOptions: Option[] = myStudents.map(s => ({ label: s.name, value: s.id }));

  // Action Handlers
  const handleAddStudent = async () => {
    if (!newStudentName) {
      toast.error('Student Name is required');
      return;
    }
    
    // Auto-generate ID if not provided manually
    let finalId = newStudentId;
    if (!finalId) {
      finalId = 'STU' + Math.floor(1000 + Math.random() * 9000);
    }
    
    // Default password if not provided
    const finalPassword = newStudentPassword || 'student123';

    const student = { 
      id: finalId.toUpperCase(), 
      name: newStudentName.toUpperCase(), 
      role: 'student', 
      password: finalPassword, 
      status: 'active', 
      created_by: user.id 
    };
    try {
      const res = await fetch(`${API_URL}/api/students`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(student) 
      });
      if (res.ok) { 
        fetchData(); 
        setShowAddDialog(false); 
        setNewStudentName('');
        setNewStudentId('');
        setNewStudentPassword('');
        setGeneratedCredentials(null);
        toast.success(`Student ${finalId} Created Successfully`); 
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to create student');
      }
    } catch (e) {
      toast.error('Network error occurred');
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    const res = await fetch(`${API_URL}/api/students/${selectedStudent.id}`, { method: 'DELETE' });
    if (res.ok) { fetchData(); setShowDeleteDialog(false); toast.success('Deleted'); }
  };

  const handleApproveRequest = async (req: any) => {
    const id = (req.role === 'student' ? 'STU' : 'ADM') + Math.floor(1000 + Math.random() * 8999);
    const pass = Math.floor(100000 + Math.random() * 899999).toString();
    
    const userData = { 
      id, 
      name: req.name, 
      password: pass, 
      role: req.role, 
      status: 'active', 
      email: req.email, 
      contact: req.phone,
      details: req.details,
      created_by: user.id 
    };

    try {
      const endpoint = req.role === 'student' ? '/api/students' : '/api/subadmins';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (res.ok) {
        await fetch(`${API_URL}/api/reg-requests/${req.id}`, { method: 'DELETE' });
        fetchData();
        toast.success(`Authorized as ${id}`);
      }
    } catch (e) {
      toast.error('Authorization failed');
    }
  };

  const handleRejectRequest = async (req: any) => {
    try {
      await fetch(`${API_URL}/api/reg-requests/${req.id}`, { method: 'DELETE' });
      fetchData();
      toast.error('Unauthorized and Removed');
    } catch (e) {
      toast.error('Action failed');
    }
  };

  const handleCreateAssessment = async () => {
    if (!selectedCourse || !assessmentTitle || !endDate) {
      toast.error('Required fields missing (Course, Title, Deadline)');
      return;
    }
    const config = { 
      id: `ASMT${Date.now()}`, 
      course_id: selectedCourse, 
      type: 'quiz', 
      title: assessmentTitle, 
      mode: 'objectives', 
      submission_mode: 'online', 
      structured_questions: newAssessmentQuestions, 
      duration, 
      start_date: new Date().toISOString(), 
      end_date: new Date(endDate).toISOString(), 
      assigned_student_ids: assignedStudents 
    };
    const res = await fetch(`${API_URL}/api/assessments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
    if (res.ok) { 
      fetchData(); 
      toast.success('Assessment Published with ' + newAssessmentQuestions.length + ' questions');
      setNewAssessmentQuestions([]);
      setAssessmentTitle('');
    }
  };

  const handleAssignCourse = async () => {
    if (!studentToAssign || !courseToAssign) return;
    const res = await fetch(`${API_URL}/api/enrollments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: studentToAssign, course_id: courseToAssign }) });
    if (res.ok) { fetchData(); toast.success('Assigned'); }
  };

  const handleAdminUpload = async () => {
    if (!adminNewMaterialTitle || !adminSelectedCourseId) {
      toast.error('Title and Course selection are mandatory');
      return;
    }
    if (uploadMethod === 'link' && !adminNewMaterialLink) {
      toast.error('Asset Link is required');
      return;
    }

    if (uploadMethod === 'file' && !adminNewMaterialFile) {
      toast.error('Asset File is required');
      return;
    }
    
    const process = async (fileData?: string) => {
      // Size validation
      if (uploadMethod === 'file' && adminNewMaterialFile) {
        const sizeMB = adminNewMaterialFile.size / (1024 * 1024);
        let limit = 50; // Default for textbooks and past questions
        if (adminSelectedMaterialType === 'videos') limit = 150;
        
        if (sizeMB > limit) {
          toast.error(`File too large. Maximum size for ${adminSelectedMaterialType} is ${limit}MB`);
          return;
        }
      }

      const mat = {
        id: `MAT${Date.now()}`,
        course_id: adminSelectedCourseId,
        type: adminSelectedMaterialType,
        title: adminNewMaterialTitle,
        url: uploadMethod === 'link' ? adminNewMaterialLink : fileData,
        uploaded_by: user.name,
        approved: true, // Sub-admin uploads are auto-approved
        date: new Date().toISOString().split('T')[0],
        assigned_student_ids: adminSelectedStudentIds
      };

      try {
        const res = await fetch(`${API_URL}/api/materials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mat),
        });
        if (res.ok) {
          fetchData();
          setShowAdminUploadDialog(false);
          toast.success('Asset Deployed');
          // Reset form
          setAdminNewMaterialTitle('');
          setAdminNewMaterialLink('');
          setAdminSelectedCourseId('');
          setAdminSelectedStudentIds([]);
          setAdminNewMaterialFile(null);
          setUploadMethod('file');
        } else {
          toast.error('Deployment failed');
        }
      } catch (e) {
        toast.error('Network Error');
      }
    };

    if (uploadMethod === 'file' && adminNewMaterialFile) {
      const reader = new FileReader();
      reader.onload = (e) => process(e.target?.result as string);
      reader.readAsDataURL(adminNewMaterialFile);
    } else {
      process();
    }
  };

  const handleView = (item: UploadedMaterial) => {
    if (item.type === 'videos' && item.url) {
      if (item.url.startsWith('data:video')) {
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
    if (!item.url && item.type !== 'videos') {
      toast.error('No file data found for download.');
      return;
    }
    if (item.type === 'videos') {
      window.open(item.url, '_blank');
      return;
    }
    const link = document.createElement('a');
    link.href = item.url!;
    link.download = item.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started.');
  };

  const sidebarItems = [
    { icon: Users, label: 'Students', value: 'students' },
    { icon: Shield, label: 'AC Center', value: 'ac-center' },
    { icon: FolderLock, label: 'SCM Management', value: 'scm-management' },
    { icon: Clock, label: 'Assessment', value: 'timer' },
    { icon: CheckCircle, label: 'Results', value: 'results' },
    { icon: ActivityIcon, label: 'Activity', value: 'activity' },
    { icon: Key, label: 'ID Generator', value: 'generator' }
  ];

  const getStatusBadge = (s: string) => {
    const colors: any = { active: 'bg-green-500', inactive: 'bg-gray-400', suspended: 'bg-red-500' };
    return <Badge className={cn(colors[s] || 'bg-blue-500', "font-semibold")}>{s.toUpperCase()}</Badge>;
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-blue-600 animate-pulse uppercase tracking-widest text-lg font-semibold">Sub-Admin System Sync...</div>;

  return (
    <div className="min-h-screen flex bg-gray-50 relative font-inter antialiased">
      <aside className={`fixed left-0 top-0 h-full bg-blue-700 shadow-2xl z-50 transition-all duration-500 ${isMobile ? (mobileMenuOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full') : (sidebarCollapsed ? 'w-20' : 'w-64')}`}>
        <div className="h-24 flex items-center justify-center border-b border-white/10 bg-black/10">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mr-3 shadow-2xl overflow-hidden border-2 border-white/20">
            <img src="/favicon.png" alt="Logo" className="w-full h-full object-cover rounded-xl scale-[1.5]" />
          </div> 
          {!sidebarCollapsed && <span className="text-2xl text-white uppercase tracking-tighter font-black italic">AlaMel</span>}
        </div>
        <ScrollArea className="flex-1 h-[calc(100vh-180px)] py-6">
          <nav className="px-4 space-y-3">
            {sidebarItems
              .filter(item => {
                if (user.status === 'suspended') return item.value === 'students';
                return true;
              })
              .map(item => (
              <button key={item.value} onClick={() => { setActiveTab(item.value); if(isMobile) setMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 ${activeTab === item.value ? 'bg-white text-blue-700 shadow-[0_10px_20px_rgba(0,0,0,0.1)] scale-[1.02] font-bold' : 'text-white/70 hover:bg-white/10 hover:text-white font-medium'}`}>
                <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-transform", activeTab === item.value && "scale-110")} /> 
                {!sidebarCollapsed && <span className="text-[11px] uppercase tracking-[0.1em]">{item.label}</span>}
              </button>
            ))}
          </nav>
        </ScrollArea>
        <div className="p-6 border-t border-white/10 bg-black/10">
          <button onClick={onLogout} className="w-full flex items-center gap-4 p-4 text-white/80 hover:bg-red-500 hover:text-white transition-all duration-300 rounded-2xl group font-bold">
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
            {!sidebarCollapsed && <span className="text-[11px] uppercase tracking-[0.1em]">Logout</span>}
          </button>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-500 ${isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-20' : 'ml-64')}`}>
        <header className="h-24 bg-white/80 backdrop-blur-xl shadow-sm px-10 flex items-center justify-between sticky top-0 z-30 border-b border-gray-100">
          <div className="flex items-center gap-6">
            {isMobile && <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="text-gray-900"><Menu className="w-7 h-7" /></Button>}
            <h1 className="text-xl text-gray-900 uppercase tracking-tight font-black italic border-l-4 border-blue-600 pl-4">{activeTab === 'timer' ? 'Assessment' : activeTab.replace('-', ' ')}</h1>
          </div>
          <div className="flex items-center gap-6">
            <Button onClick={onSwitchToStudent} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] px-8 h-12 font-black tracking-widest shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95">STUDENT VIEW</Button>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest leading-none">Sub-Admin</p>
                <p className="text-sm font-bold text-gray-900">{user.name}</p>
              </div>
              <Avatar className="h-12 w-12 border-2 border-blue-100 shadow-xl ring-2 ring-white hover:scale-110 transition-transform cursor-pointer">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white uppercase text-sm font-black italic">{user.name[0]}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto space-y-10 animate-fade-in">
          {activeTab === 'students' && (
            <div className="space-y-8">
              <Card className="rounded-[32px] p-8 border-none shadow-xl bg-white">
                <CardTitle className="text-lg uppercase tracking-tight text-gray-800 mb-8 font-semibold">Enroll Students in Courses</CardTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-gray-400 uppercase font-semibold">Identify Student Profile</Label>
                    <MultiSelect 
                      options={students.map(s => ({ label: `${s.name} (${s.id})`, value: s.id }))}
                      selected={Array.isArray(studentToAssign) ? studentToAssign : studentToAssign ? [studentToAssign] : []}
                      onChange={(val) => setStudentToAssign(val as any)}
                      placeholder="Select Profiles"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-gray-400 uppercase font-semibold">Select Subject</Label>
                    <MultiSelect 
                      options={courses.map(c => ({ label: c.name, value: c.id }))}
                      selected={Array.isArray(courseToAssign) ? courseToAssign : courseToAssign ? [courseToAssign] : []}
                      onChange={(val) => setCourseToAssign(val as any)}
                      placeholder="Select Subjects"
                    />
                  </div>
                  <Button onClick={async () => {
                    const studentIds = Array.isArray(studentToAssign) ? studentToAssign : [studentToAssign];
                    const course_ids = Array.isArray(courseToAssign) ? courseToAssign : [courseToAssign];
                    if (studentIds.length === 0 || course_ids.length === 0) {
                      toast.error('Please select at least one student and one subject');
                      return;
                    }
                    let successCount = 0;
                    for (const sId of studentIds) {
                      for (const cId of course_ids) {
                        const res = await fetch(`${API_URL}/api/enrollments`, { 
                          method: 'POST', 
                          headers: { 'Content-Type': 'application/json' }, 
                          body: JSON.stringify({ student_id: sId, course_id: cId }) 
                        });
                        if (res.ok) successCount++;
                      }
                    }
                    fetchData();
                    toast.success(`Access Authorized for ${successCount} assignments`);
                    setStudentToAssign([] as any);
                    setCourseToAssign([] as any);
                  }} className="h-12 bg-blue-600 text-white rounded-xl shadow-lg text-xs font-semibold uppercase tracking-widest transition-all hover:scale-105 active:scale-95">AUTHORIZE ACCESS</Button>
                </div>
              </Card>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="relative flex-1 max-w-md w-full">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input placeholder="Search student records..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-14 rounded-[20px] h-14 bg-white border-none shadow-lg text-sm font-bold placeholder:font-medium placeholder:text-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 transition-all" />
                </div>
                <Button 
                  onClick={() => setShowAddDialog(true)} 
                  disabled={user.status === 'suspended'}
                  className="bg-blue-700 hover:bg-blue-800 text-white rounded-[20px] h-14 px-10 shadow-xl shadow-blue-100 text-[10px] font-black tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50 w-full sm:w-auto"
                >
                  <Plus className="w-5 h-5 mr-3 stroke-[3px]" /> ADD STUDENT
                </Button>
              </div>

              <Card className="rounded-[40px] overflow-hidden border-none shadow-2xl bg-white/90 backdrop-blur-md">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow className="border-b border-gray-100">
                      <TableHead className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Identity Profile</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Status</TableHead>
                      <TableHead className="text-right px-10 text-[10px] font-black uppercase tracking-widest text-gray-400">Control</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map(s => (
                      <TableRow key={s.id} className="hover:bg-blue-50/50 cursor-pointer border-b border-gray-50 transition-colors" onClick={() => { setSelectedStudent(s); setActiveTab('student-workspace'); }}>
                        <TableCell className="px-10 py-8">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-700 font-black text-lg shadow-inner border border-blue-100/50">
                              {s.id.slice(-2)}
                            </div>
                            <div>
                              <p className="text-base font-black text-gray-900 tracking-tight">{s.name}</p>
                              <p className="text-[11px] text-blue-600 font-black tracking-widest mt-0.5">{s.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(s.status)}</TableCell>
                        <TableCell className="text-right px-10">
                          {user.status === 'suspended' ? (
                            <span className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] bg-gray-100 px-4 py-2 rounded-full">Secure View</span>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setSelectedStudent(s); setShowDeleteDialog(true); }} className="text-red-500 hover:bg-red-50 hover:text-red-600 rounded-2xl h-12 w-12 transition-all">
                              <Trash2 className="w-5 h-5 stroke-[2.5px]" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {activeTab === 'student-workspace' && selectedStudent && (
            <div className="space-y-10 animate-fade-in">
              <button onClick={() => setActiveTab('students')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back to student records
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <Card className="rounded-[40px] p-10 border-none shadow-2xl bg-blue-700 text-white relative overflow-hidden h-full">
                  <img src="/favicon.png" className="absolute -right-10 -bottom-10 w-48 h-48 opacity-10 rotate-12 grayscale" />
                  <div className="relative z-10">
                    <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-3xl font-black italic shadow-2xl mb-8">{selectedStudent.name[0]}</div>
                    <h2 className="text-3xl font-black italic tracking-tighter mb-1 uppercase leading-none">{selectedStudent.name}</h2>
                    <p className="text-white/50 text-xs font-black tracking-widest mb-10 uppercase">{selectedStudent.id}</p>
                    
                    <div className="space-y-6">
                      <div className="space-y-1"><p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-black">Access Credentials</p><p className="text-xl font-black tracking-tight">{selectedStudent.password}</p></div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                          <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-black">Contact Info</p>
                          <p className="text-xs font-bold">{selectedStudent.email || 'NO_EMAIL_LINKED'}</p>
                          <p className="text-xs font-bold">{selectedStudent.contact || 'NO_PHONE_LINKED'}</p>
                        </div>
                      </div>
                      
                      {(() => {
                        let details: any = (selectedStudent as any).details;
                        
                        // Handle potential multiple layers of stringification
                        for (let i = 0; i < 3; i++) {
                          if (typeof details === 'string' && details.length > 0) {
                            try {
                              const parsed = JSON.parse(details);
                              if (typeof parsed === 'object' || typeof parsed === 'string') {
                                if (parsed === details) break;
                                details = parsed;
                              } else {
                                break;
                              }
                            } catch (e) {
                              break;
                            }
                          } else {
                            break;
                          }
                        }
                        
                        if (!details || typeof details !== 'object') return null;

                        return (
                          <div className="pt-6 border-t border-white/10 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1"><p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-black">Education Level</p><p className="text-xs font-black uppercase">{details.educationLevel || details.level || 'N/A'}</p></div>
                              <div className="space-y-1"><p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-black">Target Class</p><p className="text-xs font-black uppercase">{details.studentClass || details.class || 'N/A'}</p></div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-black">Subjects to Prepare</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {Array.isArray(details.coursesToPrepare) ? details.coursesToPrepare.map((c: string) => (
                                  <span key={c} className="text-[8px] bg-white/10 px-3 py-1 rounded-full font-black uppercase tracking-widest">{c}</span>
                                )) : <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">NONE_SPECIFIED</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="space-y-2 pt-6 border-t border-white/10"><p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-black">System Status</p><div>{getStatusBadge(selectedStudent.status)}</div></div>
                    </div>
                  </div>
                </Card>

                <Card className="lg:col-span-2 rounded-[40px] p-10 border-none shadow-2xl bg-white relative h-full">
                  <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-50">
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight italic text-gray-900 leading-none">Assessment Analytics</h3>
                      <p className="text-[9px] text-gray-400 uppercase tracking-[0.2em] mt-2 font-black">Live Performance Records</p>
                    </div>
                    <div className="flex gap-8">
                      <div className="text-right"><p className="text-2xl font-black text-blue-600 tracking-tighter leading-none">{results.filter(r => r.student_id === selectedStudent.id).length}</p><p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mt-1">SESSIONS</p></div>
                      <div className="text-right pl-8 border-l-2 border-gray-50"><p className="text-2xl font-black text-green-600 tracking-tighter leading-none">{Math.round(results.filter(r => r.student_id === selectedStudent.id).reduce((acc, curr) => acc + curr.score, 0) / (results.filter(r => r.student_id === selectedStudent.id).length || 1))}%</p><p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mt-1">AVG_SCORE</p></div>
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[400px] pr-6">
                    <Table>
                      <TableHeader className="bg-gray-50/50">
                        <TableRow className="border-none">
                          <TableHead className="py-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Target Assessment</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Outcome</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Visibility</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.filter(r => r.student_id === selectedStudent.id).length > 0 ? (
                          results.filter(r => r.student_id === selectedStudent.id).map(r => (
                            <TableRow key={r.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                              <TableCell className="py-6"><p className="text-gray-900 uppercase text-xs font-black tracking-tight">{r.assessment_title}</p><p className="text-[9px] text-blue-600 font-black tracking-widest mt-1">{r.course_name}</p></TableCell>
                              <TableCell className="text-center"><span className={`text-xl font-black tracking-tighter ${r.score >= 50 ? 'text-green-600' : 'text-red-600'}`}>{r.score}%</span></TableCell>
                              <TableCell className="text-right"><Badge className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-xl shadow-lg shadow-blue-50 ${r.status === 'released' ? 'bg-green-500' : 'bg-orange-500'}`}>{r.status}</Badge></TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={3} className="text-center py-24 text-gray-300 text-[10px] font-black uppercase tracking-[0.3em] italic">No Academic Records Identified</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              </div>

              <Card className="rounded-[40px] p-10 border-none shadow-2xl bg-white relative overflow-hidden">
                <BookUser className="absolute -right-10 -bottom-10 w-64 h-64 text-gray-50 -rotate-12" />
                <div className="relative z-10">
                  <h3 className="text-xl font-black uppercase tracking-tight italic text-gray-900 mb-8 border-l-8 border-blue-600 pl-6">Course Enrollment Map</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.filter(c => selectedStudent.courses?.includes(c.id)).map(c => (
                      <div key={c.id} className="p-6 rounded-[32px] bg-gray-50/50 border-2 border-transparent hover:border-blue-600 hover:bg-white transition-all duration-300 flex justify-between items-center group shadow-sm">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center text-blue-700 font-black text-lg italic border border-gray-100">{c.code[0]}</div>
                          <div>
                            <p className="text-gray-900 uppercase font-black tracking-tight text-sm leading-tight mb-1">{c.name}</p>
                            <p className="text-[10px] text-gray-400 font-black tracking-[0.2em]">{c.code}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => fetch(`${API_URL}/api/enrollments/${selectedStudent.id}/${c.id}`, {method:'DELETE'}).then(() => fetchData())} className="text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all hover:scale-110"><Trash2 className="w-5 h-5 stroke-[2.5px]" /></Button>
                      </div>
                    ))}
                    {courses.filter(c => selectedStudent.courses?.includes(c.id)).length === 0 && (
                      <div className="lg:col-span-3 h-40 rounded-[40px] border-2 border-dashed border-gray-100 flex items-center justify-center text-gray-300 uppercase text-[10px] font-black tracking-[0.3em] italic bg-gray-50/30">No Active Module Access Authorized</div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'reg-requests' && (
            <Card className="rounded-[32px] border-none shadow-2xl p-8 bg-white/80 backdrop-blur-sm overflow-hidden font-semibold">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xl uppercase tracking-tight text-gray-800 font-semibold">Registration Queue</h2>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 font-semibold">Review and Authorize Entry Requests</p>
                </div>
              </div>
              <Table>
                <TableHeader className="bg-gray-50/50 border-b-2">
                  <TableRow>
                    <TableHead className="px-8 py-6 text-gray-400 uppercase text-[10px] font-semibold">Candidate Profile</TableHead>
                    <TableHead className="text-gray-400 uppercase text-[10px] text-center font-semibold">Identity Role</TableHead>
                    <TableHead className="text-gray-400 uppercase text-[10px] text-center font-semibold">Academic Path</TableHead>
                    <TableHead className="text-right px-8 text-gray-400 uppercase text-[10px] font-semibold">Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regRequests.filter(r => r.role === 'student').map(r => (
                    <TableRow key={r.id} className="border-b hover:bg-blue-50/50 transition-colors">
                      <TableCell className="px-8 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-lg font-semibold shadow-inner">{r.name[0]}</div>
                          <div>
                            <p className="text-lg text-gray-800 tracking-tight font-semibold leading-none mb-1">{r.name}</p>
                            <p className="text-[10px] text-gray-400 font-semibold mb-1">{r.email}</p>
                            <p className="text-[10px] text-blue-600 font-black tracking-widest uppercase">{r.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="rounded-full px-4 py-1 text-[8px] font-black tracking-[0.1em] uppercase bg-blue-100 text-blue-700">
                          {r.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-block text-left">
                          <p className="text-[10px] text-gray-800 font-bold uppercase">{r.details?.educationLevel} • {r.details?.studentClass}</p>
                          <div className="flex gap-1 mt-1">
                            {r.details?.coursesToPrepare?.map((c: string) => (
                              <span key={c} className="text-[7px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 font-black uppercase">{c}</span>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-8">
                        <div className="flex justify-end gap-3">
                          <Button onClick={() => handleApproveRequest(r)} className="bg-green-500 hover:bg-green-600 text-white px-8 rounded-2xl h-12 shadow-xl shadow-green-100 text-[10px] font-black tracking-widest transition-all hover:scale-105 active:scale-95 uppercase">Authorize</Button>
                          <Button variant="ghost" onClick={() => handleRejectRequest(r)} className="text-red-400 hover:text-red-600 h-12 px-6 text-[10px] font-black tracking-widest uppercase rounded-2xl">Reject</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {regRequests.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-20 text-gray-400 italic text-sm font-semibold">No pending requests</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Card>
          )}

          {activeTab === 'timer' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left: Configuration Card */}
                <Card className="lg:col-span-1 rounded-[32px] p-8 border-none shadow-xl bg-white h-full">
                  <CardHeader className="p-0 mb-8">
                    <CardTitle className="text-lg uppercase font-semibold">Assessment Configuration</CardTitle>
                    <CardDescription className="text-[10px] uppercase text-gray-400 font-semibold">Define module test parameters</CardDescription>
                  </CardHeader>
                  <div className="space-y-6">
                    <div className="space-y-2"><Label className="text-[10px] text-gray-400 uppercase font-semibold">Target Course</Label><Select value={selectedCourse} onValueChange={setSelectedCourse}><SelectTrigger className="h-12 rounded-2xl border-2 font-semibold"><SelectValue placeholder="Select Module" /></SelectTrigger><SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id} className="font-semibold">{c.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-[10px] text-gray-400 uppercase font-semibold">Assessment Title</Label><Input value={assessmentTitle} onChange={e => setAssessmentTitle(e.target.value)} className="h-12 rounded-2xl border-2 font-semibold" /></div>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2"><Label className="text-[10px] text-gray-400 uppercase font-semibold">Deadline</Label><Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-12 rounded-2xl border-2 font-semibold" /></div>
                      <div className="space-y-2"><Label className="text-[10px] text-gray-400 uppercase font-semibold">Duration (Min)</Label><Input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="h-12 rounded-2xl border-2 font-semibold" /></div>
                    </div>
                    <div className="space-y-2"><Label className="text-[10px] text-gray-400 uppercase font-semibold">Assign To</Label><MultiSelect options={studentOptions} selected={assignedStudents} onChange={setAssignedStudents} placeholder="Select students..." /></div>
                    
                    <Button onClick={handleCreateAssessment} className="w-full bg-blue-600 text-white h-14 rounded-2xl shadow-lg uppercase transition-all text-xs font-black tracking-widest italic mt-4">
                      DEPLOY ASSESSMENT
                    </Button>
                  </div>
                </Card>

                {/* Right: Questions Builder Card (Replacement) */}
                <Card className="lg:col-span-2 rounded-[32px] p-8 border-none shadow-xl bg-white h-full min-h-[600px]">
                  <div className="flex justify-between items-center mb-8 pb-4 border-b">
                    <div>
                      <CardTitle className="text-lg uppercase font-semibold">Questions</CardTitle>
                      <CardDescription className="text-[10px] uppercase text-gray-400 font-semibold">Build assessment content ({newAssessmentQuestions.length} added)</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-[10px] uppercase text-gray-400 font-black">Assessment Mode:</Label>
                      <Select value={globalAssessmentMode} onValueChange={handleGlobalModeChange}>
                        <SelectTrigger className="h-10 w-48 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-2xl border-2">
                          <SelectItem value="objective" className="font-bold text-[10px] uppercase">Objective (MCQ)</SelectItem>
                          <SelectItem value="written" className="font-bold text-[10px] uppercase">Written (Essay)</SelectItem>
                          <SelectItem value="integrated" className="font-bold text-[10px] uppercase">Integrated (Mixed)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <ScrollArea className="h-[700px] pr-4">
                    <div className="space-y-8">
                      {newAssessmentQuestions.map((q, idx) => (
                        <div key={q.id} className="p-6 rounded-3xl border-2 bg-gray-50/30 space-y-6 relative group">
                          <Button variant="ghost" size="icon" onClick={() => removeQuestion(idx)} className="absolute top-4 right-4 h-10 w-10 rounded-full bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-md">
                            <Trash2 className="w-5 h-5" />
                          </Button>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest bg-white px-4 py-1.5 rounded-full border shadow-sm">Question {idx + 1}</span>
                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-white border-2">Mode: {q.type}</Badge>
                          </div>

                          {q.type === 'integrated' && (
                            <div className="flex bg-gray-100/50 p-1 rounded-2xl w-fit border shadow-inner">
                              <button 
                                onClick={() => updateQuestion(idx, 'activeTab', 'objective')}
                                className={cn("px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", q.activeTab !== 'written' ? "bg-white text-blue-700 shadow-md" : "text-gray-400 hover:text-gray-600")}
                              >MCQ COMPONENT</button>
                              <button 
                                onClick={() => updateQuestion(idx, 'activeTab', 'written')}
                                className={cn("px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", q.activeTab === 'written' ? "bg-white text-blue-600 shadow-md" : "text-gray-400 hover:text-gray-600")}
                              >WRITTEN COMPONENT</button>
                            </div>
                          )}

                          {((q.type === 'written') || (q.type === 'integrated' && q.activeTab === 'written')) && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                              <Label className="text-[10px] uppercase text-gray-400 font-bold ml-1">Question Prompt (Written Part)</Label>
                              <Textarea 
                                value={q.text} 
                                onChange={e => updateQuestion(idx, 'text', e.target.value)} 
                                className="min-h-[100px] rounded-2xl border-2 font-medium text-sm resize-none p-4" 
                                placeholder="Type the essay question or context here..."
                              />
                            </div>
                          )}

                          {(q.type === 'written' || (q.type === 'integrated' && q.activeTab === 'written')) && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                              <Label className="text-[10px] uppercase text-blue-600 font-black ml-1">Model Answer / Marking Guide</Label>
                              <Textarea 
                                value={q.modelAnswer || ''} 
                                onChange={e => updateQuestion(idx, 'modelAnswer', e.target.value)} 
                                className="min-h-[80px] rounded-2xl border-2 border-blue-100 bg-blue-50/20 font-medium text-xs resize-none p-4" 
                                placeholder="Specify expected answer or keywords..."
                              />
                            </div>
                          )}

                          {(q.type === 'objective' || (q.type === 'integrated' && q.activeTab !== 'written')) && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="space-y-2">
                                <Label className="text-[10px] uppercase text-gray-400 font-bold ml-1">{q.type === 'integrated' ? 'MCQ Specific Question' : 'Question Prompt'}</Label>
                                <Textarea 
                                  value={q.objectiveText || ''} 
                                  onChange={e => updateQuestion(idx, 'objectiveText', e.target.value)} 
                                  className="min-h-[100px] rounded-2xl border-2 font-medium text-sm resize-none p-4" 
                                  placeholder={q.type === 'integrated' ? "Type the specific question for these options..." : "Type the full question here..."}
                                />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {q.options.map((opt: string, optIdx: number) => (
                                <div key={optIdx} className="space-y-2">
                                  <div className="flex items-center justify-between px-1">
                                    <Label className="text-[9px] uppercase text-gray-400 font-bold">Option {String.fromCharCode(65 + optIdx)}</Label>
                                    <div className="flex items-center gap-2">
                                      <Label className="text-[8px] uppercase text-gray-400 font-bold">Correct?</Label>
                                      <input 
                                        type="radio" 
                                        name={`sub-correct-${q.id}`} 
                                        checked={q.correctAnswer === optIdx} 
                                        onChange={() => updateQuestion(idx, 'correctAnswer', optIdx)}
                                        className="w-4 h-4 text-blue-600 accent-blue-600"
                                      />
                                    </div>
                                  </div>
                                  <Textarea 
                                    value={opt} 
                                    onChange={e => {
                                      const newOpts = [...q.options];
                                      newOpts[optIdx] = e.target.value;
                                      updateQuestion(idx, 'options', newOpts);
                                    }} 
                                    className={cn("min-h-[60px] rounded-2xl border-2 text-xs px-4 py-3 resize-none transition-all", q.correctAnswer === optIdx ? "border-green-500 bg-green-50/30" : "bg-white")}
                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)} content...`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                      <div className="pt-4 flex justify-center">
                        <Button 
                          variant="outline" 
                          onClick={addQuestion} 
                          className="rounded-[20px] border-2 border-dashed border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-all font-black uppercase tracking-widest px-12 h-14"
                        >
                          <Plus className="w-5 h-5 mr-3 stroke-[3px]" /> ADD NEW QUESTION
                        </Button>
                      </div>

                      {newAssessmentQuestions.length === 0 && (
                        <div className="h-[500px] border-4 border-dashed rounded-[40px] flex flex-col items-center justify-center text-gray-300 gap-4 bg-gray-50/50">
                          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-inner"><BookUser className="w-10 h-10 opacity-20" /></div>
                          <p className="text-sm uppercase font-black tracking-[0.3em] italic opacity-30">No questions in workspace</p>
                          <Button onClick={addQuestion} className="bg-blue-600 text-white rounded-xl px-8 h-12 shadow-lg">START BUILDING</Button>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              </div>

              {/* Bottom: Active Assessments Management */}
              <Card className="rounded-[40px] p-10 border-none shadow-2xl bg-blue-600 text-white overflow-hidden relative">
                <img src="/favicon.png" className="absolute -right-20 -bottom-20 w-80 h-80 opacity-10 rotate-12 grayscale" />
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter">Active System Assessments</h3>
                      <p className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-black mt-1">Live Management Console</p>
                    </div>
                    <Badge variant="outline" className="text-white border-white/20 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest">{assessments.length} DEPLOYED</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assessments.map(a => (
                      <div key={a.id} className="p-6 rounded-[32px] bg-white/10 backdrop-blur-md border border-white/20 flex justify-between items-center group shadow-2xl transition-all hover:bg-white/15">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-white/20 text-white text-[9px] uppercase font-black px-3">{a.type}</Badge>
                            <p className="text-[10px] text-blue-200 font-black uppercase tracking-widest">{courses.find(c => c.id === a.course_id)?.name}</p>
                          </div>
                          <p className="text-base font-black tracking-tight text-white line-clamp-1 mb-1">{a.title}</p>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-white/40 text-[9px] font-black uppercase"><Clock className="w-3 h-3" /> {a.duration}M</div>
                            <div className="flex items-center gap-1.5 text-white/40 text-[9px] font-black uppercase"><Users className="w-3 h-3" /> {a.assigned_student_ids?.length || 0}</div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => fetch(`${API_URL}/api/assessments/${a.id}`, {method:'DELETE'}).then(() => fetchData())} className="text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all ml-4 h-12 w-12 rounded-2xl"><Trash2 className="w-6 h-6" /></Button>
                      </div>
                    ))}
                    {assessments.length === 0 && (
                      <div className="lg:col-span-3 h-40 border-2 border-dashed border-white/10 rounded-[40px] flex items-center justify-center text-white/20 uppercase text-[10px] font-black tracking-[0.3em] italic">
                        No Active System Assessments Found
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'scm-management' && (
            <Card className="rounded-[32px] p-8 border-none shadow-xl bg-white">
              <div className="flex justify-between items-center mb-8"><CardTitle className="text-lg uppercase tracking-tight font-semibold">SCM MANAGEMENT REPOSITORY</CardTitle><Button onClick={() => setShowAdminUploadDialog(true)} className="bg-blue-600 text-white rounded-2xl px-6 h-10 text-xs font-semibold shadow-lg"><Upload className="w-4 h-4 mr-2" /> UPLOAD NEW</Button></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {uploadedMaterials.filter(m => m.uploaded_by === user.name || m.uploaded_by === user.id).map(m => (
                  <Card key={m.id} className="rounded-3xl border shadow-lg p-6 group bg-gray-50/50">
                    <div className="flex justify-between items-start mb-4"><div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Files className="w-6 h-6" /></div><Button variant="ghost" size="icon" onClick={() => fetch(`${API_URL}/api/materials/${m.id}`, {method:'DELETE'}).then(() => fetchData())} className="text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:text-red-600"><Trash2 className="w-4 h-4" /></Button></div>
                    <h4 className="text-gray-800 text-base mb-1 font-semibold line-clamp-1">{m.title}</h4><p className="text-[10px] text-gray-400 uppercase mb-4 tracking-widest font-semibold">{m.type}</p>
                    <div className="flex gap-2"><Button variant="outline" className="flex-1 rounded-xl h-10 text-xs font-semibold border-2 transition-all hover:bg-blue-50" onClick={() => handleView(m)}><Eye className="w-4 h-4 mr-2" /> VIEW</Button><Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-2 transition-all" onClick={() => handleDownload(m)}><Download className="w-4 h-4" /></Button></div>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'generator' && (
            <div className="max-w-xl mx-auto space-y-8 py-10 text-center animate-scale-in">
              <Card className="rounded-[40px] border-none shadow-2xl p-10 bg-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner"><RefreshCw className="w-8 h-8" /></div>
                <h2 className="text-lg uppercase text-gray-800 mb-4 tracking-tight font-semibold">Token Generator</h2>
                <div className="p-8 rounded-[24px] bg-gray-50 border-2 border-dashed border-gray-200 mb-8">
                  {generatedCredentials ? (
                    <div><p className="text-[8px] text-blue-600 uppercase tracking-widest mb-4 font-semibold">New Profile Tokens Ready</p><div className="grid grid-cols-2 gap-6 text-left"><div className="space-y-1"><p className="text-[8px] text-gray-400 uppercase tracking-widest font-semibold">SYSTEM ID</p><p className="text-xl text-gray-800 tracking-tight font-semibold">{generatedCredentials.id}</p></div><div className="space-y-1"><p className="text-[8px] text-gray-400 uppercase tracking-widest font-semibold">SECRET KEY</p><p className="text-xl text-gray-800 tracking-tight font-semibold">{generatedCredentials.password}</p></div></div></div>
                  ) : <p className="text-gray-400 uppercase tracking-widest italic opacity-50 py-8 text-center text-xs font-semibold">Engine Standby...</p>}
                </div>
                <Button onClick={() => { const id = 'STU' + Math.floor(1000 + Math.random() * 9000); const pass = Math.floor(100000 + Math.random() * 900000).toString(); setGeneratedCredentials({ id, password: pass }); setNewStudentId(id); setNewStudentPassword(pass); toast.success('Tokens Generated'); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-16 rounded-2xl shadow-xl text-sm uppercase tracking-widest transition-all font-semibold">EXECUTE ENGINE</Button>
              </Card>
            </div>
          )}

          {activeTab === 'results' && (
            <Card className="rounded-[32px] border-none shadow-xl p-8 bg-white overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead className="px-8 text-xs font-semibold uppercase">Student Profile</TableHead><TableHead className="text-xs font-semibold uppercase">Assessment Title</TableHead><TableHead className="text-xs font-semibold uppercase">Score</TableHead><TableHead className="text-right px-8 text-xs font-semibold uppercase">Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {results.filter(r => myStudents.some(s => s.id === r.student_id)).map(r => (
                    <TableRow key={r.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="px-8 py-6 flex items-center gap-4"><Avatar className="w-10 h-10"><AvatarFallback className="bg-blue-600 text-white font-semibold text-xs uppercase">{r.student_name?.[0] || 'S'}</AvatarFallback></Avatar><div><p className="text-gray-800 text-sm font-semibold">{r.student_name}</p><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">{r.student_id}</p></div></TableCell>
                      <TableCell className="text-gray-500 text-sm font-semibold">{r.assessment_title}</TableCell>
                      <TableCell><div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${r.score >= 50 ? 'bg-green-500' : 'bg-red-500'}`} /><span className="text-lg tracking-tight text-gray-800 font-semibold">{r.score}%</span></div></TableCell>
                      <TableCell className="text-right px-8"><Badge variant="outline" className={`px-3 py-1 rounded-full text-[8px] uppercase font-semibold ${r.status === 'released' ? 'text-green-600 border-green-200 bg-green-50' : 'text-orange-600 border-orange-200 bg-orange-50'}`}>{r.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {activeTab === 'activity' && (
            <Card className="rounded-[32px] border-none shadow-xl p-8 bg-white">
              <CardTitle className="text-lg uppercase tracking-tight mb-8 font-semibold">System Audit Log</CardTitle>
              <div className="space-y-4 max-w-3xl">
                {activityLogs.map(log => (
                  <div key={log.id} className="flex gap-4 p-4 rounded-2xl border bg-gray-50/50">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><ActivityIcon className="w-5 h-5" /></div>
                    <div>
                      <p className="text-gray-800 text-sm font-semibold">{log.action}</p>
                      <p className="text-xs text-gray-500 font-semibold">{log.details}</p>
                      <p className="text-[8px] text-gray-400 mt-1 uppercase font-semibold tracking-widest">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {activityLogs.length === 0 && <div className="text-center py-20 text-gray-400 italic text-sm">No activity recorded</div>}
              </div>
            </Card>
          )}
        </div>
      </main>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-[32px] max-w-md p-10 bg-white">
          <DialogHeader><DialogTitle className="text-lg font-semibold uppercase text-blue-600 tracking-tight">REGISTER IDENTITY</DialogTitle></DialogHeader>
          <div className="space-y-6 py-8">
            <div className="space-y-1.5"><Label className="text-[10px] text-gray-400 uppercase tracking-widest ml-1 font-semibold">Full Name</Label><Input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="h-12 rounded-2xl border-2 font-semibold" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] text-gray-400 uppercase tracking-widest ml-1 font-semibold">System ID</Label><div className="flex gap-2"><Input value={newStudentId} onChange={e => setNewStudentId(e.target.value)} className="h-12 rounded-2xl border-2 font-semibold text-blue-600" /><Button variant="outline" onClick={() => setNewStudentId('STU'+Math.floor(100+Math.random()*900))} className="h-12 w-12 rounded-2xl"><RefreshCw className="w-4 h-4 text-blue-600" /></Button></div></div>
            <div className="space-y-1.5"><Label className="text-[10px] text-gray-400 uppercase tracking-widest ml-1 font-semibold">Password</Label><Input value={newStudentPassword} onChange={e => setNewStudentPassword(e.target.value)} className="h-12 rounded-2xl border-2 font-semibold" placeholder="••••••••" /></div>
          </div>
          <DialogFooter><Button onClick={handleAddStudent} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 rounded-2xl shadow-xl text-xs uppercase tracking-widest font-semibold">CREATE ACCOUNT</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-[32px] max-w-[320px] text-center p-8 bg-white shadow-3xl border-none sm:max-w-[320px]">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <DialogTitle className="text-base font-semibold mb-2 uppercase tracking-tight text-gray-800 text-center">Confirm Deletion</DialogTitle>
          <p className="text-gray-400 uppercase text-[8px] tracking-widest mb-8 text-center px-2 font-semibold">
            This action is final and cannot be undone
          </p>
          <div className="flex flex-col gap-2 w-full">
            <Button 
              onClick={handleDeleteStudent} 
              className="w-full bg-red-500 hover:bg-red-600 text-white h-10 rounded-xl shadow-lg text-[10px] uppercase tracking-widest transition-all font-semibold"
            >
              YES, DELETE
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowDeleteDialog(false)} 
              className="w-full text-gray-400 h-10 rounded-xl uppercase text-[10px] tracking-widest hover:bg-gray-50 font-semibold"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminUploadDialog} onOpenChange={setShowAdminUploadDialog}>
        <DialogContent className="rounded-[40px] max-w-lg p-10 border-none shadow-3xl bg-white"><DialogHeader className="mb-8"><DialogTitle className="text-lg font-semibold uppercase text-blue-600 tracking-tight text-center">SCM Deploy</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-gray-400 font-semibold ml-1">Target Course (Topic)</Label>
              <Select value={adminSelectedCourseId} onValueChange={setAdminSelectedCourseId}>
                <SelectTrigger className="h-12 rounded-xl border-2 font-semibold text-sm"><SelectValue placeholder="Select Course" /></SelectTrigger>
                <SelectContent>
                  {courses.length > 0 ? (
                    courses.map(c => <SelectItem key={c.id} value={c.id} className="font-semibold">{c.name}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled className="font-semibold text-gray-400">No courses available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-gray-400 font-semibold ml-1">Material Type</Label>
              <Select value={adminSelectedMaterialType} onValueChange={(v: any) => setAdminSelectedMaterialType(v)}>
                <SelectTrigger className="h-12 rounded-xl border-2 font-semibold text-sm"><SelectValue placeholder="Select Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="textbooks" className="font-semibold">Textbook / Document</SelectItem>
                  <SelectItem value="videos" className="font-semibold">Video Content</SelectItem>
                  <SelectItem value="pastQuestions" className="font-semibold">Past Question</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {adminSelectedCourseId && (
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-gray-400 font-semibold ml-1">Assign to Students</Label>
                {students.filter(s => s.courses && s.courses.includes(adminSelectedCourseId)).length > 0 ? (
                  <>
                    <MultiSelect 
                      options={students.filter(s => s.courses && s.courses.includes(adminSelectedCourseId)).map(s => ({ label: s.name, value: s.id }))} 
                      selected={adminSelectedStudentIds} 
                      onChange={setAdminSelectedStudentIds} 
                      placeholder="Select students (Optional)" 
                    />
                    <p className="text-[9px] text-gray-400 font-bold px-1">
                      {students.filter(s => s.courses && s.courses.includes(adminSelectedCourseId)).length} Students Enrolled
                    </p>
                  </>
                ) : (
                  <div className="h-12 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                    No Students Enrolled in this Course
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1.5"><Label className="text-[10px] uppercase text-gray-400 font-semibold ml-1">Content Title</Label><Input value={adminNewMaterialTitle} onChange={e => setAdminNewMaterialTitle(e.target.value)} className="h-12 rounded-xl border-2 font-semibold text-sm" /></div>
            <div className="space-y-3">
              <Label className="text-[10px] uppercase text-gray-400 font-semibold">Deployment Method</Label>
              <div className="flex bg-gray-50 rounded-xl p-1 shadow-inner border-2">
                <button 
                  onClick={() => setUploadMethod('file')} 
                  className={cn("flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", uploadMethod === 'file' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:bg-white/50")}
                >
                  File Upload
                </button>
                <button 
                  onClick={() => setUploadMethod('link')} 
                  className={cn("flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", uploadMethod === 'link' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:bg-white/50")}
                >
                  Link
                </button>
              </div>
            </div>

            {uploadMethod === 'file' ? (
              <div className="space-y-1.5"><Label className="text-[10px] uppercase text-gray-400 font-semibold ml-1">Asset File</Label><Input type="file" onChange={e => setAdminNewMaterialFile(e.target.files?.[0] || null)} className="h-12 rounded-xl border-2 font-semibold cursor-pointer file:bg-blue-50 file:text-blue-600 file:border-none file:h-full file:mr-4 px-0" /></div>
            ) : (
              <div className="space-y-1.5"><Label className="text-[10px] uppercase text-gray-400 font-semibold ml-1">Asset Link</Label><Input value={adminNewMaterialLink} onChange={e => setAdminNewMaterialLink(e.target.value)} className="h-12 rounded-xl border-2 font-semibold text-sm" placeholder="https://..." /></div>
            )}
          </div>
          <DialogFooter className="mt-10"><Button onClick={handleAdminUpload} className="w-full bg-blue-600 text-white h-14 rounded-2xl shadow-xl uppercase tracking-widest text-xs font-semibold">EXECUTE UPLOAD</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
