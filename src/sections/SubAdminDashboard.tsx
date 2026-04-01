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
  DialogDescription,
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
  Key,
  Filter,
  X
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
  id: string;
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
  const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;
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
  const [isDeploying, setIsDeploying] = useState(false);

  // UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  const [generatedCredentials, setGeneratedCredentials] = useState<{ id: string, password: string } | null>(null);

  // Assessment Form
  const [selectedCourse, setSelectedCourse] = useState('');
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [endDate, setEndDate] = useState('');
  const [assignedStudents, setAssignedStudents] = useState<string[]>([]);

  const [studentToAssign, setStudentToAssign] = useState<string[]>([]);
  const [courseToAssign, setCourseToAssign] = useState<string[]>([]);

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
    let finalId = newStudentId || 'STU' + Math.floor(1000 + Math.random() * 9000);
    const finalPassword = newStudentPassword || 'student123';
    const student = { id: finalId.toUpperCase(), name: newStudentName.toUpperCase(), role: 'student', password: finalPassword, status: 'active', created_by: user.id };
    try {
      const res = await fetch(`${API_URL}/api/students`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(student) });
      if (res.ok) { fetchData(); setShowAddDialog(false); setNewStudentName(''); setNewStudentId(''); setNewStudentPassword(''); setGeneratedCredentials(null); toast.success(`Student ${finalId} Created Successfully`); }
      else { const errorData = await res.json(); toast.error(errorData.error || 'Failed to create student'); }
    } catch (e) { toast.error('Network error occurred'); }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    const res = await fetch(`${API_URL}/api/students/${selectedStudent.id}`, { method: 'DELETE' });
    if (res.ok) { fetchData(); setShowDeleteDialog(false); toast.success('Deleted'); }
  };

  const handleApproveRequest = async (req: any) => {
    const id = (req.role === 'student' ? 'STU' : 'ADM') + Math.floor(1000 + Math.random() * 8999);
    const pass = Math.floor(100000 + Math.random() * 899999).toString();
    const userData = { id, name: req.name, password: pass, role: req.role, status: 'active', email: req.email, contact: req.phone, details: req.details, created_by: user.id };
    try {
      const endpoint = req.role === 'student' ? '/api/students' : '/api/subadmins';
      const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData) });
      if (res.ok) { await fetch(`${API_URL}/api/reg-requests/${req.id}`, { method: 'DELETE' }); fetchData(); toast.success(`Authorized as ${id}`); }
    } catch (e) { toast.error('Authorization failed'); }
  };

  const handleRejectRequest = async (req: any) => {
    try { await fetch(`${API_URL}/api/reg-requests/${req.id}`, { method: 'DELETE' }); fetchData(); toast.error('Unauthorized and Removed'); }
    catch (e) { toast.error('Action failed'); }
  };

  const handleCreateAssessment = async () => {
    if (!selectedCourse) { toast.error('Please select a target course'); return; }
    if (!assessmentTitle.trim()) { toast.error('Please enter an assessment title'); return; }
    if (!endDate) { toast.error('Please set a deadline for the assessment'); return; }
    if (newAssessmentQuestions.length === 0) { toast.error('Please add at least one question to the assessment'); return; }
    setIsDeploying(true);
    const config = { id: `ASMT${Date.now()}`, course_id: selectedCourse, type: 'quiz', title: assessmentTitle, mode: 'objectives', submission_mode: 'online', structured_questions: newAssessmentQuestions, duration, start_date: new Date().toISOString(), end_date: new Date(endDate).toISOString(), assigned_student_ids: assignedStudents };
    try {
      const res = await fetch(`${API_URL}/api/assessments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
      if (res.ok) { fetchData(); toast.success(`Assessment "${assessmentTitle}" published`); setNewAssessmentQuestions([]); setAssessmentTitle(''); setSelectedCourse(''); setEndDate(''); setAssignedStudents([]); }
      else { const errorData = await res.json(); toast.error(errorData.message || 'Failed to publish assessment'); }
    } catch (e) { toast.error('Network error'); } finally { setIsDeploying(false); }
  };

  const handleAssignCourse = async () => {
    if (studentToAssign.length === 0 || courseToAssign.length === 0) { toast.error('Selection missing'); return; }
    let successCount = 0;
    for (const sId of studentToAssign) {
      for (const cId of courseToAssign) {
        const res = await fetch(`${API_URL}/api/enrollments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: sId, course_id: cId }) });
        if (res.ok) successCount++;
      }
    }
    fetchData();
    toast.success(`Authorized for ${successCount} assignments`);
    setStudentToAssign([]);
    setCourseToAssign([]);
  };

  // Material Upload
  const [adminNewMaterialTitle, setAdminNewMaterialTitle] = useState('');
  const [adminNewMaterialFile, setAdminNewMaterialFile] = useState<File | null>(null);
  const [adminNewMaterialLink, setAdminNewMaterialLink] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'file' | 'link'>('file');
  const [adminSelectedCourseId, setAdminSelectedCourseId] = useState('');
  const [adminSelectedMaterialType, setAdminSelectedMaterialType] = useState<'textbooks' | 'videos' | 'pastQuestions'>('textbooks');
  const [adminSelectedStudentIds, setAdminSelectedStudentIds] = useState<string[]>([]);

  const handleAdminUpload = async () => {
    if (!adminNewMaterialTitle || !adminSelectedCourseId) { toast.error('Required fields missing'); return; }
    const process = async (fileUrl?: string) => {
      const mat = { id: `MAT${Date.now()}`, course_id: adminSelectedCourseId, type: adminSelectedMaterialType, title: adminNewMaterialTitle, url: fileUrl || adminNewMaterialLink, uploaded_by: user.name, approved: true, date: new Date().toISOString().split('T')[0], assigned_student_ids: adminSelectedStudentIds };
      try {
        const res = await fetch(`${API_URL}/api/materials`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mat) });
        if (res.ok) { fetchData(); setShowAdminUploadDialog(false); toast.success('Asset Deployed'); setAdminNewMaterialTitle(''); setAdminNewMaterialLink(''); setAdminSelectedCourseId(''); setAdminSelectedStudentIds([]); setAdminNewMaterialFile(null); setUploadMethod('file'); }
      } catch (e) { toast.error('Network Error'); }
    };
    if (uploadMethod === 'file' && adminNewMaterialFile) {
      const formData = new FormData(); formData.append('file', adminNewMaterialFile);
      try { const uploadRes = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: formData }); if (!uploadRes.ok) throw new Error(); const uploadData = await uploadRes.json(); process(uploadData.url); }
      catch (err) { toast.error('File upload failed'); }
    } else process();
  };

  const handleView = (item: UploadedMaterial) => {
    if (item.url) {
      if (item.type === 'videos' && item.url.startsWith('data:video')) {
        const win = window.open('', '_blank');
        if (win) { win.document.write(`<html><body style="margin:0;background:#000;display:flex;justify-content:center;align-items:center;height:100vh;"><video controls autoplay src="${item.url}" style="max-width:100%;max-height:100%;"></video></body></html>`); win.document.close(); }
      } else if (item.url.startsWith('data:application/pdf')) {
        const win = window.open(); if (win) win.document.write(`<iframe src="${item.url}" frameborder="0" style="border:0;top:0;left:0;bottom:0;right:0;width:100%;height:100%;" allowfullscreen></iframe>`);
      } else window.open(item.url, '_blank');
    } else toast.info('No content available.');
  };

  const handleDownload = (item: UploadedMaterial) => {
    if (!item.url) { toast.error('No file found.'); return; }
    if (item.type === 'videos') { window.open(item.url, '_blank'); return; }
    const link = document.createElement('a'); link.href = item.url; link.download = item.title; document.body.appendChild(link); link.click(); document.body.removeChild(link); toast.success('Download started.');
  };

  const getStatusBadge = (s: string) => {
    const colors: any = { active: 'bg-green-500/20 text-green-400 border-green-500/50', inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/50', suspended: 'bg-red-500/20 text-red-400 border-red-500/50' };
    return <Badge className={cn(colors[s] || 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50', "font-semibold border")}>{s.toUpperCase()}</Badge>;
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-neon-bg text-neon-cyan animate-pulse uppercase tracking-widest text-lg font-black shadow-[0_0_30px_rgba(0,242,255,0.2)]">Sub-Admin Syncing...</div>;

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
              { icon: GraduationCap, label: 'Registration', value: 'reg-requests', badge: regRequests.filter(r => r.role === 'student').length },
              { icon: FolderLock, label: 'SCM', value: 'scm-management' },
              { icon: Clock, label: 'Assessment', value: 'timer' },
              { icon: CheckCircle, label: 'Results', value: 'results' },
              { icon: ActivityIcon, label: 'Activity', value: 'activity' },
              { icon: Key, label: 'Generator', value: 'generator' }
            ]
              .filter(item => { if (user.status === 'suspended') return item.value === 'students'; return true; })
              .map(item => (
                <button
                  key={item.value}
                  onClick={() => { setActiveTab(item.value); if (isMobile) setMobileMenuOpen(false); }}
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
            <h1 className="text-sm font-black text-white uppercase tracking-[0.2em] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{activeTab === 'timer' ? 'Assessment' : activeTab.replace('-', ' ')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={onSwitchToStudent} className="bg-transparent border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black rounded-xl text-[10px] font-black tracking-widest px-6 transition-all shadow-[0_0_15px_rgba(0,242,255,0.1)]">STUDENT VIEW</Button>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[9px] text-neon-cyan font-black uppercase tracking-widest leading-none">Sub-Admin</p>
                <p className="text-sm font-bold text-white">{user.name}</p>
              </div>
              <Avatar className="cursor-pointer border-2 border-neon-cyan shadow-[0_0_15px_rgba(0,242,255,0.2)] hover:scale-105 transition-transform">
                <AvatarFallback className="bg-neon-card text-neon-cyan uppercase text-xs font-black">{user.name[0]}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
          {activeTab === 'students' && (
            <div className="space-y-8">
              <Card className="rounded-[32px] p-8 border border-neon-border bg-neon-card shadow-2xl">
                <CardTitle className="text-lg uppercase tracking-tight text-white mb-8 font-black italic">Authorize Module Access</CardTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-gray-500 uppercase tracking-widest font-black ml-1">Identify Profiles</Label>
                    <MultiSelect options={students.map(s => ({ label: `${s.name} (${s.id})`, value: s.id }))} selected={studentToAssign} onChange={setStudentToAssign} placeholder="Select Identities" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-gray-500 uppercase tracking-widest font-black ml-1">Select Modules</Label>
                    <MultiSelect options={courses.map(c => ({ label: c.name, value: c.id }))} selected={courseToAssign} onChange={setCourseToAssign} placeholder="Select Subjects" />
                  </div>
                  <Button onClick={handleAssignCourse} className="h-14 bg-neon-cyan text-black rounded-2xl shadow-[0_0_20px_rgba(0,242,255,0.3)] text-[10px] font-black uppercase tracking-widest italic transition-all hover:scale-[1.02]">AUTHORIZE ENROLLMENT</Button>
                </div>
              </Card>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="relative flex-1 max-w-md w-full">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neon-cyan/50" />
                  <Input placeholder="Search records..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-14 rounded-2xl h-14 bg-neon-card border-neon-border text-white font-bold focus-visible:ring-neon-cyan/50 shadow-inner" />
                </div>
                <Button onClick={() => setShowAddDialog(true)} disabled={user.status === 'suspended'} className="bg-neon-cyan text-black rounded-2xl h-14 px-10 shadow-[0_0_20px_rgba(0,242,255,0.2)] text-[10px] font-black tracking-widest uppercase italic hover:scale-105 disabled:opacity-30">ADD STUDENT</Button>
              </div>

              <Card className="rounded-[40px] overflow-hidden border border-neon-border bg-neon-card/50 backdrop-blur-md shadow-2xl">
                <Table>
                  <TableHeader className="bg-black/40">
                    <TableRow className="border-neon-border/50">
                      <TableHead className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-neon-cyan">Identity Profile</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-neon-cyan text-center">Status</TableHead>
                      <TableHead className="text-right px-10 text-[10px] font-black uppercase tracking-widest text-neon-cyan">Control</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map(s => (
                      <TableRow key={s.id} className="hover:bg-neon-cyan/5 cursor-pointer border-neon-border/30 transition-colors group" onClick={() => { setSelectedStudent(s); setActiveTab('student-workspace'); }}>
                        <TableCell className="px-10 py-8">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center text-neon-cyan font-black text-lg shadow-inner">
                              {s.id.slice(-2)}
                            </div>
                            <div>
                              <p className="text-base font-black text-white tracking-tight">{s.name}</p>
                              <p className="text-[11px] text-neon-cyan/60 font-black tracking-widest group-hover:text-neon-cyan transition-colors">{s.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(s.status)}</TableCell>
                        <TableCell className="text-right px-10">
                          {user.status === 'suspended' ? <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">SECURE_VIEW</span> : (
                            <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setSelectedStudent(s); setShowDeleteDialog(true); }} className="text-neon-pink/50 hover:text-neon-pink hover:bg-neon-pink/10 rounded-2xl h-12 w-12"><Trash2 className="w-5 h-5" /></Button>
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
            <div className="space-y-8 animate-fade-in">
              <button onClick={() => setActiveTab('students')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neon-cyan hover:opacity-70 transition-all"><ChevronLeft className="w-4 h-4" /> BACK TO RECORDS</button>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="rounded-[32px] p-8 border border-neon-border bg-neon-cyan/5 text-white relative overflow-hidden h-full shadow-[inset_0_0_30px_rgba(0,242,255,0.05)]">
                  <div className="absolute -right-10 -bottom-10 w-48 h-48 opacity-5 rotate-12 bg-neon-cyan rounded-full blur-3xl" />
                  <div className="relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-neon-cyan text-black flex items-center justify-center text-xl font-black shadow-[0_0_20px_rgba(0,242,255,0.4)] uppercase mb-6">{selectedStudent.name[0]}</div>
                    <h2 className="text-2xl italic font-black tracking-tighter mb-1 uppercase leading-none">{selectedStudent.name}</h2>
                    <p className="text-neon-cyan/60 text-[10px] uppercase tracking-[0.2em] mb-8 font-black">{selectedStudent.id}</p>
                    <div className="space-y-6">
                      <div className="space-y-1"><p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">ACCESS KEY</p><p className="text-xl font-black tracking-tight text-white">{selectedStudent.password}</p></div>
                      <div className="space-y-1"><p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">CONTACT INFO</p><p className="text-[10px] font-bold text-gray-300">{selectedStudent.email || 'N/A'}</p><p className="text-[10px] font-bold text-gray-300">{selectedStudent.contact || 'N/A'}</p></div>
                      {selectedStudent.details && (
                        <div className="pt-4 border-t border-neon-border/50 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">LEVEL</p><p className="text-[10px] font-bold uppercase text-gray-300">{selectedStudent.details.educationLevel || 'N/A'}</p></div>
                            <div className="space-y-1"><p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">CLASS</p><p className="text-[10px] font-bold uppercase text-gray-300">{selectedStudent.details.studentClass || 'N/A'}</p></div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">MODULES</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Array.isArray(selectedStudent.details.coursesToPrepare) ? selectedStudent.details.coursesToPrepare.map((c: string) => (
                                <span key={c} className="text-[7px] bg-neon-cyan/10 text-neon-cyan px-2 py-0.5 rounded-full font-black uppercase border border-neon-cyan/20">{c}</span>
                              )) : <span className="text-[10px] font-bold text-gray-600 uppercase">NONE</span>}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="space-y-1 pt-4 border-t border-neon-border/50"><p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">STATUS</p><div>{getStatusBadge(selectedStudent.status)}</div></div>
                    </div>
                  </div>
                </Card>

                <Card className="lg:col-span-2 rounded-[32px] p-8 border border-neon-border bg-neon-card/30 backdrop-blur-md shadow-2xl relative h-full">
                  <div className="flex justify-between items-center mb-8 pb-6 border-b border-neon-border/50">
                    <div><h3 className="text-xl italic font-black uppercase tracking-tight text-white">Performance Analytics</h3><p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] mt-1 font-black">Live Assessment Intelligence</p></div>
                    <div className="flex gap-6">
                      <div className="text-right"><p className="text-2xl font-black text-neon-cyan tracking-tighter drop-shadow-[0_0_8px_rgba(0,242,255,0.4)]">{results.filter(r => r.student_id === selectedStudent.id).length}</p><p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">SESSIONS</p></div>
                      <div className="text-right pl-6 border-l border-neon-border/50"><p className="text-2xl font-black text-neon-pink tracking-tighter drop-shadow-[0_0_8px_rgba(255,0,229,0.4)]">{Math.round(results.filter(r => r.student_id === selectedStudent.id).reduce((acc, curr) => acc + curr.score, 0) / (results.filter(r => r.student_id === selectedStudent.id).length || 1))}%</p><p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">AVG</p></div>
                    </div>
                  </div>
                  <ScrollArea className="h-[350px] pr-4">
                    <Table>
                      <TableHeader className="bg-black/40"><TableRow className="border-none"><TableHead className="py-4 text-[9px] font-black uppercase tracking-widest text-neon-cyan">Assessment</TableHead><TableHead className="text-[9px] font-black uppercase tracking-widest text-neon-cyan text-center">Score</TableHead><TableHead className="text-[9px] font-black uppercase tracking-widest text-neon-cyan text-right">State</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {results.filter(r => r.student_id === selectedStudent.id).length > 0 ? (
                          results.filter(r => r.student_id === selectedStudent.id).map(r => (
                            <TableRow key={r.id} className="border-b border-neon-border/20 hover:bg-neon-cyan/5 transition-colors">
                              <TableCell className="py-6"><p className="text-white uppercase text-xs font-black tracking-tight">{r.assessment_title}</p><p className="text-[9px] text-neon-cyan/60 font-black tracking-widest mt-1">{r.course_name}</p></TableCell>
                              <TableCell className="text-center"><span className={cn("text-xl font-black tracking-tighter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]", r.score >= 50 ? 'text-neon-cyan' : 'text-neon-pink')}>{r.score}%</span></TableCell>
                              <TableCell className="text-right"><Badge className={cn("text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-xl shadow-lg border", r.status === 'released' ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30' : 'bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30')}>{r.status}</Badge></TableCell>
                            </TableRow>
                          ))
                        ) : <TableRow><TableCell colSpan={3} className="text-center py-24 text-gray-700 text-[10px] font-black uppercase tracking-[0.3em] italic">No Records Identified</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              </div>

              <Card className="rounded-[40px] p-8 border border-neon-border bg-neon-card relative overflow-hidden shadow-2xl">
                <div className="absolute -right-20 -bottom-20 w-80 h-80 opacity-5 rotate-12 bg-neon-purple rounded-full blur-3xl" />
                <div className="relative z-10">
                  <h3 className="text-xl font-black uppercase tracking-tight italic text-white mb-8 border-l-8 border-neon-cyan pl-6">Enrollment Map</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courses.filter(c => selectedStudent.courses?.includes(c.id)).map(c => (
                      <div key={c.id} className={cn("p-6 rounded-[24px] transition-all flex justify-between items-center group w-full text-white shadow-xl border border-white/10 hover:border-white/30", c.color)}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-lg font-black italic shadow-inner border border-white/10">{c.code[0]}</div>
                          <p className="uppercase tracking-widest text-sm font-black italic">{c.name}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => fetch(`${API_URL}/api/enrollments/${selectedStudent.id}/${c.id}`, { method: 'DELETE' }).then(() => fetchData())} className="text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-all hover:scale-110"><Trash2 className="w-5 h-5" /></Button>
                      </div>
                    ))}
                    {courses.filter(c => selectedStudent.courses?.includes(c.id)).length === 0 && <div className="lg:col-span-3 h-32 rounded-[32px] border-2 border-dashed border-neon-border/50 flex items-center justify-center text-gray-700 uppercase text-[10px] font-black tracking-widest italic bg-black/20">Vault Empty</div>}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'reg-requests' && (
            <Card className="rounded-[32px] border border-neon-border shadow-2xl p-10 bg-neon-card/50 backdrop-blur-md overflow-hidden">
              <CardTitle className="text-xl uppercase tracking-tighter text-white font-black italic mb-10">Registration Queue</CardTitle>
              <Table>
                <TableHeader className="bg-black/40 border-b border-neon-border/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-8 py-6 text-neon-cyan uppercase text-[10px] font-black tracking-widest">Candidate</TableHead>
                    <TableHead className="text-neon-cyan uppercase text-[10px] text-center font-black tracking-widest">Academic Path</TableHead>
                    <TableHead className="text-right px-8 text-neon-cyan uppercase text-[10px] font-black tracking-widest">Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regRequests.filter(r => r.role === 'student').map(r => (
                    <TableRow key={r.id} className="border-b border-neon-border/20 hover:bg-neon-cyan/5 transition-colors">
                      <TableCell className="px-8 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan text-lg font-black">{r.name[0]}</div>
                          <div><p className="text-lg text-white font-black leading-none mb-1">{r.name}</p><p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{r.email}</p><p className="text-[10px] text-neon-cyan font-black tracking-widest uppercase">{r.phone}</p></div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-block text-left">
                          <p className="text-[10px] text-gray-300 font-black uppercase tracking-tight">{r.details?.educationLevel} • {r.details?.studentClass}</p>
                          <div className="flex gap-1 mt-1">{r.details?.coursesToPrepare?.map((c: string) => <span key={c} className="text-[7px] bg-neon-cyan/10 text-neon-cyan/70 border border-neon-cyan/20 px-2 py-0.5 rounded-full font-black uppercase">{c}</span>)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-8">
                        <div className="flex justify-end gap-3">
                          <Button onClick={() => handleApproveRequest(r)} className="bg-neon-cyan text-black px-8 rounded-2xl h-12 shadow-[0_0_20px_rgba(0,242,255,0.3)] text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 italic">AUTHORIZE</Button>
                          <Button variant="ghost" onClick={() => handleRejectRequest(r)} className="text-gray-500 hover:text-neon-pink h-12 px-6 text-[10px] font-black tracking-widest uppercase rounded-2xl">REJECT</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {regRequests.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-24 text-gray-700 italic font-black uppercase tracking-widest">Vault Empty</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Card>
          )}

          {activeTab === 'timer' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <Card className="lg:col-span-1 rounded-[32px] p-8 border border-neon-border bg-neon-card h-full shadow-2xl">
                  <CardHeader className="p-0 mb-8"><CardTitle className="text-lg uppercase font-black italic text-white tracking-tighter">Assessment Config</CardTitle><CardDescription className="text-[10px] uppercase text-gray-500 font-black tracking-widest">Define module parameters</CardDescription></CardHeader>
                  <div className="space-y-6">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Course Target</Label><Select value={selectedCourse} onValueChange={setSelectedCourse}><SelectTrigger className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold"><SelectValue placeholder="Select Module" /></SelectTrigger><SelectContent className="bg-neon-card border-neon-border">{courses.map(c => <SelectItem key={c.id} value={c.id} className="font-bold text-gray-300 hover:text-neon-cyan">{c.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Assessment Title</Label><Input value={assessmentTitle} onChange={e => setAssessmentTitle(e.target.value)} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold" /></div>
                    <div className="grid grid-cols-1 gap-6"><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Deadline</Label><Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold" /></div><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Duration (Min)</Label><Input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="h-12 rounded-2xl border-neon-border bg-black/40 text-white font-bold" /></div></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Assign To</Label><MultiSelect options={studentOptions} selected={assignedStudents} onChange={setAssignedStudents} placeholder="Select identities..." /></div>
                    <Button onClick={handleCreateAssessment} disabled={isDeploying} className="w-full bg-neon-cyan text-black h-14 rounded-2xl shadow-[0_0_20px_rgba(0,242,255,0.3)] uppercase transition-all text-[10px] font-black tracking-widest italic mt-4 hover:scale-[1.02]">{isDeploying ? 'DEPLOYING...' : 'DEPLOY ASSESSMENT'}</Button>
                  </div>
                </Card>

                <Card className="lg:col-span-2 rounded-[32px] p-8 border border-neon-border bg-neon-card/50 backdrop-blur-md shadow-2xl h-full min-h-[600px]">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-neon-border/50">
                    <div><CardTitle className="text-lg uppercase font-black italic text-white tracking-tighter">Questions Builder</CardTitle><CardDescription className="text-[10px] uppercase text-gray-500 font-black tracking-widest">{newAssessmentQuestions.length} units</CardDescription></div>
                    <div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-neon-border/50">
                      <Label className="text-[8px] uppercase text-gray-500 font-black tracking-widest ml-2">Engine Mode:</Label>
                      <Select value={globalAssessmentMode} onValueChange={handleGlobalModeChange}><SelectTrigger className="h-9 w-40 rounded-xl border-neon-cyan/30 bg-transparent text-[9px] font-black uppercase tracking-widest text-neon-cyan"><SelectValue /></SelectTrigger><SelectContent className="bg-neon-card border-neon-border"><SelectItem value="objective" className="font-black text-[9px] uppercase tracking-widest text-gray-300">Objective</SelectItem><SelectItem value="written" className="font-black text-[9px] uppercase tracking-widest text-gray-300">Written</SelectItem><SelectItem value="integrated" className="font-black text-[9px] uppercase tracking-widest text-gray-300">Integrated</SelectItem></SelectContent></Select>
                    </div>
                  </div>
                  <ScrollArea className="h-[700px] pr-4">
                    <div className="space-y-8">
                      {newAssessmentQuestions.map((q, idx) => (
                        <div key={q.id} className="p-6 rounded-[32px] border border-neon-border bg-black/20 space-y-6 relative group transition-all hover:border-neon-cyan/30">
                          <Button variant="ghost" size="icon" onClick={() => removeQuestion(idx)} className="absolute top-4 right-4 h-10 w-10 rounded-full bg-neon-pink/10 text-neon-pink opacity-0 group-hover:opacity-100 transition-all border border-neon-pink/30"><Trash2 className="w-5 h-5" /></Button>
                          <div className="flex justify-between items-center"><span className="text-[10px] font-black text-neon-cyan uppercase tracking-widest bg-neon-cyan/5 px-4 py-2 rounded-full border border-neon-cyan/20">Unit {idx + 1}</span><Badge className="text-[8px] font-black uppercase tracking-widest bg-black/60 border border-neon-border text-gray-400">Mode: {q.type}</Badge></div>
                          {q.type === 'integrated' && (
                            <div className="flex bg-black/60 p-1 rounded-2xl w-fit border border-neon-border/50">
                              <button onClick={() => updateQuestion(idx, 'activeTab', 'objective')} className={cn("px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", q.activeTab !== 'written' ? "bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]" : "text-gray-600")}>MCQ UNIT</button>
                              <button onClick={() => updateQuestion(idx, 'activeTab', 'written')} className={cn("px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", q.activeTab === 'written' ? "bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]" : "text-gray-600")}>ESSAY UNIT</button>
                            </div>
                          )}
                          {((q.type === 'written') || (q.type === 'integrated' && q.activeTab === 'written')) && (
                            <div className="space-y-3"><Label className="text-[9px] uppercase text-gray-500 font-black tracking-widest ml-1">Question Prompt</Label><Textarea value={q.text} onChange={e => updateQuestion(idx, 'text', e.target.value)} className="min-h-[120px] rounded-2xl border-neon-border bg-black/40 font-bold text-sm text-gray-200 resize-none p-5" placeholder="Define the academic enquiry..." /></div>
                          )}
                          {(q.type === 'written' || (q.type === 'integrated' && q.activeTab === 'written')) && (
                            <div className="space-y-3"><Label className="text-[9px] uppercase text-neon-cyan/70 font-black tracking-widest ml-1">Reference Solution</Label><Textarea value={q.modelAnswer || ''} onChange={e => updateQuestion(idx, 'modelAnswer', e.target.value)} className="min-h-[100px] rounded-2xl border-neon-cyan/20 bg-neon-cyan/5 font-bold text-xs text-neon-cyan/80 resize-none p-5" placeholder="Specify evaluation criteria..." /></div>
                          )}
                          {(q.type === 'objective' || (q.type === 'integrated' && q.activeTab !== 'written')) && (
                            <div className="space-y-6">
                              <div className="space-y-3"><Label className="text-[9px] uppercase text-gray-500 font-black tracking-widest ml-1">MCQ Prompt</Label><Textarea value={q.objectiveText || ''} onChange={e => updateQuestion(idx, 'objectiveText', e.target.value)} className="min-h-[120px] rounded-2xl border-neon-border bg-black/40 font-bold text-sm text-gray-200 resize-none p-5" placeholder="Formulate the enquiry..." /></div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {q.options.map((opt: string, optIdx: number) => (
                                  <div key={optIdx} className="space-y-3">
                                    <div className="flex items-center justify-between px-2"><Label className="text-[9px] uppercase text-gray-500 font-black tracking-widest">Option {String.fromCharCode(65 + optIdx)}</Label><div className="flex items-center gap-2 group/radio cursor-pointer" onClick={() => updateQuestion(idx, 'correctAnswer', optIdx)}><Label className="text-[8px] uppercase text-gray-500 font-black tracking-widest cursor-pointer group-hover/radio:text-neon-cyan transition-colors">Key?</Label><div className={cn("w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center", q.correctAnswer === optIdx ? "border-neon-cyan bg-neon-cyan shadow-[0_0_10px_#00f2ff]" : "border-neon-border bg-black/40")}>{q.correctAnswer === optIdx && <div className="w-1.5 h-1.5 bg-black rounded-full" />}</div></div></div>
                                    <Textarea value={opt} onChange={e => { const newOpts = [...q.options]; newOpts[optIdx] = e.target.value; updateQuestion(idx, 'options', newOpts); }} className={cn("min-h-[70px] rounded-2xl border-2 text-xs px-5 py-4 resize-none transition-all font-bold", q.correctAnswer === optIdx ? "border-neon-cyan/50 bg-neon-cyan/5 text-neon-cyan" : "border-neon-border bg-black/20 text-gray-400")} placeholder={`Option ${String.fromCharCode(65 + optIdx)}...`} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="pt-6 flex justify-center"><Button variant="outline" onClick={addQuestion} className="rounded-3xl border-2 border-dashed border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all font-black uppercase tracking-[0.2em] px-16 h-16"><Plus className="w-5 h-5 mr-3 stroke-[3px]" /> ADD NEW UNIT</Button></div>
                      {newAssessmentQuestions.length === 0 && <div className="h-[500px] border border-dashed border-neon-border/50 rounded-[40px] flex flex-col items-center justify-center text-gray-700 gap-6 bg-black/20"><p className="text-[10px] uppercase font-black tracking-[0.4em] italic opacity-20">Engine Offline</p><Button onClick={addQuestion} className="bg-neon-cyan text-black rounded-2xl px-12 h-14 font-black tracking-widest shadow-[0_0_20px_rgba(0,242,255,0.2)]">INITIALIZE BUILDER</Button></div>}
                    </div>
                  </ScrollArea>
                </Card>
              </div>

              <Card className="rounded-[40px] p-10 border border-neon-border bg-neon-card/80 text-white overflow-hidden relative shadow-3xl">
                <div className="absolute -right-20 -bottom-20 w-80 h-80 opacity-10 rotate-12 bg-neon-cyan rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div><h3 className="text-2xl font-black italic uppercase tracking-tighter">Active Assessments</h3><p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-black mt-2">Live Console</p></div>
                    <Badge className="bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest">{assessments.length} DEPLOYED</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {assessments.map(a => (
                      <div key={a.id} className="p-8 rounded-[32px] bg-black/40 backdrop-blur-md border border-neon-border/50 flex justify-between items-center group shadow-2xl transition-all hover:bg-neon-cyan/[0.03] hover:border-neon-cyan/30">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3"><Badge className="bg-neon-purple/20 text-neon-purple border border-neon-purple/40 text-[9px] uppercase font-black px-3 py-1">{a.type}</Badge><p className="text-[9px] text-neon-cyan/70 font-black uppercase tracking-[0.2em]">{courses.find(c => c.id === a.course_id)?.name}</p></div>
                          <p className="text-lg font-black tracking-tight text-white line-clamp-1 mb-2 italic uppercase">{a.title}</p>
                          <div className="flex items-center gap-6"><div className="flex items-center gap-2 text-gray-500 text-[9px] font-black uppercase tracking-widest"><Clock className="w-3.5 h-3.5 text-neon-cyan/50" /> {a.duration}M</div><div className="flex items-center gap-2 text-gray-500 text-[9px] font-black uppercase tracking-widest"><Users className="w-3.5 h-3.5 text-neon-cyan/50" /> {a.assigned_student_ids?.length || 0}</div></div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => fetch(`${API_URL}/api/assessments/${a.id}`, { method: 'DELETE' }).then(() => fetchData())} className="text-gray-700 hover:text-neon-pink hover:bg-neon-pink/10 transition-all ml-4 h-14 w-14 rounded-2xl border border-transparent hover:border-neon-pink/30"><Trash2 className="w-6 h-6" /></Button>
                      </div>
                    ))}
                    {assessments.length === 0 && <div className="lg:col-span-3 h-48 border-2 border-dashed border-neon-border/30 rounded-[40px] flex items-center justify-center text-gray-800 uppercase text-[10px] font-black tracking-[0.5em] italic bg-black/20">Vault Empty</div>}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'scm-management' && (
            <Card className="rounded-[32px] p-10 border border-neon-border bg-neon-card/50 backdrop-blur-md shadow-2xl">
              <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
                <div><CardTitle className="text-2xl uppercase tracking-tighter text-white font-black italic">SCM Repository</CardTitle><p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-black mt-2">Authorized Asset Management</p></div>
                <Button onClick={() => setShowAdminUploadDialog(true)} className="bg-neon-cyan text-black rounded-2xl h-14 px-10 shadow-[0_0_20px_rgba(0,242,255,0.3)] hover:scale-105 transition-all text-[10px] font-black tracking-widest uppercase italic"><Upload className="w-5 h-5 mr-3" /> DEPLOY ASSET</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {uploadedMaterials.filter(m => m.uploaded_by === user.name || m.uploaded_by === user.id).map(m => (
                  <Card key={m.id} className="rounded-[32px] border border-neon-border/50 shadow-xl p-8 group relative overflow-hidden bg-black/40 backdrop-blur-sm hover:border-neon-cyan/30 transition-all">
                    <div className="flex justify-between items-start mb-6"><div className="w-14 h-14 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,242,255,0.1)]"><Files className="w-7 h-7" /></div><Button variant="ghost" size="icon" onClick={() => fetch(`${API_URL}/api/materials/${m.id}`, { method: 'DELETE' }).then(() => fetchData())} className="text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:text-neon-pink h-9 w-9"><Trash2 className="w-4 h-4" /></Button></div>
                    <h4 className="text-white text-base mb-1 line-clamp-1 font-black uppercase italic tracking-tight">{m.title}</h4><p className="text-[9px] text-gray-500 uppercase mb-6 tracking-[0.2em] font-black">{m.type}</p>
                    <div className="flex gap-4"><Button variant="outline" className="flex-1 rounded-2xl h-12 text-[10px] font-black tracking-widest border-neon-border bg-black/40 text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/50 transition-all uppercase italic" onClick={() => handleView(m)}><Eye className="w-4 h-4 mr-2" /> REVIEW</Button><Button variant="outline" size="icon" className="rounded-2xl h-12 w-12 border-neon-border bg-black/40 text-gray-400 hover:text-neon-cyan shadow-lg" onClick={() => handleDownload(m)}><Download className="w-4 h-4" /></Button></div>
                  </Card>
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
                        <div className="space-y-2"><p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">System Identity</p><p className="text-3xl text-white tracking-tighter font-black">{generatedCredentials.id}</p></div>
                        <div className="h-px bg-neon-border/50 w-24 mx-auto" />
                        <div className="space-y-2"><p className="text-[9px] text-gray-400 uppercase tracking-widest font-black">Secret Access Key</p><p className="text-3xl text-neon-pink tracking-tighter font-black drop-shadow-[0_0_12px_rgba(255,0,229,0.4)]">{generatedCredentials.password}</p></div>
                      </div>
                    </div>
                  ) : <div className="py-12 flex flex-col items-center gap-4 opacity-20"><div className="w-2 h-2 bg-neon-cyan rounded-full animate-ping" /><p className="text-gray-400 uppercase tracking-[0.5em] italic text-[10px] font-black">Engine Standby...</p></div>}
                </div>
                <Button onClick={() => { const id = 'STU' + Math.floor(1000 + Math.random() * 9000); const pass = Math.floor(100000 + Math.random() * 900000).toString(); setGeneratedCredentials({ id, password: pass }); setNewStudentId(id); setNewStudentPassword(pass); toast.success('Tokens Generated'); }} className="w-full bg-neon-cyan text-black h-20 rounded-[28px] shadow-[0_0_30px_rgba(0,242,255,0.3)] text-xs uppercase tracking-[0.3em] transition-all font-black italic hover:scale-[1.02] active:scale-[0.98]">EXECUTE ENGINE</Button>
              </Card>
            </div>
          )}

          {activeTab === 'results' && (
            <Card className="rounded-[32px] border border-neon-border shadow-2xl p-10 bg-neon-card/50 backdrop-blur-md overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div><h2 className="text-2xl uppercase tracking-tighter text-white font-black italic">Academic Intelligence</h2><p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-black mt-2">Historical Records Console</p></div>
                <Button onClick={() => toast.info('Advanced filtering coming soon')} variant="outline" className="rounded-2xl border-neon-border bg-black/40 text-gray-400 hover:text-neon-cyan hover:border-neon-cyan transition-all uppercase text-[10px] font-black h-12 px-8 tracking-widest italic shadow-lg"><Filter className="w-4 h-4 mr-3 text-neon-cyan/50" /> FILTER ENGINE</Button>
              </div>
              <Table>
                <TableHeader className="bg-black/40 border-b border-neon-border/50"><TableRow className="hover:bg-transparent"><TableHead className="px-8 py-6 text-neon-cyan uppercase text-[10px] font-black tracking-widest">Student Identity</TableHead><TableHead className="text-neon-cyan uppercase text-[10px] text-center font-black tracking-widest">Assessment</TableHead><TableHead className="text-neon-cyan uppercase text-[10px] text-center font-black tracking-widest">Outcome</TableHead><TableHead className="text-right px-8 text-neon-cyan uppercase text-[10px] font-black tracking-widest">Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {results.filter(r => myStudents.some(s => s.id === r.student_id)).map(r => (
                    <TableRow key={r.id} className="border-b border-neon-border/20 hover:bg-neon-cyan/5 transition-colors">
                      <TableCell className="px-8 py-8"><div className="flex items-center gap-5"><Avatar className="w-12 h-12 border border-neon-cyan/30 shadow-lg ring-2 ring-black"><AvatarFallback className="bg-neon-card text-neon-cyan uppercase text-xs font-black italic">{r.student_name?.[0] || 'S'}</AvatarFallback></Avatar><div><p className="text-white text-base tracking-tight font-black italic uppercase leading-tight">{r.student_name}</p><p className="text-[10px] text-gray-500 tracking-[0.2em] font-black uppercase mt-1">{r.student_id}</p></div></div></TableCell>
                      <TableCell className="text-center text-gray-300 uppercase text-[10px] tracking-widest font-black italic">{r.assessment_title}</TableCell>
                      <TableCell className="text-center"><span className={cn("text-2xl font-black tracking-tighter italic", r.score >= 50 ? 'text-neon-cyan' : 'text-neon-pink')}>{r.score}%</span></TableCell>
                      <TableCell className="text-right px-8"><Badge className={cn("px-5 py-2 rounded-full text-[9px] uppercase tracking-widest font-black border italic", r.status === 'released' ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30 shadow-[0_0_10px_rgba(0,242,255,0.1)]' : 'bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30 shadow-[0_0_10px_rgba(255,242,0,0.1)]')}>{r.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {activeTab === 'activity' && (
            <Card className="rounded-[32px] border border-neon-border shadow-2xl p-10 bg-neon-card/50 backdrop-blur-md">
              <CardTitle className="text-xl uppercase tracking-tighter mb-10 text-center text-white font-black italic">Sub-Audit Intelligence</CardTitle>
              <div className="space-y-4 max-w-4xl mx-auto">
                {activityLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-6 p-5 rounded-[24px] border border-neon-border bg-black/40 hover:border-neon-cyan/30 transition-all shadow-xl group">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.2)] bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20"><ActivityIcon className="w-7 h-7" /></div>
                    <div className="flex-1">
                      <p className="font-black text-white uppercase italic tracking-tight mb-1">{log.action}</p>
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest line-clamp-1">{log.details}</p>
                      <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-2">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {activityLogs.length === 0 && <div className="text-center py-20 text-gray-700 italic font-black uppercase tracking-widest">No local activity recorded</div>}
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* DIALOGS SECTION */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-[40px] max-w-md p-10 border border-neon-cyan/30 shadow-3xl bg-neon-card backdrop-blur-2xl overflow-hidden font-inter">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan to-neon-purple" />
          <DialogHeader className="mb-10 text-center">
            <DialogTitle className="text-xl uppercase text-white tracking-tighter font-black italic">Register Identity</DialogTitle>
            <DialogDescription className="text-neon-cyan uppercase text-[9px] tracking-[0.3em] mt-2 text-center font-black drop-shadow-[0_0_5px_rgba(0,242,255,0.3)]">Authorize New Profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-8">
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Full Name</Label><Input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5 focus:border-neon-cyan transition-all shadow-inner" /></div>
            <div className="space-y-2">
              <Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Identity Token</Label>
              <div className="flex gap-3">
                <Input value={newStudentId} onChange={e => setNewStudentId(e.target.value)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-lg px-5 text-neon-cyan font-black flex-1 tracking-widest shadow-inner" />
                <Button variant="outline" onClick={() => setNewStudentId('STU' + Math.floor(1000 + Math.random() * 9000))} className="h-14 w-14 rounded-2xl border-neon-border bg-black/40 hover:bg-neon-cyan/10 transition-all flex-shrink-0"><RefreshCw className="w-5 h-5 text-neon-cyan" /></Button>
              </div>
            </div>
            <div className="space-y-2"><Label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Secret Access Key</Label><Input value={newStudentPassword} onChange={e => setNewStudentPassword(e.target.value)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5 focus:border-neon-cyan transition-all shadow-inner" placeholder="••••••••" /></div>
          </div>
          <DialogFooter className="mt-12"><Button onClick={handleAddStudent} className="w-full bg-neon-cyan text-black h-16 rounded-[24px] shadow-[0_0_20px_rgba(0,242,255,0.2)] uppercase text-[10px] tracking-[0.2em] transition-all hover:scale-105 font-black italic">AUTHORIZE ENTRY</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-[40px] max-w-[320px] text-center p-10 bg-neon-card border border-neon-pink/30 shadow-3xl overflow-hidden font-inter">
          <div className="w-16 h-16 bg-neon-pink/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_20px_rgba(255,0,229,0.2)] border border-neon-pink/30"><Trash2 className="w-8 h-8 text-neon-pink" /></div>
          <DialogTitle className="text-xl italic font-black uppercase tracking-tight text-white mb-2">Delete Identity</DialogTitle>
          <p className="text-gray-500 uppercase text-[9px] tracking-[0.3em] mb-10 font-black">This protocol is final</p>
          <div className="flex flex-col gap-3">
            <Button onClick={handleDeleteStudent} className="w-full bg-neon-pink text-white h-14 rounded-2xl shadow-xl text-[10px] font-black uppercase tracking-widest italic hover:bg-neon-pink/80 transition-all">EXECUTE TERMINATION</Button>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} className="w-full text-gray-600 h-12 rounded-2xl uppercase text-[9px] font-black tracking-[0.2em] hover:text-white transition-colors">Abort Protocol</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminUploadDialog} onOpenChange={setShowAdminUploadDialog}>
        <DialogContent className="rounded-[40px] max-w-lg p-10 border border-neon-cyan/30 bg-neon-card shadow-3xl backdrop-blur-2xl overflow-hidden font-inter">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan to-neon-purple shadow-[0_0_20px_rgba(0,242,255,0.2)]" />
          <DialogHeader className="mb-10 text-center"><DialogTitle className="text-xl uppercase text-white tracking-tighter font-black italic">Asset Deployment</DialogTitle></DialogHeader>
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black tracking-widest ml-1">Module</Label><Select value={adminSelectedCourseId} onValueChange={setAdminSelectedCourseId}><SelectTrigger className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-black"><SelectValue placeholder="Target" /></SelectTrigger><SelectContent className="bg-neon-card border-neon-border text-gray-300">{courses.map(c => <SelectItem key={c.id} value={c.id} className="font-black uppercase text-[9px]">{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black tracking-widest ml-1">Type</Label><Select value={adminSelectedMaterialType} onValueChange={(v: any) => setAdminSelectedMaterialType(v)}><SelectTrigger className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-black"><SelectValue /></SelectTrigger><SelectContent className="bg-neon-card border-neon-border text-gray-300"><SelectItem value="textbooks" className="font-black uppercase text-[9px]">Textbook</SelectItem><SelectItem value="videos" className="font-black uppercase text-[9px]">Video Asset</SelectItem><SelectItem value="pastQuestions" className="font-black uppercase text-[9px]">Examination</SelectItem></SelectContent></Select></div>
            </div>
            {adminSelectedCourseId && (
              <div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black tracking-widest ml-1">Audience (Optional)</Label><div className="bg-black/40 rounded-2xl border border-neon-border p-1"><MultiSelect options={students.filter(s => s.courses && s.courses.includes(adminSelectedCourseId)).map(s => ({ label: s.name, value: s.id }))} selected={adminSelectedStudentIds} onChange={setAdminSelectedStudentIds} placeholder="Global Broadcast" /></div></div>
            )}
            <div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black tracking-widest ml-1">Asset Identity</Label><Input value={adminNewMaterialTitle} onChange={e => setAdminNewMaterialTitle(e.target.value)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5" placeholder="Label..." /></div>
            <div className="space-y-3"><Label className="text-[10px] uppercase text-gray-500 font-black tracking-widest">Deployment Method</Label><div className="flex bg-black/40 rounded-2xl p-1 border border-neon-border/50"><button onClick={() => setUploadMethod('file')} className={cn("flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", uploadMethod === 'file' ? "bg-neon-cyan text-black" : "text-gray-500 hover:text-white")}>Physical Binary</button><button onClick={() => setUploadMethod('link')} className={cn("flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", uploadMethod === 'link' ? "bg-neon-cyan text-black" : "text-gray-500 hover:text-white")}>Network Link</button></div></div>
            {uploadMethod === 'file' ? <div className="space-y-2"><Label className="text-[10px] uppercase text-gray-500 font-black tracking-widest ml-1">Binary File</Label><Input type="file" onChange={e => setAdminNewMaterialFile(e.target.files?.[0] || null)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-gray-400 file:bg-neon-cyan file:text-black file:border-none file:h-full file:px-6 file:mr-4 file:font-black file:uppercase file:text-[9px] cursor-pointer" /></div> : <div className="space-y-2"><Label className="text-[10px] uppercase text-gray-400 font-black tracking-widest ml-1">Asset URL</Label><Input value={adminNewMaterialLink} onChange={e => setAdminNewMaterialLink(e.target.value)} className="h-14 rounded-2xl border-neon-border bg-black/40 text-white font-bold px-5" placeholder="https://..." /></div>}
          </div>
          <DialogFooter className="mt-12"><Button onClick={handleAdminUpload} className="w-full bg-neon-cyan text-black h-16 rounded-[24px] shadow-[0_0_25px_rgba(0,242,255,0.2)] uppercase tracking-[0.2em] text-[10px] transition-all font-black italic">EXECUTE DEPLOYMENT</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
