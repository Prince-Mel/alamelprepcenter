import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Settings,
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
  Key,
  Filter,
  X
} from 'lucide-react';

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
  assigned_student_ids?: string[] | string;
}

export function AdminDashboard({ user, onLogout, onSwitchToStudent, onUpdateUser }: AdminDashboardProps) {
  const isMobile = useIsMobile();
  const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subAdmins, setSubAdmins] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<AssessmentConfig[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [uploadedMaterials, setUploadedMaterials] = useState<UploadedMaterial[]>([]);
  const [regRequests, setRegRequests] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);

  // UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewScope, setViewScope] = useState<'all' | 'direct'>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [originalId, setOriginalId] = useState('');
  
  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAdminUploadDialog, setShowAdminUploadDialog] = useState(false);
  const [showAddSubAdminDialog, setShowAddSubAdminDialog] = useState(false);
  const [showAdminProfileDialog, setShowAdminProfileDialog] = useState(false);
  const [showMarkDialog, setShowMarkDialog] = useState(false);
  const [showAddCourseDialog, setShowAddCourseDialog] = useState(false);

  // Form States
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [generatedCredentials, setGeneratedCredentials] = useState<{id: string, password: string} | null>(null);

  const [newSubAdminName, setNewSubAdminName] = useState('');
  const [newSubAdminId, setNewSubAdminId] = useState('');
  const [newSubAdminPassword, setNewSubAdminPassword] = useState('');
  const [newSubAdminEmail, setNewSubAdminEmail] = useState('');
  const [newSubAdminContact, setNewSubAdminContact] = useState('');

  const [adminProfileData, setAdminProfileData] = useState({ name: user.name, id: user.id, password: user.password, email: user.email || '', contact: user.contact || '' });

  // Assessment Form
  const [selectedCourse, setSelectedCourse] = useState('');
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [endDate, setEndDate] = useState('');
  const [assignedStudents, setAssignedStudents] = useState<string[]>([]);
  const [newAssessmentQuestions, setNewAssessmentQuestions] = useState<any[]>([]);
  const [globalAssessmentMode, setGlobalAssessmentMode] = useState<'objective' | 'written' | 'integrated'>('objective');

  // Enrollment Form
  const [studentToAssign, setStudentToAssign] = useState<string[]>([]);
  const [courseToAssign, setCourseToAssign] = useState<string[]>([]);

  // Marking Form
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [markingScore, setMarkingScore] = useState(0);
  const [markingStatus, setMarkingScoreStatus] = useState<'pending'|'released'>('pending');
  const [markingShowScore, setMarkingShowScore] = useState(true);

  // Course Form
  const [selectedCourseToEdit, setSelectedCourseToEdit] = useState<Course | null>(null);
  const [newCourse, setNewCourse] = useState<Course>({ id: '', name: '', code: '', instructor: '', color: 'from-blue-500 to-indigo-500', image: '/course-placeholder.svg' });

  // SCM Form
  const [adminNewMaterialTitle, setAdminNewMaterialTitle] = useState('');
  const [adminNewMaterialFile, setAdminNewMaterialFile] = useState<File | null>(null);
  const [adminSelectedCourseId, setAdminSelectedCourseId] = useState('');
  const [adminSelectedMaterialType, setAdminSelectedMaterialType] = useState<'textbooks' | 'videos' | 'pastQuestions'>('textbooks');
  const [adminSelectedStudentIds, setAdminSelectedStudentIds] = useState<string[]>([]);

  // Fetch Data
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
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (assessmentsRes.ok) setAssessments(await assessmentsRes.json());
      if (resultsRes.ok) setResults(await resultsRes.json());
      if (materialsRes.ok) setUploadedMaterials(await materialsRes.json());
      if (regRes.ok) setRegRequests(await regRes.json());
      if (activityRes.ok) setActivityLogs(await activityRes.json());
      if (subAdminsRes.ok) setSubAdmins(await subAdminsRes.json());
    } catch (error) { console.error("Sync error", error); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Filtered Students
  const myStudents = useMemo(() => students.filter(s => viewScope === 'all' || (s as any).created_by === user.id), [students, viewScope, user.id]);
  const filteredStudents = useMemo(() => myStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase())), [myStudents, searchQuery]);
  const studentOptions: Option[] = useMemo(() => myStudents.map(s => ({ label: s.name, value: s.id })), [myStudents]);

  // Handlers
  const handleAddStudent = async () => {
    if (!newStudentName) { toast.error('Name required'); return; }
    const id = newStudentId || 'STU' + Math.floor(1000 + Math.random() * 9000);
    const pass = newStudentPassword || 'student123';
    const student = { id: id.toUpperCase(), name: newStudentName.toUpperCase(), role: 'student', password: pass, status: 'active', created_by: user.id };
    const res = await fetch(`${API_URL}/api/students`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(student) });
    if (res.ok) { fetchData(); setShowAddDialog(false); setNewStudentName(''); setNewStudentId(''); setNewStudentPassword(''); toast.success('Created'); }
  };

  const handleEditStudent = async () => {
    if (!selectedStudent) return;
    const res = await fetch(`${API_URL}/api/students/${originalId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selectedStudent) });
    if (res.ok) { fetchData(); setShowEditDialog(false); toast.success('Updated'); }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    const res = await fetch(`${API_URL}/api/students/${selectedStudent.id}`, { method: 'DELETE' });
    if (res.ok) { fetchData(); setShowDeleteDialog(false); setActiveTab('students'); toast.success('Deleted'); }
  };

  const handleAddSubAdmin = async () => {
    const sub = { id: newSubAdminId.toUpperCase(), name: newSubAdminName, password: newSubAdminPassword, role: 'subadmin', status: 'active', email: newSubAdminEmail, contact: newSubAdminContact };
    const res = await fetch(`${API_URL}/api/subadmins`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) });
    if (res.ok) { fetchData(); setShowAddSubAdminDialog(false); toast.success('Deployed'); }
  };

  const handleUpdateSubAdminStatus = async (sub: any, status: string) => {
    const res = await fetch(`${API_URL}/api/subadmins/${sub.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sub, status }) });
    if (res.ok) fetchData();
  };

  const handleAddCourse = async () => {
    const method = selectedCourseToEdit ? 'PUT' : 'POST';
    const url = selectedCourseToEdit ? `${API_URL}/api/courses/${selectedCourseToEdit.id}` : `${API_URL}/api/courses`;
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCourse) });
    if (res.ok) { fetchData(); setShowAddCourseDialog(false); toast.success(selectedCourseToEdit ? 'Updated' : 'Initialized'); }
  };

  const handleDeleteCourse = async (id: string) => {
    const res = await fetch(`${API_URL}/api/courses/${id}`, { method: 'DELETE' });
    if (res.ok) { fetchData(); toast.success('Deleted'); }
  };

  const handleAssignCourse = async () => {
    if (studentToAssign.length === 0 || courseToAssign.length === 0) return;
    for (const sId of studentToAssign) {
      for (const cId of courseToAssign) {
        await fetch(`${API_URL}/api/enrollments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: sId, course_id: cId }) });
      }
    }
    fetchData(); toast.success('Assigned'); setStudentToAssign([]); setCourseToAssign([]);
  };

  const handleApprove = async (id: string) => {
    const res = await fetch(`${API_URL}/api/materials/${id}/approve`, { method: 'PUT' });
    if (res.ok) { fetchData(); toast.success('Authorized'); }
  };

  const handleAdminUpload = async () => {
    if (!adminNewMaterialTitle || !adminSelectedCourseId) { toast.error('Fields missing'); return; }
    const process = async (fileUrl?: string) => {
      const mat = { id: `MAT${Date.now()}`, course_id: adminSelectedCourseId, type: adminSelectedMaterialType, title: adminNewMaterialTitle, url: fileUrl, uploaded_by: user.name, approved: true, date: new Date().toISOString().split('T')[0], assigned_student_ids: adminSelectedStudentIds };
      const res = await fetch(`${API_URL}/api/materials`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mat) });
      if (res.ok) { fetchData(); setShowAdminUploadDialog(false); toast.success('Deployed'); }
    };
    if (adminNewMaterialFile) {
      const formData = new FormData(); formData.append('file', adminNewMaterialFile);
      const uploadRes = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: formData });
      if (uploadRes.ok) { const data = await uploadRes.json(); process(data.url); }
    } else process();
  };

  const handleCreateAssessment = async () => {
    if (!selectedCourse || !assessmentTitle || !endDate) return;
    setIsDeploying(true);
    const config = { id: `ASMT${Date.now()}`, course_id: selectedCourse, type: 'quiz', title: assessmentTitle, mode: globalAssessmentMode, submission_mode: 'online', structured_questions: newAssessmentQuestions, duration, start_date: new Date().toISOString(), end_date: new Date(endDate).toISOString(), assigned_student_ids: assignedStudents };
    const res = await fetch(`${API_URL}/api/assessments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
    if (res.ok) { fetchData(); toast.success('Published'); setAssessmentTitle(''); setNewAssessmentQuestions([]); }
    setIsDeploying(false);
  };

  const handleUpdateResult = async () => {
    if (!selectedResult) return;
    try {
      const res = await fetch(`${API_URL}/api/results/${selectedResult.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score: markingScore, status: markingStatus, show_score: markingShowScore }) });
      if (res.ok) { fetchData(); setShowMarkDialog(false); toast.success('Updated'); }
    } catch (e) { toast.error('Update failed'); }
  };

  const handleUpdateAdminProfile = async () => {
    const updated = { ...user, name: adminProfileData.name.toUpperCase(), password: adminProfileData.password, email: adminProfileData.email, contact: adminProfileData.contact };
    const res = await fetch(`${API_URL}/api/students/${user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    if (res.ok) { onUpdateUser(updated, user.id); setShowAdminProfileDialog(false); toast.success('Saved'); }
  };

  const addQuestion = () => {
    setNewAssessmentQuestions([...newAssessmentQuestions, { id: Date.now().toString(), type: globalAssessmentMode, text: '', objectiveText: '', modelAnswer: '', options: ['', '', '', ''], correctAnswer: 0, activeTab: 'objective' }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...newAssessmentQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setNewAssessmentQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setNewAssessmentQuestions(newAssessmentQuestions.filter((_, i) => i !== index));
  };

  const handleGlobalModeChange = (val: 'objective' | 'written' | 'integrated') => {
    setGlobalAssessmentMode(val);
    setNewAssessmentQuestions(newAssessmentQuestions.map(q => ({ ...q, type: val, activeTab: val === 'written' ? 'written' : 'objective' })));
  };

  const handleApproveRequest = async (req: any) => {
    const id = (req.role === 'student' ? 'STU' : 'ADM') + Math.floor(1000 + Math.random() * 8999);
    const pass = Math.floor(100000 + Math.random() * 899999).toString();
    const userData = { id, name: req.name, password: pass, role: req.role, status: 'active', email: req.email, contact: req.phone, details: req.details, created_by: user.id };
    const res = await fetch(`${API_URL}${req.role === 'student' ? '/api/students' : '/api/subadmins'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData) });
    if (res.ok) { await fetch(`${API_URL}/api/reg-requests/${req.id}`, { method: 'DELETE' }); fetchData(); toast.success(`Authorized as ${id}`); }
  };

  const handleRejectRequest = async (req: any) => {
    await fetch(`${API_URL}/api/reg-requests/${req.id}`, { method: 'DELETE' }); fetchData(); toast.error('Rejected');
  };

  const handleView = (item: UploadedMaterial) => { if (item.url) window.open(item.url, '_blank'); };
  const handleDownload = (item: UploadedMaterial) => { if (item.url) { const link = document.createElement('a'); link.href = item.url; link.download = item.title; document.body.appendChild(link); link.click(); document.body.removeChild(link); } };

  const getStatusBadge = (s: string) => {
    const colors: any = { active: 'bg-green-500/20 text-green-400 border-green-500/50', inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/50', suspended: 'bg-red-500/20 text-red-400 border-red-500/50' };
    return <Badge className={cn(colors[s] || 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50', "font-semibold border")}>{s.toUpperCase()}</Badge>;
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-neon-bg text-neon-cyan animate-pulse uppercase tracking-widest text-lg font-black shadow-[0_0_30px_rgba(0,242,255,0.2)]">AlaMel System Syncing...</div>;

  return (
    <div className="min-h-screen flex bg-neon-bg relative overflow-x-hidden font-inter text-gray-300">
      {/* Sidebar */}
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
          <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 rounded-xl text-neon-pink/70 hover:bg-neon-pink/10 hover:text-neon-pink transition-all group border border-transparent hover:border-neon-pink/30">
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
            {!sidebarCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>}
          </button>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-500 ${isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-20' : 'ml-64')}`}>
        <header className="h-20 bg-neon-bg/80 backdrop-blur-xl border-b border-neon-border/50 px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-4">
            {isMobile && <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="text-neon-cyan"><Menu className="w-6 h-6" /></Button>}
            <h1 className="text-sm font-black text-white uppercase tracking-[0.2em] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              {activeTab === 'timer' ? 'Assessment' : activeTab === 'course-assignment' ? 'Enrollment' : activeTab.replace('-', ' ')}
            </h1>
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
                    <Input placeholder="Search students..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 rounded-2xl h-12 bg-neon-card border-neon-border text-white font-semibold focus-visible:ring-neon-cyan/50 shadow-inner" />
                  </div>
                  <div className="flex bg-neon-card rounded-2xl p-1 shadow-inner border border-neon-border/50">
                    <button onClick={() => setViewScope('all')} className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", viewScope === 'all' ? "bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,242,255,0.4)]" : "text-gray-500 hover:text-gray-300")}>All Records</button>
                    <button onClick={() => setViewScope('direct')} className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", viewScope === 'direct' ? "bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,242,255,0.4)]" : "text-gray-500 hover:text-gray-300")}>Authorized By Me</button>
                  </div>
                </div>
                <Button onClick={() => setShowAddDialog(true)} className="bg-neon-cyan text-black rounded-2xl h-12 px-10 shadow-[0_0_20px_rgba(0,242,255,0.3)] hover:shadow-[0_0_30px_rgba(0,242,255,0.5)] transition-all text-[10px] font-black tracking-widest uppercase">ADD STUDENT</Button>
              </div>
              <Card className="rounded-[32px] overflow-hidden border border-neon-border bg-neon-card/50 backdrop-blur-md shadow-2xl">
                <Table>
                  <TableHeader className="bg-black/40"><TableRow className="hover:bg-transparent border-neon-border/50"><TableHead className="px-8 py-6 uppercase text-[10px] font-black tracking-widest text-neon-cyan">Identity</TableHead><TableHead className="uppercase text-[10px] text-center font-black tracking-widest text-neon-cyan">Status</TableHead><TableHead className="text-right px-8 uppercase text-[10px] font-black tracking-widest text-neon-cyan">Action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredStudents.map(s => (
                      <TableRow key={s.id} className="hover:bg-neon-cyan/5 cursor-pointer border-neon-border/30 transition-colors group" onClick={() => { setSelectedStudent(s); setOriginalId(s.id); setActiveTab('student-workspace'); }}>
                        <TableCell className="px-8 py-6 flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center text-neon-cyan font-black text-xs shadow-inner">{s.id.slice(-2)}</div><div><p className="text-white text-sm font-bold tracking-tight">{s.name}</p><p className="text-[10px] text-gray-500 uppercase font-black tracking-widest group-hover:text-neon-cyan/70 transition-colors">{s.id}</p></div></TableCell>
                        <TableCell className="text-center">{getStatusBadge(s.status)}</TableCell>
                        <TableCell className="text-right px-8"><Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setSelectedStudent(s); setShowDeleteDialog(true); }} className="text-neon-pink/50 hover:text-neon-pink hover:bg-neon-pink/10 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></Button></TableCell>
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
                <Card className="rounded-[32px] p-8 border border-neon-border bg-neon-cyan/5 text-white relative overflow-hidden h-full shadow-inner">
                  <div className="relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-neon-cyan text-black flex items-center justify-center text-xl font-black shadow-lg uppercase mb-6">{selectedStudent.name[0]}</div>
                    <h2 className="text-xl uppercase tracking-tighter mb-1 leading-none font-black text-white">{selectedStudent.name}</h2>
                    <p className="text-neon-cyan/60 text-[10px] uppercase tracking-[0.2em] mb-8 font-black">{selectedStudent.id}</p>
                    <div className="space-y-4">
                      <div className="space-y-1"><p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">ACCESS PASSWORD</p><p className="text-lg tracking-tight font-black text-white">{selectedStudent.password}</p></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">EMAIL</p><p className="text-[10px] font-bold truncate text-gray-300">{selectedStudent.email || 'N/A'}</p></div>
                        <div className="space-y-1"><p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">CONTACT</p><p className="text-[10px] font-bold text-gray-300">{selectedStudent.contact || 'N/A'}</p></div>
                      </div>
                      <div className="space-y-1 pt-4 border-t border-neon-border/50"><p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">STATUS</p><div>{getStatusBadge(selectedStudent.status)}</div></div>
                    </div>
                  </div>
                </Card>
                <Card className="lg:col-span-2 rounded-[32px] p-8 border border-neon-border bg-neon-card/30 backdrop-blur-md shadow-2xl relative h-full">
                  <div className="flex justify-between items-center mb-8 pb-6 border-b border-neon-border/50">
                    <div><h3 className="text-lg uppercase tracking-tight text-white font-black">Performance Analytics</h3><p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] mt-0.5 font-black">Live Assessment Intelligence</p></div>
                    <div className="flex gap-4">
                      <div className="text-right"><p className="text-lg text-neon-cyan tracking-tighter font-black">{results.filter(r => r.student_id === selectedStudent.id).length}</p><p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Tests</p></div>
                      <div className="text-right pl-4 border-l border-neon-border/50"><p className="text-lg text-neon-pink tracking-tighter font-black">{Math.round(results.filter(r => r.student_id === selectedStudent.id).reduce((acc, curr) => acc + curr.score, 0) / (results.filter(r => r.student_id === selectedStudent.id).length || 1))}%</p><p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">AVG</p></div>
                    </div>
                  </div>
                  <ScrollArea className="h-[350px] pr-4">
                    <Table>
                      <TableHeader className="bg-black/40 border-b border-neon-border/50"><TableRow className="hover:bg-transparent"><TableHead className="py-3 text-[9px] uppercase font-black tracking-widest text-neon-cyan">Title</TableHead><TableHead className="text-[9px] uppercase text-center font-black tracking-widest text-neon-cyan">Result</TableHead><TableHead className="text-[9px] uppercase text-right font-black tracking-widest text-neon-cyan">Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {results.filter(r => r.student_id === selectedStudent.id).map(r => (
                          <TableRow key={r.id} className="border-b border-neon-border/20 hover:bg-neon-cyan/5 transition-colors">
                            <TableCell className="py-4"><p className="text-white uppercase text-xs font-black tracking-tight">{r.assessment_title}</p><p className="text-[8px] text-gray-500 tracking-[0.2em] font-black uppercase">{r.course_name}</p></TableCell>
                            <TableCell className="text-center"><span className={cn("text-base font-black tracking-tighter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]", r.score >= 50 ? 'text-neon-cyan' : 'text-neon-pink')}>{r.score}%</span></TableCell>
                            <TableCell className="text-right"><Badge className={cn("text-[7px] uppercase font-black tracking-widest border", r.status === 'released' ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30' : 'bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30')}>{r.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              </div>
              <Card className="rounded-[32px] p-8 border border-neon-border bg-neon-card relative overflow-hidden shadow-2xl">
                <h3 className="text-lg uppercase tracking-tight text-white mb-6 font-black italic">Enrolled Modules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.filter(c => selectedStudent.courses?.includes(c.id)).map(c => (
                    <div key={c.id} className={cn("p-6 rounded-[24px] transition-all flex justify-between items-center group w-full text-white shadow-xl border border-white/10 hover:border-white/30", c.color)}>
                      <p className="uppercase tracking-widest text-sm font-black italic">{c.name}</p>
                      <Button variant="ghost" size="icon" onClick={() => fetch(`${API_URL}/api/enrollments/${selectedStudent.id}/${c.id}`, {method:'DELETE'}).then(() => fetchData())} className="text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-5 h-5" /></Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'reg-requests' && (
            <Card className="rounded-[32px] border border-neon-border shadow-2xl p-8 bg-neon-card/50 backdrop-blur-md overflow-hidden">
              <div className="flex justify-between items-center mb-8"><div><h2 className="text-xl uppercase tracking-tighter text-white font-black italic">Registration Queue</h2><p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1 font-black">Review entry requests</p></div></div>
              <Table>
                <TableHeader className="bg-black/40 border-b border-neon-border/50"><TableRow className="hover:bg-transparent"><TableHead className="px-8 py-6 text-neon-cyan uppercase text-[10px] font-black tracking-widest">Candidate</TableHead><TableHead className="text-neon-cyan uppercase text-[10px] text-center font-black tracking-widest">Identity</TableHead><TableHead className="text-right px-8 text-neon-cyan uppercase text-[10px] font-black tracking-widest">Decision</TableHead></TableRow></TableHeader>
                <TableBody>
                  {regRequests.map(r => (
                    <TableRow key={r.id} className="border-b border-neon-border/20 hover:bg-neon-cyan/5 transition-colors">
                      <TableCell className="px-8 py-8"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan text-lg font-black">{r.name[0]}</div><div><p className="text-lg text-white font-black leading-none mb-1">{r.name}</p><p className="text-[10px] text-gray-500 font-bold uppercase">{r.email}</p></div></div></TableCell>
                      <TableCell className="text-center"><Badge className={cn("rounded-full px-4 py-1 text-[8px] font-black uppercase border", r.role === 'student' ? "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30" : "bg-neon-purple/10 text-neon-purple border-neon-purple/30")}>{r.role}</Badge></TableCell>
                      <TableCell className="text-right px-8"><div className="flex justify-end gap-3"><Button onClick={() => handleApproveRequest(r)} className="bg-neon-cyan text-black px-8 rounded-2xl h-12 shadow-lg text-[10px] font-black tracking-widest italic">AUTHORIZE</Button><Button variant="ghost" onClick={() => handleRejectRequest(r)} className="text-gray-500 hover:text-neon-pink h-12 px-6 text-[10px] font-black tracking-widest uppercase rounded-2xl">REJECT</Button></div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {activeTab === 'ac-center' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center"><div><h2 className="text-xl text-white uppercase tracking-tighter font-black italic">Authorized Creators</h2><p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mt-1">Sub-Admin Console</p></div><Button onClick={() => setShowAddSubAdminDialog(true)} className="bg-neon-cyan text-black rounded-2xl h-12 px-8 shadow-lg text-[10px] font-black uppercase italic">DEPLOY CREATOR</Button></div>
              <Card className="rounded-[32px] overflow-hidden border border-neon-border bg-neon-card/50 backdrop-blur-md shadow-2xl">
                <Table>
                  <TableHeader className="bg-black/40 border-b border-neon-border/50"><TableRow className="hover:bg-transparent"><TableHead className="px-8 py-6 uppercase text-[10px] font-black tracking-widest text-neon-cyan">Name</TableHead><TableHead className="uppercase text-[10px] text-center font-black tracking-widest text-neon-cyan">Capacity</TableHead><TableHead className="uppercase text-[10px] text-center font-black tracking-widest text-neon-cyan">Status</TableHead><TableHead className="text-right px-8 uppercase text-[10px] font-black tracking-widest text-neon-cyan">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {subAdmins.map(sub => (
                      <TableRow key={sub.id} className="border-b border-neon-border/20 hover:bg-neon-cyan/5 transition-colors group"><TableCell className="px-8 py-6 flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center text-neon-purple uppercase font-black">{sub.name[0]}</div><div><p className="text-white text-sm font-black">{sub.name}</p><p className="text-[10px] text-gray-500 font-black">{sub.id}</p></div></TableCell><TableCell className="text-center font-black text-lg text-neon-cyan">{sub.student_count}</TableCell><TableCell className="text-center"><DropdownMenu><DropdownMenuTrigger>{getStatusBadge(sub.status)}</DropdownMenuTrigger><DropdownMenuContent className="rounded-xl bg-neon-card border border-neon-border"><DropdownMenuItem onClick={() => handleUpdateSubAdminStatus(sub, 'active')} className="text-green-400 font-black text-[10px]">SET ACTIVE</DropdownMenuItem><DropdownMenuItem onClick={() => handleUpdateSubAdminStatus(sub, 'inactive')} className="text-gray-400 font-black text-[10px]">SET INACTIVE</DropdownMenuItem><DropdownMenuItem onClick={() => handleUpdateSubAdminStatus(sub, 'suspended')} className="text-neon-pink font-black text-[10px]">SET SUSPENDED</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell><TableCell className="text-right px-8"><div className="flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => { setSelectedStudent(sub); setOriginalId(sub.id); setShowEditDialog(true); }} className="text-neon-cyan/50 hover:text-neon-cyan"><Settings className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => { setSelectedStudent(sub); setShowDeleteDialog(true); }} className="text-neon-pink/50 hover:text-neon-pink"><Trash2 className="w-4 h-4" /></Button></div></TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {activeTab === 'scm-management' && (
            <Card className="rounded-[32px] p-10 border border-neon-border bg-neon-card/50 backdrop-blur-md shadow-2xl">
              <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6"><div><CardTitle className="text-2xl uppercase tracking-tighter text-white font-black italic">SCM Repository</CardTitle><p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-black mt-2">Central Asset Management</p></div><Button onClick={() => setShowAdminUploadDialog(true)} className="bg-neon-cyan text-black rounded-2xl h-14 px-10 shadow-lg text-[10px] font-black uppercase italic"><Upload className="w-5 h-5 mr-3" /> DEPLOY ASSET</Button></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {uploadedMaterials.map(m => (
                  <Card key={m.id} className="rounded-[32px] border border-neon-border/50 shadow-xl p-8 group relative overflow-hidden bg-black/40 backdrop-blur-sm hover:border-neon-cyan/30 transition-all"><div className="flex justify-between items-start mb-6"><div className="w-14 h-14 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan flex items-center justify-center shadow-inner"><Files className="w-7 h-7" /></div><div className="flex gap-2">{!m.approved && <Button variant="outline" size="sm" className="bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30 hover:bg-neon-cyan hover:text-black text-[9px] font-black h-9 rounded-xl uppercase px-4" onClick={() => handleApprove(m.id)}>AUTHORIZE</Button>}<Button variant="ghost" size="icon" onClick={() => fetch(`${API_URL}/api/materials/${m.id}`, {method:'DELETE'}).then(() => fetchData())} className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-neon-pink h-9 w-9"><Trash2 className="w-4 h-4" /></Button></div></div><h4 className="text-white text-base mb-1 line-clamp-1 font-black uppercase italic">{m.title}</h4><p className="text-[9px] text-gray-500 uppercase mb-4 font-black">{m.type} • {courses.find(c => c.id === m.course_id)?.name || 'Global'}</p><div className="flex items-center justify-between mb-6 pb-6 border-b border-neon-border/30"><p className="text-[8px] text-gray-600 font-black italic">By {m.uploaded_by}</p><Badge className={cn("text-[8px] font-black uppercase px-3 py-1 rounded-full border shadow-sm", m.approved ? "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30" : "bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30")}>{m.approved ? 'Live' : 'Pending'}</Badge></div><div className="flex gap-4"><Button variant="outline" className="flex-1 rounded-2xl h-12 text-[10px] font-black border-neon-border bg-black/40 text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/50 italic" onClick={() => handleView(m)}><Eye className="w-4 h-4 mr-2" /> REVIEW</Button><Button variant="outline" size="icon" className="rounded-2xl h-12 w-12 border-neon-border bg-black/40 text-gray-400 hover:text-neon-cyan shadow-lg" onClick={() => handleDownload(m)}><Download className="w-4 h-4" /></Button></div></Card>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'timer' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <Card className="lg:col-span-1 rounded-[32px] p-8 border border-neon-border bg-neon-card h-full shadow-2xl">
                  <CardHeader className="p-0 mb-8"><CardTitle className="text-lg uppercase font-black italic text-white tracking-tighter">Assessment Config</CardTitle><CardDescription className="text-[10px] uppercase text-gray-500 font-black tracking-widest">Define test parameters</CardDescription></CardHeader>
                  <div className="space-y-6">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Module</Label><Select value={selectedCourse} onValueChange={setSelectedCourse}><SelectTrigger className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold"><SelectValue placeholder="Select Module" /></SelectTrigger><SelectContent className="bg-neon-card border-neon-border">{courses.map(c => <SelectItem key={c.id} value={c.id} className="font-bold text-gray-300">{c.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Title</Label><Input value={assessmentTitle} onChange={e => setAssessmentTitle(e.target.value)} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold" /></div>
                    <div className="grid grid-cols-1 gap-6"><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Deadline</Label><Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold" /></div><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Duration (Min)</Label><Input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold" /></div></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Audience</Label><MultiSelect options={studentOptions} selected={assignedStudents} onChange={setAssignedStudents} placeholder="Select identities..." /></div>
                    <Button onClick={handleCreateAssessment} disabled={isDeploying} className="w-full bg-neon-cyan text-black h-14 rounded-2xl shadow-lg uppercase transition-all text-[10px] font-black tracking-widest italic mt-4 hover:scale-105">{isDeploying ? 'DEPLOYING...' : 'DEPLOY ASSESSMENT'}</Button>
                  </div>
                </Card>
                <Card className="lg:col-span-2 rounded-[32px] p-8 border border-neon-border bg-neon-card/50 backdrop-blur-md shadow-2xl h-full min-h-[600px]">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-neon-border/50"><div><CardTitle className="text-lg uppercase font-black italic text-white tracking-tighter">Questions Builder</CardTitle><CardDescription className="text-[10px] uppercase text-gray-500 font-black tracking-widest">{newAssessmentQuestions.length} units</CardDescription></div><div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-neon-border/50"><Label className="text-[8px] uppercase text-gray-500 font-black tracking-widest ml-2">Engine Mode:</Label><Select value={globalAssessmentMode} onValueChange={handleGlobalModeChange}><SelectTrigger className="h-9 w-40 rounded-xl border-neon-cyan/30 bg-transparent text-[9px] font-black uppercase tracking-widest text-neon-cyan"><SelectValue /></SelectTrigger><SelectContent className="bg-neon-card border-neon-border"><SelectItem value="objective" className="font-black text-[9px]">Objective</SelectItem><SelectItem value="written" className="font-black text-[9px]">Written</SelectItem><SelectItem value="integrated" className="font-black text-[9px]">Integrated</SelectItem></SelectContent></Select></div></div>
                  <ScrollArea className="h-[700px] pr-4">
                    <div className="space-y-8">
                      {newAssessmentQuestions.map((q, idx) => (
                        <div key={q.id} className="p-6 rounded-[32px] border border-neon-border bg-black/20 space-y-6 relative group transition-all hover:border-neon-cyan/30">
                          <Button variant="ghost" size="icon" onClick={() => removeQuestion(idx)} className="absolute top-4 right-4 h-10 w-10 rounded-full bg-neon-pink/10 text-neon-pink opacity-0 group-hover:opacity-100 transition-all border border-neon-pink/30"><Trash2 className="w-5 h-5" /></Button>
                          <div className="flex justify-between items-center"><span className="text-[10px] font-black text-neon-cyan uppercase tracking-widest bg-neon-cyan/5 px-4 py-2 rounded-full border border-neon-cyan/20">Unit {idx + 1}</span><Badge className="text-[8px] font-black uppercase tracking-widest bg-black/60 border border-neon-border text-gray-400">Mode: {q.type}</Badge></div>
                          {q.type === 'integrated' && <div className="flex bg-black/60 p-1 rounded-2xl w-fit border border-neon-border/50"><button onClick={() => updateQuestion(idx, 'activeTab', 'objective')} className={cn("px-6 py-2 rounded-xl text-[9px] font-black transition-all", q.activeTab !== 'written' ? "bg-neon-cyan text-black" : "text-gray-600")}>MCQ UNIT</button><button onClick={() => updateQuestion(idx, 'activeTab', 'written')} className={cn("px-6 py-2 rounded-xl text-[9px] font-black transition-all", q.activeTab === 'written' ? "bg-neon-cyan text-black" : "text-gray-600")}>ESSAY UNIT</button></div>}
                          {(q.type === 'written' || (q.type === 'integrated' && q.activeTab === 'written')) && <div className="space-y-3"><Label className="text-[9px] uppercase text-gray-500 font-black ml-1">Prompt</Label><Textarea value={q.text} onChange={e => updateQuestion(idx, 'text', e.target.value)} className="min-h-[120px] rounded-2xl border-neon-border bg-black/40 font-bold text-sm text-gray-200 resize-none p-5" placeholder="Academic enquiry..." /></div>}
                          {(q.type === 'written' || (q.type === 'integrated' && q.activeTab === 'written')) && <div className="space-y-3"><Label className="text-[9px] uppercase text-neon-cyan/70 font-black ml-1">Reference</Label><Textarea value={q.modelAnswer || ''} onChange={e => updateQuestion(idx, 'modelAnswer', e.target.value)} className="min-h-[100px] rounded-2xl border-neon-cyan/20 bg-neon-cyan/5 font-bold text-xs text-neon-cyan/80 resize-none p-5" placeholder="Evaluation criteria..." /></div>}
                          {(q.type === 'objective' || (q.type === 'integrated' && q.activeTab !== 'written')) && (
                            <div className="space-y-6">
                              <div className="space-y-3"><Label className="text-[9px] uppercase text-gray-500 font-black ml-1">MCQ Prompt</Label><Textarea value={q.objectiveText || ''} onChange={e => updateQuestion(idx, 'objectiveText', e.target.value)} className="min-h-[120px] rounded-2xl border-neon-border bg-black/40 font-bold text-sm text-gray-200 resize-none p-5" /></div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{q.options.map((opt: string, optIdx: number) => (
                                <div key={optIdx} className="space-y-3"><div className="flex items-center justify-between px-2"><Label className="text-[9px] uppercase text-gray-500 font-black">Option {String.fromCharCode(65 + optIdx)}</Label><div className="flex items-center gap-2 cursor-pointer" onClick={() => updateQuestion(idx, 'correctAnswer', optIdx)}><Label className="text-[8px] uppercase text-gray-500 font-black">Key?</Label><div className={cn("w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center", q.correctAnswer === optIdx ? "border-neon-cyan bg-neon-cyan shadow-[0_0_10px_#00f2ff]" : "border-neon-border bg-black/40")}>{q.correctAnswer === optIdx && <div className="w-1.5 h-1.5 bg-black rounded-full" />}</div></div></div><Textarea value={opt} onChange={e => { const newOpts = [...q.options]; newOpts[optIdx] = e.target.value; updateQuestion(idx, 'options', newOpts); }} className={cn("min-h-[70px] rounded-2xl border-2 text-xs px-5 py-4 resize-none transition-all font-bold", q.correctAnswer === optIdx ? "border-neon-cyan/50 bg-neon-cyan/5 text-neon-cyan" : "border-neon-border bg-black/20 text-gray-400")} /></div>
                              ))}</div>
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="pt-6 flex justify-center"><Button variant="outline" onClick={addQuestion} className="rounded-3xl border-2 border-dashed border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all font-black uppercase px-16 h-16"><Plus className="w-5 h-5 mr-3 stroke-[3px]" /> ADD NEW UNIT</Button></div>
                    </div>
                  </ScrollArea>
                </Card>
              </div>
              <Card className="rounded-[40px] p-10 border border-neon-border bg-neon-card/80 text-white overflow-hidden relative shadow-3xl">
                <div className="relative z-10"><div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12"><div><h3 className="text-2xl font-black italic uppercase tracking-tighter">Active Assessments</h3><p className="text-[10px] text-gray-500 uppercase font-black mt-2">Live Console</p></div><Badge className="bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest">{assessments.length} DEPLOYED</Badge></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{assessments.map(a => (<div key={a.id} className="p-8 rounded-[32px] bg-black/40 backdrop-blur-md border border-neon-border/50 flex justify-between items-center group shadow-2xl transition-all hover:bg-neon-cyan/[0.03] hover:border-neon-cyan/30"><div className="flex-1"><div className="flex items-center gap-3 mb-3"><Badge className="bg-neon-purple/20 text-neon-purple border border-neon-purple/40 text-[9px] uppercase font-black px-3 py-1">{a.type}</Badge><p className="text-[9px] text-neon-cyan/70 font-black uppercase tracking-[0.2em]">{courses.find(c => c.id === a.course_id)?.name}</p></div><p className="text-lg font-black tracking-tight text-white line-clamp-1 mb-2 italic uppercase">{a.title}</p><div className="flex items-center gap-6"><div className="flex items-center gap-2 text-gray-500 text-[9px] font-black uppercase"><Clock className="w-3.5 h-3.5" /> {a.duration}M</div></div></div><Button variant="ghost" size="icon" onClick={() => fetch(`${API_URL}/api/assessments/${a.id}`, {method:'DELETE'}).then(() => fetchData())} className="text-gray-700 hover:text-neon-pink hover:bg-neon-pink/10 transition-all ml-4 h-14 w-14 rounded-2xl border border-transparent hover:border-neon-pink/30"><Trash2 className="w-6 h-6" /></Button></div>))}</div></div>
              </Card>
            </div>
          )}

          {activeTab === 'course-assignment' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6"><div><h2 className="text-2xl text-white uppercase tracking-tighter font-black italic">Module & Enrollment</h2><p className="text-[10px] text-gray-500 uppercase font-black mt-2">Access Protocols</p></div><Button onClick={() => setShowAddCourseDialog(true)} className="bg-neon-cyan text-black rounded-2xl h-14 px-10 shadow-lg text-[10px] font-black uppercase italic hover:scale-105">INITIALIZE MODULE</Button></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="rounded-[32px] p-10 border border-neon-border bg-neon-card shadow-2xl"><CardTitle className="text-lg uppercase tracking-[0.2em] text-neon-cyan font-black mb-10 italic border-b border-neon-cyan/20 pb-4">Active Modules</CardTitle><ScrollArea className="h-[450px] pr-6"><div className="space-y-4">{courses.map(c => (<div key={c.id} className={cn("p-8 rounded-[32px] transition-all flex justify-between items-center group w-full text-white shadow-xl border border-white/5 hover:border-white/20 hover:scale-[1.02]", c.color)}><div className="flex items-center gap-6"><div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-xl font-black italic">{c.code.slice(0, 2)}</div><div><p className="uppercase tracking-tighter text-lg font-black italic leading-tight">{c.name}</p><p className="text-[9px] text-white/50 tracking-[0.2em] mt-1 font-black uppercase">LEAD: {c.instructor}</p></div></div><div className="flex gap-3"><Button variant="ghost" size="icon" onClick={() => { setSelectedCourseToEdit(c); setNewCourse(c); setShowAddCourseDialog(true); }} className="text-white/40 hover:text-white bg-white/5 h-11 w-11 rounded-xl transition-all"><Settings className="w-5 h-5" /></Button><Button variant="ghost" size="icon" onClick={() => handleDeleteCourse(c.id)} className="text-white/40 hover:text-red-400 bg-white/5 h-11 w-11 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></Button></div></div>))}</div></ScrollArea></Card>
                <Card className="rounded-[32px] p-10 border border-neon-border bg-neon-card relative overflow-hidden shadow-2xl h-full"><CardTitle className="text-lg uppercase tracking-[0.2em] text-neon-cyan font-black mb-10 italic border-b border-neon-cyan/20 pb-4">Enrollment Protocol</CardTitle><div className="space-y-8 relative z-10"><div className="space-y-3"><Label className="text-[10px] uppercase text-gray-500 font-black ml-1">Identity</Label><Select value={studentToAssign[0]} onValueChange={(v) => setStudentToAssign([v])}><SelectTrigger className="rounded-2xl h-14 border-neon-border bg-black/40 text-white font-bold"><SelectValue placeholder="Select Identity" /></SelectTrigger><SelectContent className="bg-neon-card border-neon-border">{myStudents.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name} ({s.id})</SelectItem>)}</SelectContent></Select></div><div className="space-y-3"><Label className="text-[10px] uppercase text-gray-500 font-black ml-1">Module</Label><Select value={courseToAssign[0]} onValueChange={(v) => setCourseToAssign([v])}><SelectTrigger className="rounded-2xl h-14 border-neon-border bg-black/40 text-white font-bold"><SelectValue placeholder="Select Module" /></SelectTrigger><SelectContent className="bg-neon-card border-neon-border">{courses.map(c => <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>)}</SelectContent></Select></div><div className="pt-4"><Button onClick={handleAssignCourse} className="w-full h-16 bg-neon-cyan text-black rounded-2xl shadow-xl transition-all text-[10px] font-black uppercase tracking-[0.2em] italic hover:scale-105">AUTHORIZE ENROLLMENT</Button></div></div></Card>
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <Card className="rounded-[32px] border border-neon-border shadow-2xl p-10 bg-neon-card/50 backdrop-blur-md overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6"><div><h2 className="text-2xl uppercase tracking-tighter text-white font-black italic">Academic Intelligence</h2><p className="text-[10px] text-gray-500 uppercase font-black mt-2">Performance History</p></div><Button variant="outline" className="rounded-2xl border-neon-border bg-black/40 text-gray-400 hover:text-neon-cyan transition-all uppercase text-[10px] font-black h-12 px-8 tracking-widest italic shadow-lg"><Filter className="w-4 h-4 mr-3" /> FILTER ENGINE</Button></div>
              <Table>
                <TableHeader className="bg-black/40 border-b border-neon-border/50"><TableRow className="hover:bg-transparent"><TableHead className="px-8 py-6 text-neon-cyan uppercase text-[10px] font-black">Student Profile</TableHead><TableHead className="text-neon-cyan uppercase text-[10px] text-center font-black">Performance</TableHead><TableHead className="text-neon-cyan uppercase text-[10px] text-center font-black">Visibility</TableHead><TableHead className="text-right px-8 text-neon-cyan uppercase text-[10px] font-black">Action</TableHead></TableRow></TableHeader>
                <TableBody>{results.map(r => (<TableRow key={r.id} className="border-b border-neon-border/20 hover:bg-neon-cyan/5 transition-colors group"><TableCell className="px-8 py-8"><div className="flex items-center gap-5"><Avatar className="w-12 h-12 border border-neon-cyan/30 shadow-lg ring-2 ring-black"><AvatarFallback className="bg-neon-card text-neon-cyan uppercase text-xs font-black italic">{r.student_name?.[0] || 'S'}</AvatarFallback></Avatar><div><p className="text-white text-base tracking-tight font-black italic uppercase leading-tight">{r.student_name}</p><p className="text-[10px] text-gray-500 font-black uppercase mt-1">{r.student_id}</p></div></div></TableCell><TableCell className="text-center"><span className={cn("text-2xl font-black tracking-tighter italic", r.score >= 50 ? 'text-neon-cyan' : 'text-neon-pink')}>{r.score}%</span></TableCell><TableCell className="text-center"><Badge className={cn("px-5 py-2 rounded-full text-[9px] uppercase font-black border italic", r.status === 'released' ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30 shadow-[0_0_10px_rgba(0,242,255,0.1)]' : 'bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30 shadow-[0_0_10px_rgba(255,242,0,0.1)]')}>{r.status}</Badge></TableCell><TableCell className="text-right px-8"><Button onClick={() => { setSelectedResult(r); setMarkingScore(r.score); setMarkingScoreStatus(r.status); setMarkingShowScore(r.show_score ?? true); setShowMarkDialog(true); }} className="bg-neon-cyan text-black hover:shadow-lg px-8 rounded-2xl h-12 shadow-xl uppercase text-[10px] font-black tracking-widest transition-all italic hover:scale-105">REVIEW</Button></TableCell></TableRow>))}</TableBody>
              </Table>
            </Card>
          )}

          {activeTab === 'activity' && (
            <Card className="rounded-[32px] border border-neon-border shadow-2xl p-10 bg-neon-card/50 backdrop-blur-md">
              <CardTitle className="text-xl uppercase tracking-tighter mb-10 text-center text-white font-black italic">System Audit Intelligence</CardTitle>
              <div className="space-y-4 max-w-4xl mx-auto">
                {activityLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-6 p-5 rounded-[24px] border border-neon-border bg-black/40 hover:border-neon-cyan/30 transition-all shadow-xl group">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${log.action === 'login' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-neon-pink/10 text-neon-pink border border-neon-pink/20'}`}><ActivityIcon className="w-7 h-7" /></div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                      <div><p className="font-black text-white uppercase italic tracking-tight">{log.user_name || 'Anonymous'}</p><p className="text-[10px] text-gray-500 font-black">{log.user_id}</p></div>
                      <div className="text-center md:block hidden">{log.user_status && getStatusBadge(log.user_status)}</div>
                      <div className="text-right"><p className={`font-black uppercase text-[10px] tracking-[0.2em] mb-1 ${log.action === 'login' ? 'text-green-400' : 'text-neon-pink'}`}>{log.action}</p><p className="text-[9px] text-gray-600 font-black uppercase">{new Date(log.timestamp).toLocaleString()}</p></div>
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
                <div className="w-20 h-20 bg-neon-cyan/10 text-neon-cyan rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg border border-neon-cyan/20"><RefreshCw className="w-10 h-10" /></div>
                <h2 className="text-2xl uppercase text-white mb-6 tracking-tighter font-black italic">Token Generator</h2>
                <div className="p-10 rounded-[32px] bg-black/40 border-2 border-dashed border-neon-border/50 mb-10 shadow-inner">
                  {generatedCredentials ? (
                    <div className="space-y-6"><p className="text-[10px] text-neon-cyan font-black uppercase tracking-[0.4em] mb-6">Master Tokens Ready</p><div className="grid grid-cols-1 gap-8 text-center"><div className="space-y-2"><p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">System Identity</p><p className="text-3xl text-white tracking-tighter font-black">{generatedCredentials.id}</p></div><div className="h-px bg-neon-border/50 w-24 mx-auto" /><div className="space-y-2"><p className="text-[9px] text-gray-400 uppercase tracking-widest font-black">Secret Access Key</p><p className="text-3xl text-neon-pink tracking-tighter font-black drop-shadow-[0_0_12px_rgba(255,0,229,0.4)]">{generatedCredentials.password}</p></div></div></div>
                  ) : <div className="py-12 flex flex-col items-center gap-4 opacity-20"><div className="w-2 h-2 bg-neon-cyan rounded-full animate-ping" /><p className="text-gray-400 uppercase tracking-[0.5em] italic text-[10px] font-black">Engine Standby...</p></div>}
                </div>
                <Button onClick={() => { const id = 'STU' + Math.floor(1000 + Math.random() * 9000); const pass = Math.floor(100000 + Math.random() * 900000).toString(); setGeneratedCredentials({ id, password: pass }); setNewStudentId(id); setNewStudentPassword(pass); toast.success('Tokens Generated'); }} className="w-full bg-neon-cyan text-black h-20 rounded-[28px] shadow-lg text-xs uppercase tracking-[0.3em] transition-all font-black italic hover:scale-105">EXECUTE ENGINE</Button>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* DIALOGS SECTION */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-[40px] max-w-md p-10 border border-neon-cyan/30 shadow-3xl bg-neon-card backdrop-blur-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan to-neon-purple" />
          <DialogHeader className="mb-10 text-center"><DialogTitle className="text-xl uppercase text-white tracking-tighter font-black italic">System Entry</DialogTitle><DialogDescription className="text-neon-cyan uppercase text-[9px] tracking-[0.3em] mt-2 font-black">Authorize New Profile</DialogDescription></DialogHeader>
          <div className="space-y-8">
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">Legal Full Name</Label><Input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5 focus:border-neon-cyan" /></div>
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">Identity Token</Label><div className="flex gap-3"><Input value={newStudentId} onChange={e => setNewStudentId(e.target.value)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-lg px-5 text-neon-cyan font-black flex-1 tracking-widest" /><Button variant="outline" onClick={() => setNewStudentId('STU'+Math.floor(1000+Math.random()*9000))} className="h-14 w-14 rounded-2xl border-neon-border bg-black/40 hover:bg-neon-cyan/10 transition-all flex-shrink-0"><RefreshCw className="w-5 h-5 text-neon-cyan" /></Button></div></div>
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">Secret Access Key</Label><Input value={newStudentPassword} onChange={e => setNewStudentPassword(e.target.value)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5 focus:border-neon-cyan" placeholder="••••••••" /></div>
          </div>
          <DialogFooter className="mt-12"><Button onClick={handleAddStudent} className="w-full bg-neon-cyan text-black h-16 rounded-[24px] shadow-lg uppercase text-[10px] tracking-[0.2em] transition-all hover:scale-105 font-black italic">AUTHORIZE ENTRY</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddSubAdminDialog} onOpenChange={setShowAddSubAdminDialog}>
        <DialogContent className="rounded-[40px] max-w-md p-10 border border-neon-purple/30 shadow-3xl bg-neon-card backdrop-blur-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-purple to-neon-pink" />
          <DialogHeader className="mb-10 text-center"><DialogTitle className="text-xl uppercase text-white tracking-tighter font-black italic">Deploy Creator</DialogTitle><p className="text-neon-purple uppercase text-[9px] tracking-[0.3em] mt-2 font-black">Authorize Sub-Admin Profile</p></DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">Creator Label</Label><Input value={newSubAdminName} onChange={e => setNewSubAdminName(e.target.value)} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5" /></div>
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">System Identity</Label><Input value={newSubAdminId} onChange={e => setNewSubAdminId(e.target.value.toUpperCase())} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-black tracking-widest px-5" /></div>
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">Access Key</Label><Input value={newSubAdminPassword} onChange={e => setNewSubAdminPassword(e.target.value)} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">Endpoint</Label><Input value={newSubAdminEmail} onChange={e => setNewSubAdminEmail(e.target.value)} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white text-xs px-5" /></div><div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">Contact</Label><Input value={newSubAdminContact} onChange={e => setNewSubAdminContact(e.target.value)} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white text-xs px-5" /></div></div>
          </div>
          <DialogFooter className="mt-12"><Button onClick={handleAddSubAdmin} className="w-full bg-neon-purple text-white h-16 rounded-[24px] shadow-lg uppercase text-[10px] tracking-[0.2em] transition-all hover:scale-105 font-black italic">EXECUTE DEPLOYMENT</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-[40px] max-w-md p-10 border border-neon-cyan/30 shadow-3xl bg-neon-card backdrop-blur-2xl"><div className="absolute top-0 left-0 w-full h-1 bg-neon-cyan shadow-[0_0_15px_#00f2ff]" /><DialogHeader className="mb-10 text-center"><DialogTitle className="text-xl uppercase text-white tracking-tighter font-black italic">Edit Profile</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black ml-1">Identity Name</Label><Input value={selectedStudent?.name || ''} onChange={e => setSelectedStudent(selectedStudent ? {...selectedStudent, name: e.target.value} : null)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5" /></div>
            <div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black ml-1">System ID</Label><Input value={selectedStudent?.id || ''} onChange={e => setSelectedStudent(selectedStudent ? {...selectedStudent, id: e.target.value.toUpperCase()} : null)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-neon-cyan font-black tracking-widest px-5" /></div>
            <div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black ml-1">Access Key</Label><Input value={selectedStudent?.password || ''} onChange={e => setSelectedStudent(selectedStudent ? {...selectedStudent, password: e.target.value} : null)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5" /></div>
            <div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black ml-1">System Status</Label><Select value={selectedStudent?.status} onValueChange={(v: any) => setSelectedStudent(selectedStudent ? {...selectedStudent, status: v} : null)}><SelectTrigger className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-black"><SelectValue /></SelectTrigger><SelectContent className="bg-neon-card border-neon-border"><SelectItem value="active" className="text-green-400 font-black uppercase text-[10px]">ACTIVE</SelectItem><SelectItem value="inactive" className="text-gray-400 font-black uppercase text-[10px]">INACTIVE</SelectItem><SelectItem value="suspended" className="text-neon-pink font-black uppercase text-[10px]">SUSPENDED</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter className="mt-12"><Button onClick={handleEditStudent} className="w-full bg-neon-cyan text-black h-16 rounded-[24px] shadow-lg transition-all hover:scale-105 text-[10px] font-black uppercase tracking-[0.2em] italic">COMMIT PROFILE CHANGE</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminUploadDialog} onOpenChange={setShowAdminUploadDialog}>
        <DialogContent className="rounded-[40px] max-w-lg p-10 border border-neon-cyan/30 bg-neon-card shadow-3xl backdrop-blur-2xl overflow-hidden font-inter"><div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan to-neon-purple" /><DialogHeader className="mb-10 text-center"><DialogTitle className="text-xl uppercase text-white tracking-tighter font-black italic">Asset Deployment</DialogTitle></DialogHeader>
          <div className="space-y-8"><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black ml-1">Category</Label><Select value={adminSelectedMaterialType} onValueChange={(v: any) => setAdminSelectedMaterialType(v)}><SelectTrigger className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-black"><SelectValue /></SelectTrigger><SelectContent className="bg-neon-card border-neon-border text-gray-300"><SelectItem value="textbooks" className="font-black uppercase text-[9px]">Textbook</SelectItem><SelectItem value="videos" className="font-black uppercase text-[9px]">Video Asset</SelectItem><SelectItem value="pastQuestions" className="font-black uppercase text-[9px]">Examination</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black ml-1">Allocation</Label><Select value={adminSelectedCourseId} onValueChange={setAdminSelectedCourseId}><SelectTrigger className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-black"><SelectValue placeholder="Target Module" /></SelectTrigger><SelectContent className="bg-neon-card border-neon-border text-gray-300"><SelectItem value="global-course" className="font-black uppercase text-[9px] text-neon-cyan">Global Content</SelectItem>{courses.map(c => <SelectItem key={c.id} value={c.id} className="font-black uppercase text-[9px]">{c.name}</SelectItem>)}</SelectContent></Select></div></div>{adminSelectedCourseId && adminSelectedCourseId !== 'global-course' && (<div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black ml-1">Audience</Label><div className="bg-black/40 rounded-2xl border border-neon-border p-1"><MultiSelect options={students.filter(s => s.courses && s.courses.includes(adminSelectedCourseId)).map(s => ({ label: s.name, value: s.id }))} selected={adminSelectedStudentIds} onChange={setAdminSelectedStudentIds} placeholder="Global Broadcast" /></div></div>)}<div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black ml-1">Asset Identity</Label><Input value={adminNewMaterialTitle} onChange={e => setAdminNewMaterialTitle(e.target.value)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5" placeholder="Label..." /></div><div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black ml-1">Physical Binary</Label><div className="relative"><Input type="file" onChange={e => setAdminNewMaterialFile(e.target.files?.[0] || null)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-gray-400 file:bg-neon-cyan file:text-black file:border-none file:h-full file:px-6 file:mr-4 file:font-black file:uppercase file:text-[9px] cursor-pointer" /></div></div></div>
          <DialogFooter className="mt-12"><Button onClick={handleAdminUpload} className="w-full bg-neon-cyan text-black h-16 rounded-[24px] shadow-lg uppercase tracking-[0.2em] text-[10px] transition-all font-black italic">EXECUTE DEPLOYMENT</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminProfileDialog} onOpenChange={setShowAdminProfileDialog}>
        <DialogContent className="rounded-[40px] max-w-2xl p-12 border border-neon-cyan/20 bg-neon-card/90 backdrop-blur-3xl shadow-3xl font-inter"><div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink" /><DialogHeader className="mb-12 text-center"><DialogTitle className="text-xl uppercase tracking-tighter text-white font-black italic">Settings</DialogTitle></DialogHeader><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">Label</Label><Input value={adminProfileData.name} onChange={e => setAdminProfileData({...adminProfileData, name: e.target.value})} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5" /></div><div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">Master ID</Label><Input value={adminProfileData.id} disabled className="h-12 rounded-2xl border-neon-border bg-black/20 text-gray-600 font-black px-5 cursor-not-allowed opacity-50" /></div><div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">Secret Key</Label><Input value={adminProfileData.password} onChange={e => setAdminProfileData({...adminProfileData, password: e.target.value})} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5 focus:border-neon-pink" placeholder="••••••••" /></div><div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">Endpoint</Label><Input value={adminProfileData.email} onChange={e => setAdminProfileData({...adminProfileData, email: e.target.value})} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white text-xs px-5" /></div><div className="space-y-2 md:col-span-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">Contact</Label><Input value={adminProfileData.contact} onChange={e => setAdminProfileData({...adminProfileData, contact: e.target.value})} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5" /></div></div><div className="mt-12 max-w-xs mx-auto"><Button onClick={handleUpdateAdminProfile} className="w-full bg-neon-cyan text-black h-16 rounded-[24px] shadow-lg uppercase text-[10px] tracking-[0.3em] font-black italic">SAVE CONFIGURATION</Button></div></DialogContent>
      </Dialog>

      <Dialog open={showMarkDialog} onOpenChange={setShowMarkDialog}>
        <DialogContent className="rounded-[40px] max-w-md p-10 border border-neon-cyan/30 bg-neon-card backdrop-blur-2xl shadow-3xl font-inter"><div className="absolute top-0 left-0 w-full h-1 bg-neon-cyan shadow-[0_0_15px_#00f2ff]" /><DialogHeader className="mb-10 text-center"><DialogTitle className="text-xl uppercase text-white tracking-tighter font-black italic">Academic Review</DialogTitle></DialogHeader><div className="space-y-8"><div className="p-8 rounded-[32px] bg-black/40 border border-neon-border shadow-inner text-center"><p className="text-[9px] text-gray-500 uppercase font-black mb-3">Intelligence</p><p className="text-lg text-white uppercase font-black italic leading-none mb-2">{selectedResult?.student_name}</p><p className="text-[10px] text-neon-cyan uppercase font-black">{selectedResult?.assessment_title}</p></div><div className="space-y-3"><Label className="text-[10px] uppercase text-gray-500 ml-2 font-black">Score (%)</Label><Input type="number" value={markingScore} onChange={e => setMarkingScore(Number(e.target.value))} className="h-20 rounded-[32px] border-neon-border bg-black/60 text-4xl text-center text-white font-black italic" /></div><div className="flex items-center justify-between p-8 bg-black/40 rounded-[32px] border border-neon-border mt-8"><div className="space-y-1"><Label className="text-[10px] font-black uppercase flex items-center gap-3 text-white">{markingStatus === 'released' ? <Eye className="w-5 h-5 text-neon-cyan" /> : <Shield className="w-5 h-5 text-gray-500" />}Visibility</Label><p className="text-[9px] text-gray-500 font-black mt-1">{markingStatus === 'released' ? 'Released' : 'Pending'}</p></div><Switch checked={markingStatus === 'released'} onCheckedChange={(checked) => { setMarkingScoreStatus(checked ? 'released' : 'pending'); setMarkingShowScore(checked); }} /></div></div><DialogFooter className="mt-12"><Button onClick={handleUpdateResult} className="w-full bg-neon-cyan text-black h-16 rounded-[24px] shadow-lg uppercase tracking-[0.3em] text-[10px] font-black italic">COMMIT RECORD</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={showAddCourseDialog} onOpenChange={(open) => { setShowAddCourseDialog(open); if (!open) { setSelectedCourseToEdit(null); setNewCourse({ id: '', name: '', code: '', instructor: '', color: 'from-blue-500 to-indigo-500', image: '/course-placeholder.svg' }); } }}>
        <DialogContent className="rounded-[40px] max-w-md p-10 border border-neon-cyan/20 bg-neon-card backdrop-blur-2xl shadow-3xl overflow-hidden"><div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan to-neon-purple shadow-lg" /><DialogHeader className="mb-10 text-center"><DialogTitle className="text-xl uppercase text-white tracking-tighter font-black italic">{selectedCourseToEdit ? 'Modify Module' : 'Initialize Module'}</DialogTitle></DialogHeader><div className="space-y-6"><div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">Name</Label><Input value={newCourse.name} onChange={e => setNewCourse({...newCourse, name: e.target.value.toUpperCase()})} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5" /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">Code</Label><Input value={newCourse.code} onChange={e => setNewCourse({...newCourse, code: e.target.value.toUpperCase()})} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-black px-5" /></div><div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">ID</Label><Input value={newCourse.id} onChange={e => setNewCourse({...newCourse, id: e.target.value.toUpperCase()})} disabled={!!selectedCourseToEdit} className="h-12 rounded-2xl border-neon-border bg-black/20 text-gray-600 font-black px-5" /></div></div><div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase font-black ml-1">Instructor</Label><Input value={newCourse.instructor} onChange={e => setNewCourse({...newCourse, instructor: e.target.value})} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5" /></div></div><DialogFooter className="mt-12"><Button onClick={handleAddCourse} className="w-full bg-neon-cyan text-black h-16 rounded-[24px] shadow-lg uppercase text-[10px] tracking-[0.3em] font-black italic">{selectedCourseToEdit ? 'SYNC MODULE' : 'INITIALIZE MODULE'}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
