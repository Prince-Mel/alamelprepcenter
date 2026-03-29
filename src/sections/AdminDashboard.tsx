import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
  Settings,
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
  Filter,
  Activity as ActivityIcon,
  Key
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminDashboardProps {
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
  mode: string;
  submission_mode: string;
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
  assigned_student_ids?: string[];
}

export function AdminDashboard({ user, onLogout, onSwitchToStudent, onUpdateUser }: AdminDashboardProps) {
  const isMobile = useIsMobile();
  const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<AssessmentConfig[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [uploadedMaterials, setUploadedMaterials] = useState<UploadedMaterial[]>([]);
  const [regRequests, setRegRequests] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [subAdmins, setSubAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewScope, setViewScope] = useState<'all' | 'direct'>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [originalId, setOriginalId] = useState<string | null>(null);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddSubAdminDialog, setShowAddSubAdminDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAdminUploadDialog, setShowAdminUploadDialog] = useState(false);
  const [showAdminProfileDialog, setShowAdminProfileDialog] = useState(false);

  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');

  const [newSubAdminName, setNewSubAdminName] = useState('');
  const [newSubAdminId, setNewSubAdminId] = useState('');
  const [newSubAdminPassword, setNewSubAdminPassword] = useState('');
  const [newSubAdminEmail, setNewSubAdminEmail] = useState('');
  const [newSubAdminContact, setNewSubAdminContact] = useState('');

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

  const [generatedCredentials, setGeneratedCredentials] = useState<{id: string, password: string} | null>(null);
  const [adminProfileData, setAdminProfileData] = useState({ name: user.name, id: user.id, password: user.password, email: user.email || '', contact: user.contact || '' });

  const [selectedCourse, setSelectedCourse] = useState('');
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [endDate, setEndDate] = useState('');
  const [assignedStudents, setAssignedStudents] = useState<string[]>([]);

  const [adminNewMaterialTitle, setAdminNewMaterialTitle] = useState('');
  const [adminNewMaterialFile, setAdminNewMaterialFile] = useState<File | null>(null);
  const [adminSelectedMaterialType, setAdminSelectedMaterialType] = useState<'textbooks' | 'videos' | 'pastQuestions'>('textbooks');
  const [adminSelectedCourseId, setAdminSelectedCourseId] = useState('');
  const [adminSelectedStudentIds, setAdminSelectedStudentIds] = useState<string[]>([]);

  const [studentToAssign, setStudentToAssign] = useState('');
  const [courseToAssign, setCourseToAssign] = useState('');

  const [showAddCourseDialog, setShowAddCourseDialog] = useState(false);
  const [selectedCourseToEdit, setSelectedCourseToEdit] = useState<Course | null>(null);
  const [newCourse, setNewCourse] = useState({ id: '', name: '', code: '', instructor: '', color: 'from-blue-500 to-indigo-500', image: '/course-placeholder.svg' });

  const handleAddCourse = async () => {
    if (!newCourse.id || !newCourse.name || !newCourse.code) {
      toast.error('Required fields missing');
      return;
    }
    const method = selectedCourseToEdit ? 'PUT' : 'POST';
    const url = selectedCourseToEdit ? `${API_URL}/api/courses/${selectedCourseToEdit.id}` : `${API_URL}/api/courses`;
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCourse)
    });
    if (res.ok) {
      fetchData();
      setShowAddCourseDialog(false);
      setSelectedCourseToEdit(null);
      setNewCourse({ id: '', name: '', code: '', instructor: '', color: 'from-blue-500 to-indigo-500', image: '/course-placeholder.svg' });
      toast.success(selectedCourseToEdit ? 'Course Updated' : 'Course Created');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    const res = await fetch(`${API_URL}/api/courses/${id}`, { method: 'DELETE' });
    if (res.ok) { fetchData(); toast.success('Course Deleted'); }
  };

  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [showMarkDialog, setShowMarkDialog] = useState(false);
  const [markingScore, setMarkingScore] = useState(0);
  const [markingStatus, setMarkingScoreStatus] = useState<'pending' | 'released'>('pending');
  const [markingShowScore, setMarkingShowScore] = useState(true);

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
    link.download = item.title; // simplified for admin
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
        fetchData();
      } else {
        toast.error('Approval failed.');
      }
    } catch (e) {
      toast.error('Action failed.');
    }
  };

  const handleUpdateResult = async () => {
    if (!selectedResult) return;
    try {
      const res = await fetch(`${API_URL}/api/results/${selectedResult.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          score: markingScore, 
          status: markingStatus,
          show_score: markingShowScore
        })
      });
      if (res.ok) { 
        fetchData(); 
        setShowMarkDialog(false); 
        toast.success('Result Updated'); 
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Update failed on server');
      }
    } catch (e) {
      console.error('Update error:', e);
      toast.error('Network error occurred during update');
    }
  };

  const fetchData = async () => {
    try {
      const [coursesRes, studentsRes, assessmentsRes, resultsRes, materialsRes, regRes, activityRes, subAdminsRes] = await Promise.all([
        fetch(`${API_URL}/api/courses`),
        fetch(`${API_URL}/api/students`),
        fetch(`${API_URL}/api/assessments`),
        fetch(`${API_URL}/api/results`),
        fetch(`${API_URL}/api/materials`),
        fetch(`${API_URL}/api/reg-requests`),
        fetch(`${API_URL}/api/activity`),
        fetch(`${API_URL}/api/subadmins`)
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
      }
      if (assessmentsRes.ok) setAssessments(await assessmentsRes.json());
      if (resultsRes.ok) setResults(await resultsRes.json());
      if (materialsRes.ok) setUploadedMaterials(await materialsRes.json());
      if (regRes.ok) setRegRequests(await regRes.json());
      if (activityRes.ok) setActivityLogs(await activityRes.json());
      if (subAdminsRes.ok) setSubAdmins(await subAdminsRes.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(fetchData, 10000); // Auto-refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const myStudents = students.filter(s => {
    const creatorId = (s as any).created_by || '';
    if (viewScope === 'direct') {
      return creatorId.toUpperCase() === user.id.toUpperCase();
    }
    return true; // All students for Master Admin
  });
  const filteredStudents = myStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase()));
  const studentOptions: Option[] = myStudents.map(s => ({ label: s.name, value: s.id }));

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

  const handleAddSubAdmin = async () => {
    if (!newSubAdminName || !newSubAdminId || !newSubAdminPassword) {
      toast.error('Required fields missing');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/subadmins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newSubAdminId,
          name: newSubAdminName,
          password: newSubAdminPassword,
          email: newSubAdminEmail,
          contact: newSubAdminContact
        })
      });
      if (res.ok) {
        fetchData();
        setShowAddSubAdminDialog(false);
        setNewSubAdminName('');
        setNewSubAdminId('');
        setNewSubAdminPassword('');
        setNewSubAdminEmail('');
        setNewSubAdminContact('');
        toast.success('Sub-Admin Created');
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to create Sub-Admin');
      }
    } catch (e) { 
      console.error(e);
      toast.error('Network error occurred while creating Sub-Admin'); 
    }
  };

  const handleUpdateSubAdminStatus = async (sub: any, newStatus: string) => {
    try {
      const updated = { ...sub, status: newStatus };
      const res = await fetch(`${API_URL}/api/students/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) { fetchData(); toast.success(`Sub-Admin ${newStatus}`); }
    } catch (e) { toast.error('Status update failed'); }
  };

  const handleEditStudent = async () => {
    if (!selectedStudent || !originalId) return;
    const res = await fetch(`${API_URL}/api/students/${originalId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selectedStudent) });
    if (res.ok) { fetchData(); setShowEditDialog(false); toast.success('Updated'); }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    if (window.confirm('Are you sure you want to delete this student?')) {
      const res = await fetch(`${API_URL}/api/students/${selectedStudent.id}`, { method: 'DELETE' });
      if (res.ok) { fetchData(); setShowDeleteDialog(false); toast.success('Deleted'); }
    }
  };

  const [isDeploying, setIsDeploying] = useState(false);

  const handleCreateAssessment = async () => {
    if (!selectedCourse) {
      toast.error('Please select a target course');
      return;
    }
    if (!assessmentTitle.trim()) {
      toast.error('Please enter an assessment title');
      return;
    }
    if (!endDate) {
      toast.error('Please set a deadline for the assessment');
      return;
    }
    if (newAssessmentQuestions.length === 0) {
      toast.error('Please add at least one question to the assessment');
      return;
    }

    setIsDeploying(true);
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

    try {
      const res = await fetch(`${API_URL}/api/assessments`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(config) 
      });
      
      if (res.ok) { 
        fetchData(); 
        toast.success(`Assessment "${assessmentTitle}" published with ${newAssessmentQuestions.length} questions`);
        setNewAssessmentQuestions([]);
        setAssessmentTitle('');
        setSelectedCourse('');
        setEndDate('');
        setAssignedStudents([]);
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Failed to publish assessment');
      }
    } catch (e) {
      console.error('Deployment error:', e);
      toast.error('Network error: Could not reach the server');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleAdminUpload = async () => {
    if (!adminNewMaterialTitle) {
      toast.error('Asset Identifier (Title) is required');
      return;
    }
    if (!adminSelectedCourseId) {
      toast.error('Module Allocation (Course) is required');
      return;
    }

    const process = async (fileData?: string) => {
      // Size validation
      if (adminNewMaterialFile) {
        const sizeMB = adminNewMaterialFile.size / (1024 * 1024);
        let limit = 50; // Default for documents/past questions
        if (adminSelectedMaterialType === 'videos') limit = 150;
        
        if (sizeMB > limit) {
          toast.error(`File too large. Maximum size for ${adminSelectedMaterialType} is ${limit}MB`);
          return;
        }
      }

      const mat = { id: `MAT${Date.now()}`, course_id: adminSelectedCourseId === 'global-course' ? 'GLOBAL' : adminSelectedCourseId, type: adminSelectedMaterialType, title: adminNewMaterialTitle, url: fileData, uploaded_by: user.name, approved: true, date: new Date().toISOString().split('T')[0], assigned_student_ids: adminSelectedStudentIds };
      try {
        const res = await fetch(`${API_URL}/api/materials`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mat) });
        if (res.ok) { 
          fetchData(); 
          setShowAdminUploadDialog(false); 
          toast.success('Asset Deployed Successfully');
          setAdminNewMaterialTitle('');
          setAdminSelectedCourseId('');
          setAdminSelectedStudentIds([]);
          setAdminNewMaterialFile(null);
        } else {
          const err = await res.json();
          toast.error(err.error || 'Deployment Failed');
        }
      } catch (e) {
        toast.error('Network Error during Deployment');
      }
    };
    if (adminNewMaterialFile) {
      const reader = new FileReader();
      reader.onload = (e) => process(e.target?.result as string);
      reader.readAsDataURL(adminNewMaterialFile);
    } else process();
  };

  const handleAssignCourse = async () => {
    if (!studentToAssign || !courseToAssign) return;
    const res = await fetch(`${API_URL}/api/enrollments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: studentToAssign, course_id: courseToAssign }) });
    if (res.ok) { fetchData(); toast.success('Assigned'); }
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

  const handleUpdateAdminProfile = async () => {
    const updated = { ...user, name: adminProfileData.name.toUpperCase(), password: adminProfileData.password, email: adminProfileData.email, contact: adminProfileData.contact };
    const res = await fetch(`${API_URL}/api/students/${user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    if (res.ok) { onUpdateUser(updated, user.id); setShowAdminProfileDialog(false); toast.success('Saved'); }
  };

  const getStatusBadge = (s: string) => {
    const colors: any = { 
      active: 'bg-green-500/20 text-green-400 border-green-500/50', 
      inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/50', 
      suspended: 'bg-red-500/20 text-red-400 border-red-500/50' 
    };
    return <Badge className={cn(colors[s] || 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50', "font-semibold border")}>{s.toUpperCase()}</Badge>;
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-neon-bg text-neon-cyan animate-pulse uppercase tracking-widest text-lg font-black shadow-[0_0_30px_rgba(0,242,255,0.2)]">AlaMel System Syncing...</div>;

  return (
    <div className="min-h-screen flex bg-neon-bg relative overflow-x-hidden font-inter text-gray-300">
      <aside className={`fixed left-0 top-0 h-full bg-[#080808] shadow-2xl z-50 transition-all duration-500 border-r border-neon-border/50 ${isMobile ? (mobileMenuOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full') : (sidebarCollapsed ? 'w-20' : 'w-64')}`}>
        <div className="h-20 flex items-center justify-center border-b border-neon-border/30 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.3)] overflow-hidden border border-neon-cyan/20">
              <img src="/favicon.png" alt="Logo" className="w-full h-full object-cover rounded-lg scale-[1.5]" />
            </div>
            {!sidebarCollapsed && <span className="text-lg text-white font-black uppercase tracking-tighter drop-shadow-[0_0_8px_rgba(0,242,255,0.5)]">AlaMel</span>}
          </div>
        </div>
        <ScrollArea className="flex-1 h-[calc(100vh-180px)] py-4">
          <nav className="px-3 space-y-2">
            {[
              { icon: Users, label: 'Students', value: 'students' },
              { icon: GraduationCap, label: 'Registration', value: 'reg-requests', badge: regRequests.length },
              { icon: Shield, label: 'AC Center', value: 'ac-center' },
              { icon: FolderLock, label: 'SCM', value: 'scm-management', badge: uploadedMaterials.filter(m => !m.approved).length },
              { icon: Clock, label: 'Assessment', value: 'timer' },
              { icon: BookUser, label: 'Enrollment', value: 'course-assignment' },
              { icon: CheckCircle, label: 'Results', value: 'results' },
              { icon: ActivityIcon, label: 'Activity', value: 'activity' },
              { icon: Key, label: 'Generator', value: 'generator' }
            ].map(item => (
              <button 
                key={item.value} 
                onClick={() => { setActiveTab(item.value); if(isMobile) setMobileMenuOpen(false); }} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group ${activeTab === item.value ? 'bg-neon-cyan/10 text-neon-cyan shadow-[inset_0_0_15px_rgba(0,242,255,0.1)] border border-neon-cyan/30' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
              >
                {activeTab === item.value && <div className="absolute left-0 w-1 h-6 bg-neon-cyan rounded-r-full shadow-[0_0_10px_#00f2ff]" />}
                <div className="relative">
                  <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${activeTab === item.value ? 'text-neon-cyan' : 'group-hover:text-neon-cyan/70'}`} />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-neon-pink text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse shadow-[0_0_10px_#ff00e5]">
                      {item.badge}
                    </span>
                  )}
                </div>
                {!sidebarCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>}
              </button>
            ))}
          </nav>
        </ScrollArea>
        {!isMobile && <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="absolute -right-3 top-24 w-6 h-6 bg-[#121212] text-neon-cyan rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-neon-border/50"><ChevronRight className={cn("w-4 h-4 transition-transform", !sidebarCollapsed && "rotate-180")} /></button>}
        <div className="p-4 border-t border-neon-border/30 bg-black/20">
          <button onClick={async () => {
            await fetch(`${API_URL}/api/logout`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id })
            });
            onLogout();
          }} className="w-full flex items-center gap-3 p-3 rounded-xl text-neon-pink/70 hover:bg-neon-pink/10 hover:text-neon-pink transition-all group border border-transparent hover:border-neon-pink/30">
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
            {!sidebarCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>}
          </button>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-500 ${isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-20' : 'ml-64')}`}>
        <header className="h-20 bg-neon-bg/80 backdrop-blur-xl border-b border-neon-border/50 px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-4">
            {isMobile && <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="text-neon-cyan"><Menu className="w-6 h-6" /></Button>}
            <h1 className="text-sm font-black text-white uppercase tracking-[0.2em] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{activeTab === 'timer' ? 'Assessment' : activeTab.replace('-', ' ')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={onSwitchToStudent} className="bg-transparent border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black rounded-xl text-[10px] font-black tracking-widest px-6 transition-all shadow-[0_0_15px_rgba(0,242,255,0.1)]">STUDENT VIEW</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer border-2 border-neon-cyan shadow-[0_0_15px_rgba(0,242,255,0.2)] hover:scale-105 transition-transform">
                  <AvatarFallback className="bg-neon-card text-neon-cyan uppercase text-xs font-black">{user.name[0]}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl border border-neon-border bg-neon-card shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
                <DropdownMenuLabel className="text-[10px] text-neon-cyan uppercase font-black tracking-widest p-4">Master Admin</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-neon-border" />
                <DropdownMenuItem onClick={() => setShowAdminProfileDialog(true)} className="rounded-xl uppercase text-[10px] font-black tracking-widest p-3 text-gray-300 hover:text-white hover:bg-neon-cyan/10 transition-colors"><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout} className="text-neon-pink rounded-xl uppercase text-[10px] font-black tracking-widest p-3 hover:bg-neon-pink/10 transition-colors"><LogOut className="mr-2 h-4 w-4" /> Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
          {activeTab === 'students' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-1 gap-4 w-full">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neon-cyan/50" />
                    <Input placeholder="Search students..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 rounded-2xl h-12 bg-neon-card border-neon-border text-white font-semibold focus-visible:ring-neon-cyan/50 focus-visible:border-neon-cyan/50" />
                  </div>
                  <div className="flex bg-neon-card rounded-2xl p-1 shadow-inner border border-neon-border/50">
                    <button 
                      onClick={() => setViewScope('all')} 
                      className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", viewScope === 'all' ? "bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,242,255,0.4)]" : "text-gray-500 hover:text-gray-300")}
                    >
                      All Records
                    </button>
                    <button 
                      onClick={() => setViewScope('direct')} 
                      className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", viewScope === 'direct' ? "bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,242,255,0.4)]" : "text-gray-500 hover:text-gray-300")}
                    >
                      Authorized By Me
                    </button>
                  </div>
                </div>
                <Button onClick={() => setShowAddDialog(true)} className="bg-neon-cyan text-black rounded-2xl h-12 px-10 shadow-[0_0_20px_rgba(0,242,255,0.3)] hover:shadow-[0_0_30px_rgba(0,242,255,0.5)] transition-all text-[10px] font-black tracking-widest uppercase">ADD STUDENT</Button>
              </div>
              <Card className="rounded-[32px] overflow-hidden border border-neon-border bg-neon-card/50 backdrop-blur-md shadow-2xl">
                <Table>
                  <TableHeader className="bg-black/40">
                    <TableRow className="hover:bg-transparent border-neon-border/50">
                      <TableHead className="px-8 py-6 uppercase text-[10px] font-black tracking-widest text-neon-cyan">Identity</TableHead>
                      <TableHead className="uppercase text-[10px] text-center font-black tracking-widest text-neon-cyan">Status</TableHead>
                      <TableHead className="text-right px-8 uppercase text-[10px] font-black tracking-widest text-neon-cyan">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map(s => (
                      <TableRow key={s.id} className="hover:bg-neon-cyan/5 cursor-pointer border-neon-border/30 transition-colors group" onClick={() => { setSelectedStudent(s); setOriginalId(s.id); setActiveTab('student-workspace'); }}>
                        <TableCell className="px-8 py-6 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center text-neon-cyan font-black text-xs shadow-[inset_0_0_10px_rgba(0,242,255,0.1)]">
                            {s.id.slice(-2)}
                          </div>
                          <div>
                            <p className="text-white text-sm font-bold tracking-tight">{s.name}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest group-hover:text-neon-cyan/70 transition-colors">{s.id}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(s.status)}</TableCell>
                        <TableCell className="text-right px-8">
                          <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setSelectedStudent(s); setShowDeleteDialog(true); }} className="text-neon-pink/50 hover:text-neon-pink hover:bg-neon-pink/10 rounded-xl transition-all">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {activeTab === 'student-workspace' && selectedStudent && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => setActiveTab('students')} className="text-neon-cyan uppercase text-[10px] font-black tracking-widest flex items-center hover:opacity-70 transition-opacity"><ChevronLeft className="w-4 h-4 mr-2" /> Back to Students</button>
                <div className="flex gap-3">
                  <Button onClick={() => setShowEditDialog(true)} className="bg-neon-card text-neon-cyan border border-neon-cyan/30 rounded-2xl h-10 px-6 text-[10px] font-black tracking-widest uppercase hover:bg-neon-cyan/10 transition-all"><Settings className="w-4 h-4 mr-2" /> Edit Profile</Button>
                  <Button onClick={handleDeleteStudent} className="bg-neon-pink/10 text-neon-pink border border-neon-pink/30 rounded-2xl h-10 px-6 text-[10px] font-black tracking-widest uppercase hover:bg-neon-pink/20 transition-all"><Trash2 className="w-4 h-4 mr-2" /> Expel</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="rounded-[32px] p-8 border border-neon-border bg-neon-cyan/5 text-white relative overflow-hidden h-full shadow-[inset_0_0_30px_rgba(0,242,255,0.05)]">
                  <div className="absolute -right-10 -bottom-10 w-48 h-48 opacity-5 rotate-12 bg-neon-cyan rounded-full blur-3xl" />
                  <div className="relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-neon-cyan text-black flex items-center justify-center text-xl font-black shadow-[0_0_20px_rgba(0,242,255,0.4)] uppercase mb-6">{selectedStudent.name[0]}</div>
                    <h2 className="text-xl uppercase tracking-tighter mb-1 leading-none font-black text-white">{selectedStudent.name}</h2>
                    <p className="text-neon-cyan/60 text-[10px] uppercase tracking-[0.2em] mb-8 font-black">{selectedStudent.id}</p>
                    <div className="space-y-4">
                      <div className="space-y-1"><p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">ACCESS PASSWORD</p><p className="text-lg tracking-tight font-black text-white">{selectedStudent.password}</p></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">EMAIL</p><p className="text-[10px] font-bold truncate text-gray-300">{selectedStudent.email || 'N/A'}</p></div>
                        <div className="space-y-1"><p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">CONTACT</p><p className="text-[10px] font-bold text-gray-300">{selectedStudent.contact || 'N/A'}</p></div>
                      </div>
                      {(() => {
                        let details: any = (selectedStudent as any).details;
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
                        if (!details || typeof details !== 'object') return null;
                        return (
                          <div className="pt-4 border-t border-neon-border/50 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1"><p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">EDUCATION LEVEL</p><p className="text-[10px] font-bold uppercase text-gray-300">{details.educationLevel || details.level || 'N/A'}</p></div>
                              <div className="space-y-1"><p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">CLASS</p><p className="text-[10px] font-bold uppercase text-gray-300">{details.studentClass || details.class || 'N/A'}</p></div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">SUBJECTS TO PREPARE</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Array.isArray(details.coursesToPrepare) ? details.coursesToPrepare.map((c: string) => (
                                  <span key={c} className="text-[7px] bg-neon-cyan/10 text-neon-cyan px-2 py-0.5 rounded-full font-black uppercase border border-neon-cyan/20">{c}</span>
                                )) : <span className="text-[10px] font-bold text-gray-600 uppercase">NONE</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="space-y-1 pt-4 border-t border-neon-border/50"><p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">CURRENT STATUS</p><div>{getStatusBadge(selectedStudent.status)}</div></div>
                    </div>
                  </div>
                </Card>

                <Card className="lg:col-span-2 rounded-[32px] p-8 border border-neon-border bg-neon-card/30 backdrop-blur-md shadow-2xl relative h-full">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-lg uppercase tracking-tight text-white font-black">Performance Analytics</h3>
                      <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] mt-0.5 font-black">Live Assessment Records</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-right">
                        <p className="text-lg text-neon-cyan tracking-tighter font-black drop-shadow-[0_0_8px_rgba(0,242,255,0.4)]">
                          {results.filter(r => r.student_id === selectedStudent.id).length}
                        </p>
                        <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Tests</p>
                      </div>
                      <div className="text-right pl-4 border-l border-neon-border/50">
                        <p className="text-lg text-neon-pink tracking-tighter font-black drop-shadow-[0_0_8px_rgba(255,0,229,0.4)]">
                          {Math.round(results.filter(r => r.student_id === selectedStudent.id).reduce((acc, curr) => acc + curr.score, 0) / (results.filter(r => r.student_id === selectedStudent.id).length || 1))}%
                        </p>
                        <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">AVG</p>
                      </div>
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[350px] pr-4">
                    <Table>
                      <TableHeader className="bg-black/40 border-b border-neon-border/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="py-3 text-[9px] uppercase font-black tracking-widest text-neon-cyan">Title</TableHead>
                          <TableHead className="text-[9px] uppercase text-center font-black tracking-widest text-neon-cyan">Result</TableHead>
                          <TableHead className="text-[9px] uppercase text-right font-black tracking-widest text-neon-cyan">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.filter(r => r.student_id === selectedStudent.id).length > 0 ? (
                          results.filter(r => r.student_id === selectedStudent.id).map(r => (
                            <TableRow key={r.id} className="border-b border-neon-border/20 hover:bg-neon-cyan/5 transition-colors">
                              <TableCell className="py-4">
                                <p className="text-white uppercase text-xs font-black tracking-tight">{r.assessment_title}</p>
                                <p className="text-[8px] text-gray-500 tracking-[0.2em] font-black uppercase">{r.course_name}</p>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={cn(
                                  "text-base font-black tracking-tighter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]",
                                  r.score >= 50 ? 'text-neon-cyan' : 'text-neon-pink'
                                )}>{r.score}%</span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge className={cn(
                                  "text-[7px] uppercase font-black tracking-widest border",
                                  r.status === 'released' ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30' : 'bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30'
                                )}>{r.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={3} className="text-center py-16 text-gray-600 text-[10px] tracking-widest font-black uppercase italic">No Assessment Records Found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              </div>

              <Card className="rounded-[32px] p-8 border border-neon-border bg-neon-card relative overflow-hidden shadow-2xl">
                <div className="absolute -right-20 -bottom-20 w-80 h-80 opacity-5 rotate-12 bg-neon-purple rounded-full blur-3xl" />
                <div className="relative z-10">
                  <h3 className="text-lg uppercase tracking-tight text-white mb-6 font-black italic">Enrolled Course Modules</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {courses.filter(c => selectedStudent.courses?.includes(c.id)).map(c => (
                        <div key={c.id} className={cn("p-6 rounded-[24px] transition-all flex justify-between items-center group w-full text-white shadow-xl border border-white/10 hover:border-white/30", c.color)}>
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="uppercase tracking-widest text-sm font-black italic">{c.name}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => fetch(`${API_URL}/api/enrollments/${selectedStudent.id}/${c.id}`, {method:'DELETE'}).then(() => fetchData())} className="text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-5 h-5" /></Button>
                        </div>
                      ))}
                    {courses.filter(c => selectedStudent.courses?.includes(c.id)).length === 0 && (
                      <div className="lg:col-span-3 h-32 rounded-[24px] border border-dashed border-neon-border/50 flex items-center justify-center text-gray-600 uppercase text-[10px] tracking-widest font-black italic">No Modules Assigned To This Profile</div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'reg-requests' && (
            <Card className="rounded-[32px] border border-neon-border shadow-2xl p-8 bg-neon-card/50 backdrop-blur-md overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xl uppercase tracking-tighter text-white font-black italic">Registration Queue</h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1 font-black">Review and Authorize Entry Requests</p>
                </div>
              </div>
              <Table>
                <TableHeader className="bg-black/40 border-b border-neon-border/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-8 py-6 text-neon-cyan uppercase text-[10px] font-black tracking-widest">Candidate Profile</TableHead>
                    <TableHead className="text-neon-cyan uppercase text-[10px] text-center font-black tracking-widest">Identity Role</TableHead>
                    <TableHead className="text-neon-cyan uppercase text-[10px] text-center font-black tracking-widest">Academic Path</TableHead>
                    <TableHead className="text-right px-8 text-neon-cyan uppercase text-[10px] font-black tracking-widest">Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regRequests.map(r => (
                    <TableRow key={r.id} className="border-b border-neon-border/20 hover:bg-neon-cyan/5 transition-colors">
                      <TableCell className="px-8 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan text-lg font-black shadow-[0_0_15px_rgba(0,242,255,0.1)]">{r.name[0]}</div>
                          <div>
                            <p className="text-lg text-white tracking-tighter font-black leading-none mb-1">{r.name}</p>
                            <p className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-tight">{r.email}</p>
                            <p className="text-[10px] text-neon-cyan font-black tracking-widest uppercase drop-shadow-[0_0_5px_rgba(0,242,255,0.3)]">{r.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "rounded-full px-4 py-1 text-[8px] font-black tracking-widest uppercase border",
                          r.role === 'student' ? "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30 shadow-[0_0_10px_rgba(0,242,255,0.1)]" : "bg-neon-purple/10 text-neon-purple border-neon-purple/30 shadow-[0_0_10px_rgba(188,19,254,0.1)]"
                        )}>
                          {r.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {r.role === 'student' ? (
                          <div className="inline-block text-left">
                            <p className="text-[10px] text-gray-300 font-black uppercase tracking-tight">{r.details?.educationLevel} • {r.details?.studentClass}</p>
                            <div className="flex gap-1 mt-1">
                              {r.details?.coursesToPrepare?.map((c: string) => (
                                <span key={c} className="text-[7px] bg-neon-cyan/5 text-neon-cyan/70 border border-neon-cyan/10 px-2 py-0.5 rounded-full font-black uppercase">{c}</span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-500 italic max-w-[150px] mx-auto leading-tight font-bold uppercase">{r.details?.purposeOfRegistration}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right px-8">
                        {r.status === 'approved' ? (
                          <div className="flex flex-col items-end gap-2">
                            <Badge className="bg-neon-cyan text-black px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest mb-1 shadow-[0_0_15px_rgba(0,242,255,0.3)] uppercase">Authorized: {r.approved_user_id}</Badge>
                            <Button variant="ghost" onClick={() => handleRejectRequest(r)} className="text-neon-pink hover:bg-neon-pink/10 h-8 px-4 rounded-xl text-[8px] font-black tracking-widest uppercase border border-neon-pink/20">Revoke Access</Button>
                          </div>
                        ) : r.status === 'rejected' ? (
                          <div className="flex flex-col items-end gap-2">
                            <Badge className="bg-neon-pink text-white px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest mb-1 shadow-[0_0_15px_rgba(255,0,229,0.3)] uppercase">Unauthorized</Badge>
                            <Button variant="ghost" onClick={() => handleApproveRequest(r)} className="text-neon-cyan hover:bg-neon-cyan/10 h-8 px-4 rounded-xl text-[8px] font-black tracking-widest uppercase border border-neon-cyan/20">Authorize Instead</Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-3">
                            <Button onClick={() => handleApproveRequest(r)} className="bg-neon-cyan hover:shadow-[0_0_25px_rgba(0,242,255,0.4)] text-black px-8 rounded-2xl h-12 shadow-xl text-[10px] font-black tracking-widest transition-all hover:scale-105 active:scale-95 uppercase">Authorize</Button>
                            <Button variant="ghost" onClick={() => handleRejectRequest(r)} className="text-gray-500 hover:text-neon-pink h-12 px-6 text-[10px] font-black tracking-widest uppercase rounded-2xl transition-colors">Reject</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {regRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-24 hover:bg-transparent">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-neon-border">
                          <GraduationCap className="w-10 h-10 text-gray-700" />
                        </div>
                        <h3 className="text-sm font-black text-gray-600 uppercase tracking-[0.3em] italic">Registration Queue Empty</h3>
                        <p className="text-[9px] text-gray-700 uppercase tracking-widest mt-2 font-black">No pending authorization requests found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          {activeTab === 'ac-center' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl text-white uppercase tracking-tighter font-black italic">Authorized Creators</h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mt-1">Sub-Admin Management Console</p>
                </div>
                <Button onClick={() => setShowAddSubAdminDialog(true)} className="bg-neon-cyan text-black rounded-2xl h-12 px-8 shadow-[0_0_20px_rgba(0,242,255,0.3)] text-[10px] font-black tracking-widest uppercase hover:scale-105 transition-all">
                  <Plus className="w-5 h-5 mr-2" /> DEPLOY CREATOR
                </Button>
              </div>
              <Card className="rounded-[32px] overflow-hidden border border-neon-border bg-neon-card/50 backdrop-blur-md shadow-2xl">
                <Table>
                  <TableHeader className="bg-black/40 border-b border-neon-border/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-8 py-6 uppercase text-[10px] font-black tracking-widest text-neon-cyan">Name</TableHead>
                      <TableHead className="uppercase text-[10px] text-center font-black tracking-widest text-neon-cyan">Capacity</TableHead>
                      <TableHead className="uppercase text-[10px] text-center font-black tracking-widest text-neon-cyan">Status</TableHead>
                      <TableHead className="text-right px-8 uppercase text-[10px] font-black tracking-widest text-neon-cyan">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subAdmins.map(sub => (
                      <TableRow key={sub.id} className="border-b border-neon-border/20 hover:bg-neon-cyan/5 transition-colors group">
                        <TableCell className="px-8 py-6 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center text-neon-purple uppercase font-black shadow-[inset_0_0_10px_rgba(188,19,254,0.1)]">{sub.name[0]}</div>
                          <div>
                            <p className="text-white text-sm font-black tracking-tight">{sub.name}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] group-hover:text-neon-purple/70 transition-colors">{sub.id}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-black text-lg text-neon-cyan drop-shadow-[0_0_8px_rgba(0,242,255,0.3)]">
                          {sub.student_count}
                          <span className="text-[10px] text-gray-500 ml-2 uppercase tracking-widest italic font-black">Authorized</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger>{getStatusBadge(sub.status)}</DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="rounded-xl bg-neon-card border border-neon-border shadow-2xl">
                              <DropdownMenuItem onClick={() => handleUpdateSubAdminStatus(sub, 'active')} className="text-green-400 font-black text-[10px] uppercase tracking-widest hover:bg-green-500/10">SET ACTIVE</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateSubAdminStatus(sub, 'inactive')} className="text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-gray-500/10">SET INACTIVE</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateSubAdminStatus(sub, 'suspended')} className="text-neon-pink font-black text-[10px] uppercase tracking-widest hover:bg-neon-pink/10">SET SUSPENDED</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedStudent(sub); setOriginalId(sub.id); setShowEditDialog(true); }} className="text-neon-cyan/50 hover:text-neon-cyan hover:bg-neon-cyan/10 rounded-xl transition-all">
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedStudent(sub); setShowDeleteDialog(true); }} className="text-neon-pink/50 hover:text-neon-pink hover:bg-neon-pink/10 rounded-xl transition-all">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {activeTab === 'activity' && (
            <Card className="rounded-[32px] border border-neon-border shadow-2xl p-10 bg-neon-card/50 backdrop-blur-md">
              <CardTitle className="text-xl uppercase tracking-tighter mb-10 text-center text-white font-black italic">System Audit Intelligence</CardTitle>
              <div className="space-y-4 max-w-4xl mx-auto">
                {activityLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-6 p-5 rounded-[24px] border border-neon-border bg-black/40 hover:border-neon-cyan/30 transition-all shadow-xl group">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.2)] ${log.action === 'login' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-neon-pink/10 text-neon-pink border border-neon-pink/20'}`}>
                      <ActivityIcon className="w-7 h-7" />
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                      <div>
                        <p className="font-black text-white uppercase italic tracking-tight">{log.user_name || 'Anonymous'}</p>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{log.user_id}</p>
                      </div>
                      <div className="text-center md:block hidden">
                        {log.user_status && getStatusBadge(log.user_status)}
                      </div>
                      <div className="text-right">
                        <p className={`font-black uppercase text-[10px] tracking-[0.2em] mb-1 ${log.action === 'login' ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]' : 'text-neon-pink drop-shadow-[0_0_8px_rgba(255,0,229,0.3)]'}`}>{log.action}</p>
                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'generator' && (
            <div className="max-w-xl mx-auto space-y-8 py-10 text-center animate-scale-in">
              <Card className="rounded-[48px] border border-neon-border shadow-3xl p-12 bg-neon-card/80 backdrop-blur-xl relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink" />
                <div className="w-20 h-20 bg-neon-cyan/10 text-neon-cyan rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(0,242,255,0.15)] border border-neon-cyan/20"><RefreshCw className="w-10 h-10" /></div>
                <h2 className="text-2xl uppercase text-white mb-6 tracking-tighter font-black italic">Token Generator</h2>
                <div className="p-10 rounded-[32px] bg-black/40 border-2 border-dashed border-neon-border/50 mb-10 shadow-inner">
                  {generatedCredentials ? (
                    <div className="space-y-6">
                      <p className="text-[10px] text-neon-cyan font-black uppercase tracking-[0.4em] mb-6 drop-shadow-[0_0_8px_rgba(0,242,255,0.4)]">Master Tokens Ready</p>
                      <div className="grid grid-cols-1 gap-8 text-center">
                        <div className="space-y-2">
                          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">System Identity</p>
                          <p className="text-3xl text-white tracking-tighter font-black shadow-text">{generatedCredentials.id}</p>
                        </div>
                        <div className="h-px bg-neon-border/50 w-24 mx-auto" />
                        <div className="space-y-2">
                          <p className="text-[9px] text-gray-400 uppercase tracking-widest font-black">Secret Access Key</p>
                          <p className="text-3xl text-neon-pink tracking-tighter font-black drop-shadow-[0_0_12px_rgba(255,0,229,0.4)]">{generatedCredentials.password}</p>
                        </div>
                      </div>
                    </div>
                  ) : <div className="py-12 flex flex-col items-center gap-4 opacity-20"><div className="w-2 h-2 bg-neon-cyan rounded-full animate-ping" /><p className="text-gray-400 uppercase tracking-[0.5em] italic text-[10px] font-black">Engine Standby...</p></div>}
                </div>
                <Button onClick={() => { const id = 'STU' + Math.floor(1000 + Math.random() * 9000); const pass = Math.floor(100000 + Math.random() * 900000).toString(); setGeneratedCredentials({ id, password: pass }); setNewStudentId(id); setNewStudentPassword(pass); toast.success('Tokens Generated'); }} className="w-full bg-neon-cyan text-black h-20 rounded-[28px] shadow-[0_0_30px_rgba(0,242,255,0.3)] text-xs uppercase tracking-[0.3em] transition-all font-black italic hover:scale-[1.02] active:scale-[0.98]">EXECUTE ENGINE</Button>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* DIALOGS SECTION */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-[40px] max-w-md p-10 border border-neon-cyan/30 shadow-3xl bg-neon-card backdrop-blur-2xl overflow-hidden font-inter">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan to-neon-purple" />
          <DialogHeader className="mb-10 text-center">
            <DialogTitle className="text-xl uppercase text-white tracking-tighter font-black italic">System Entry</DialogTitle>
            <DialogDescription className="text-neon-cyan uppercase text-[9px] tracking-[0.3em] mt-2 text-center font-black drop-shadow-[0_0_5px_rgba(0,242,255,0.3)]">Authorize New Profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-8">
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Legal Full Name</Label><Input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5 focus:border-neon-cyan transition-all shadow-inner" /></div>
            <div className="space-y-2">
              <Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Identity Token</Label>
              <div className="flex gap-3">
                <Input value={newStudentId} onChange={e => setNewStudentId(e.target.value)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-lg px-5 text-neon-cyan font-black flex-1 tracking-widest shadow-inner" />
                <Button variant="outline" onClick={() => setNewStudentId('STU'+Math.floor(1000+Math.random()*9000))} className="h-14 w-14 rounded-2xl border-neon-border bg-black/40 hover:bg-neon-cyan/10 transition-all flex-shrink-0"><RefreshCw className="w-5 h-5 text-neon-cyan" /></Button>
              </div>
            </div>
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Secret Access Key</Label><Input value={newStudentPassword} onChange={e => setNewStudentPassword(e.target.value)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5 focus:border-neon-cyan transition-all shadow-inner" placeholder="••••••••" /></div>
          </div>
          <DialogFooter className="mt-12"><Button onClick={handleAddStudent} className="w-full bg-neon-cyan text-black h-16 rounded-[24px] shadow-[0_0_20px_rgba(0,242,255,0.2)] uppercase text-[10px] tracking-[0.2em] transition-all hover:scale-[1.02] font-black italic">AUTHORIZE ENTRY</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddSubAdminDialog} onOpenChange={setShowAddSubAdminDialog}>
        <DialogContent className="rounded-[40px] max-w-md p-10 border border-neon-purple/30 shadow-3xl bg-neon-card backdrop-blur-2xl overflow-hidden font-inter">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-purple to-neon-pink" />
          <DialogHeader className="mb-10 text-center">
            <DialogTitle className="text-xl uppercase text-white tracking-tighter font-black italic">Deploy Creator</DialogTitle>
            <p className="text-neon-purple uppercase text-[9px] tracking-[0.3em] mt-2 font-black drop-shadow-[0_0_5px_rgba(188,19,254,0.3)]">Authorize Sub-Admin Profile</p>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Creator Label</Label><Input value={newSubAdminName} onChange={e => setNewSubAdminName(e.target.value)} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5 focus:border-neon-purple shadow-inner" /></div>
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">System Identity</Label><Input value={newSubAdminId} onChange={e => setNewSubAdminId(e.target.value.toUpperCase())} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-black tracking-widest px-5 focus:border-neon-purple shadow-inner" placeholder="SUB-XXX" /></div>
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Access Key</Label><Input value={newSubAdminPassword} onChange={e => setNewSubAdminPassword(e.target.value)} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5 focus:border-neon-purple shadow-inner" placeholder="••••••••" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Endpoint</Label><Input value={newSubAdminEmail} onChange={e => setNewSubAdminEmail(e.target.value)} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white text-xs px-5 focus:border-neon-purple shadow-inner" /></div>
              <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Contact</Label><Input value={newSubAdminContact} onChange={e => setNewSubAdminContact(e.target.value)} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white text-xs px-5 focus:border-neon-purple shadow-inner" /></div>
            </div>
          </div>
          <DialogFooter className="mt-12"><Button onClick={handleAddSubAdmin} className="w-full bg-neon-purple text-white h-16 rounded-[24px] shadow-[0_0_20px_rgba(188,19,254,0.2)] uppercase text-[10px] tracking-[0.2em] transition-all hover:scale-[1.02] font-black italic">EXECUTE DEPLOYMENT</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-[40px] max-w-md p-10 border border-neon-cyan/30 shadow-3xl bg-neon-card backdrop-blur-2xl font-inter">
          <div className="absolute top-0 left-0 w-full h-1 bg-neon-cyan shadow-[0_0_15px_#00f2ff]" />
          <DialogHeader className="mb-10 text-center">
            <DialogTitle className="text-xl uppercase text-white tracking-tighter font-black italic">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black tracking-widest ml-1">Identity Name</Label><Input value={selectedStudent?.name || ''} onChange={e => setSelectedStudent(selectedStudent ? {...selectedStudent, name: e.target.value} : null)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5 focus:border-neon-cyan shadow-inner" /></div>
            <div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black tracking-widest ml-1">System ID</Label><Input value={selectedStudent?.id || ''} onChange={e => setSelectedStudent(selectedStudent ? {...selectedStudent, id: e.target.value.toUpperCase()} : null)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-neon-cyan font-black tracking-widest px-5 shadow-inner" /></div>
            <div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black tracking-widest ml-1">Access Key</Label><Input value={selectedStudent?.password || ''} onChange={e => setSelectedStudent(selectedStudent ? {...selectedStudent, password: e.target.value} : null)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5 shadow-inner" /></div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-gray-500 font-black tracking-widest ml-1">System Status</Label>
              <Select value={selectedStudent?.status} onValueChange={(v: any) => setSelectedStudent(selectedStudent ? {...selectedStudent, status: v} : null)}>
                <SelectTrigger className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-black"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-neon-card border-neon-border">
                  <SelectItem value="active" className="text-green-400 font-black uppercase text-[10px] tracking-widest">ACTIVE</SelectItem>
                  <SelectItem value="inactive" className="text-gray-400 font-black uppercase text-[10px] tracking-widest">INACTIVE</SelectItem>
                  <SelectItem value="suspended" className="text-neon-pink font-black uppercase text-[10px] tracking-widest">SUSPENDED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-12"><Button onClick={handleEditStudent} className="w-full bg-neon-cyan text-black h-16 rounded-[24px] shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-all hover:scale-[1.02] text-[10px] font-black uppercase tracking-[0.2em] italic">COMMIT PROFILE CHANGE</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminUploadDialog} onOpenChange={setShowAdminUploadDialog}>
        <DialogContent className="rounded-[40px] max-w-lg p-10 border border-neon-cyan/30 bg-neon-card shadow-3xl backdrop-blur-2xl overflow-hidden font-inter">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan to-neon-purple shadow-[0_0_20px_rgba(0,242,255,0.2)]" />
          <DialogHeader className="mb-10 text-center">
            <DialogTitle className="text-xl uppercase text-white tracking-tighter font-black italic">Asset Deployment</DialogTitle>
          </DialogHeader>
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase text-gray-500 font-black tracking-widest ml-1">Category</Label>
                <Select value={adminSelectedMaterialType} onValueChange={(v: any) => setAdminSelectedMaterialType(v)}>
                  <SelectTrigger className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-black"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-neon-card border-neon-border text-gray-300">
                    <SelectItem value="textbooks" className="font-black uppercase text-[9px]">Textbook</SelectItem>
                    <SelectItem value="videos" className="font-black uppercase text-[9px]">Video Asset</SelectItem>
                    <SelectItem value="pastQuestions" className="font-black uppercase text-[9px]">Examination</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase text-gray-500 font-black tracking-widest ml-1">Allocation</Label>
                <Select value={adminSelectedCourseId} onValueChange={setAdminSelectedCourseId}>
                  <SelectTrigger className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-black"><SelectValue placeholder="Target Module" /></SelectTrigger>
                  <SelectContent className="bg-neon-card border-neon-border text-gray-300">
                    <SelectItem value="global-course" className="font-black uppercase text-[9px] text-neon-cyan">Global Content</SelectItem>
                    {courses.map(c => <SelectItem key={c.id} value={c.id} className="font-black uppercase text-[9px]">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {adminSelectedCourseId && adminSelectedCourseId !== 'global-course' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-[10px] uppercase text-gray-500 font-black tracking-widest ml-1">Audience (Optional)</Label>
                <div className="bg-black/40 rounded-2xl border border-neon-border p-1">
                  <MultiSelect 
                    options={students.filter(s => s.courses && s.courses.includes(adminSelectedCourseId)).map(s => ({ label: s.name, value: s.id }))} 
                    selected={adminSelectedStudentIds} 
                    onChange={setAdminSelectedStudentIds} 
                    placeholder="Global Broadcast within Module" 
                  />
                </div>
              </div>
            )}

            <div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black tracking-widest ml-1">Asset Identity</Label><Input value={adminNewMaterialTitle} onChange={e => setAdminNewMaterialTitle(e.target.value)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5 shadow-inner" placeholder="Label for this deployment..." /></div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-gray-500 font-black tracking-widest ml-1">Physical Binary</Label>
              <div className="relative">
                <Input type="file" onChange={e => setAdminNewMaterialFile(e.target.files?.[0] || null)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-gray-400 file:bg-neon-cyan file:text-black file:border-none file:h-full file:px-6 file:mr-4 file:font-black file:uppercase file:text-[9px] cursor-pointer" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-12"><Button onClick={handleAdminUpload} className="w-full bg-neon-cyan text-black h-16 rounded-[24px] shadow-[0_0_25px_rgba(0,242,255,0.2)] uppercase tracking-[0.2em] text-[10px] transition-all font-black italic">EXECUTE DEPLOYMENT</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminProfileDialog} onOpenChange={setShowAdminProfileDialog}>
        <DialogContent className="rounded-[40px] max-w-2xl p-12 border border-neon-cyan/20 bg-neon-card/90 backdrop-blur-3xl shadow-3xl font-inter">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink" />
          <DialogHeader className="mb-12 text-center">
            <DialogTitle className="text-xl uppercase tracking-tighter text-white font-black italic">Settings</DialogTitle>
            <p className="text-[9px] text-gray-500 uppercase tracking-[0.4em] mt-2 font-black">Authorized Profile Intelligence</p>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Identity Label</Label><Input value={adminProfileData.name} onChange={e => setAdminProfileData({...adminProfileData, name: e.target.value})} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5 focus:border-neon-cyan transition-all" /></div>
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Master ID</Label><Input value={adminProfileData.id} disabled className="h-12 rounded-2xl border-neon-border bg-black/20 text-gray-600 font-black tracking-widest px-5 cursor-not-allowed opacity-50" /></div>
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Secret Key</Label><Input value={adminProfileData.password} onChange={e => setAdminProfileData({...adminProfileData, password: e.target.value})} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5 focus:border-neon-pink transition-all" placeholder="••••••••" /></div>
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Communication Endpoint</Label><Input value={adminProfileData.email} onChange={e => setAdminProfileData({...adminProfileData, email: e.target.value})} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white text-xs px-5 focus:border-neon-cyan transition-all" /></div>
            <div className="space-y-2 md:col-span-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Contact Line</Label><Input value={adminProfileData.contact} onChange={e => setAdminProfileData({...adminProfileData, contact: e.target.value})} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5 focus:border-neon-cyan transition-all" /></div>
          </div>

          <div className="mt-12 max-w-xs mx-auto">
            <Button onClick={handleUpdateAdminProfile} className="w-full bg-neon-cyan text-black h-16 rounded-[24px] shadow-[0_0_20px_rgba(0,242,255,0.2)] uppercase text-[10px] tracking-[0.3em] transition-all hover:scale-[1.02] font-black italic">SAVE CONFIGURATION</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMarkDialog} onOpenChange={setShowMarkDialog}>
        <DialogContent className="rounded-[40px] max-w-md p-10 border border-neon-cyan/30 bg-neon-card backdrop-blur-2xl shadow-3xl font-inter">
          <div className="absolute top-0 left-0 w-full h-1 bg-neon-cyan shadow-[0_0_15px_#00f2ff]" />
          <DialogHeader className="mb-10 text-center">
            <DialogTitle className="text-xl uppercase text-white tracking-tighter font-black italic">Academic Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-8">
            <div className="p-8 rounded-[32px] bg-black/40 border border-neon-border shadow-inner text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-neon-cyan/5 rounded-full -mr-10 -mt-10 blur-xl" />
              <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mb-3 font-black">Subject Intelligence</p>
              <p className="text-lg text-white uppercase font-black italic tracking-tight leading-none mb-2">{selectedResult?.student_name}</p>
              <p className="text-[10px] text-neon-cyan uppercase tracking-[0.2em] font-black drop-shadow-[0_0_5px_rgba(0,242,255,0.3)]">{selectedResult?.assessment_title}</p>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] uppercase text-gray-500 ml-2 font-black tracking-widest">Performance Award (%)</Label>
              <Input type="number" value={markingScore} onChange={e => setMarkingScore(Number(e.target.value))} className="h-20 rounded-[32px] border-neon-border bg-black/60 text-4xl text-center text-white font-black italic tracking-tighter focus:border-neon-cyan transition-all shadow-inner" />
            </div>
            <div className="flex items-center justify-between p-8 bg-black/40 rounded-[32px] border border-neon-border mt-8">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 text-white">
                  {markingStatus === 'released' ? <Eye className="w-5 h-5 text-neon-cyan" /> : <Shield className="w-5 h-5 text-gray-500" />}
                  Visibility
                </Label>
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest leading-none mt-1">
                  {markingStatus === 'released' ? 'Released to Profile' : 'Awaiting Authorization'}
                </p>
              </div>
              <Switch 
                checked={markingStatus === 'released'} 
                onCheckedChange={(checked) => {
                  setMarkingScoreStatus(checked ? 'released' : 'pending');
                  setMarkingShowScore(checked);
                }} 
              />
            </div>
          </div>
          <DialogFooter className="mt-12"><Button onClick={handleUpdateResult} className="w-full bg-neon-cyan text-black h-16 rounded-[24px] shadow-[0_0_20px_rgba(0,242,255,0.2)] uppercase tracking-[0.3em] text-[10px] transition-all hover:scale-[1.02] font-black italic">COMMIT RECORD</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddCourseDialog} onOpenChange={(open) => {
        setShowAddCourseDialog(open);
        if (!open) {
          setSelectedCourseToEdit(null);
          setNewCourse({ id: '', name: '', code: '', instructor: '', color: 'from-blue-500 to-indigo-500', image: '/course-placeholder.svg' });
        }
      }}>
        <DialogContent className="rounded-[40px] max-w-md p-10 border border-neon-cyan/20 bg-neon-card backdrop-blur-2xl shadow-3xl font-inter overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan to-neon-purple shadow-[0_0_15px_rgba(0,242,255,0.2)]" />
          <DialogHeader className="mb-10 text-center">
            <DialogTitle className="text-xl uppercase text-white tracking-tighter font-black italic">
              {selectedCourseToEdit ? 'Modify Module' : 'Initialize Module'}
            </DialogTitle>
            <p className="text-neon-cyan uppercase text-[9px] tracking-[0.4em] mt-2 text-center font-black opacity-60">Academic Structural Protocol</p>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Structural Name</Label><Input value={newCourse.name} onChange={e => setNewCourse({...newCourse, name: e.target.value.toUpperCase()})} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5" placeholder="e.g. MATHEMATICS" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Engine Code</Label><Input value={newCourse.code} onChange={e => setNewCourse({...newCourse, code: e.target.value.toUpperCase()})} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-black tracking-widest px-5" placeholder="MTH" /></div>
              <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">System ID</Label><Input value={newCourse.id} onChange={e => setNewCourse({...newCourse, id: e.target.value.toUpperCase()})} disabled={!!selectedCourseToEdit} className="h-12 rounded-2xl border-neon-border bg-black/20 text-gray-600 font-black tracking-widest px-5 disabled:opacity-30" placeholder="M101" /></div>
            </div>
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Lead Architect</Label><Input value={newCourse.instructor} onChange={e => setNewCourse({...newCourse, instructor: e.target.value})} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5" placeholder="Instructor Name" /></div>
          </div>
          <DialogFooter className="mt-12">
            <Button onClick={handleAddCourse} className="w-full bg-neon-cyan text-black h-16 rounded-[24px] shadow-[0_0_20px_rgba(0,242,255,0.2)] uppercase text-[10px] tracking-[0.3em] transition-all font-black italic">
              {selectedCourseToEdit ? 'SYNC MODULE' : 'INITIALIZE MODULE'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
