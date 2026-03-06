import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  courseId: string;
  type: 'quiz' | 'examination' | 'assignment';
  title: string;
  mode: string;
  submissionMode: string;
  duration: number;
  endDate: string;
  assignedStudentIds: string[];
}

interface UploadedMaterial {
  id: string;
  courseId: string;
  type: 'textbooks' | 'videos' | 'pastQuestions';
  title: string;
  url?: string;
  uploadedBy: string;
  approved: boolean;
  date: string;
}

export function AdminDashboard({ user, onLogout, onSwitchToStudent, onUpdateUser }: AdminDashboardProps) {
  const isMobile = useIsMobile();
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

  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [showMarkDialog, setShowMarkDialog] = useState(false);
  const [markingScore, setMarkingScore] = useState(0);
  const [markingStatus, setMarkingScoreStatus] = useState<'pending' | 'released'>('pending');

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

  const handleUpdateResult = async () => {
    if (!selectedResult) return;
    const res = await fetch(`http://localhost:5000/api/results/${selectedResult.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: markingScore, status: markingStatus })
    });
    if (res.ok) { fetchData(); setShowMarkDialog(false); toast.success('Result Updated'); }
  };

  const fetchData = async () => {
    try {
      const [coursesRes, studentsRes, assessmentsRes, resultsRes, materialsRes, regRes, activityRes, subAdminsRes] = await Promise.all([
        fetch('http://localhost:5000/api/courses'),
        fetch('http://localhost:5000/api/students'),
        fetch('http://localhost:5000/api/assessments'),
        fetch('http://localhost:5000/api/results'),
        fetch('http://localhost:5000/api/materials'),
        fetch('http://localhost:5000/api/reg-requests'),
        fetch('http://localhost:5000/api/activity'),
        fetch('http://localhost:5000/api/subadmins')
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

  useEffect(() => { fetchData(); }, []);

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
      const res = await fetch('http://localhost:5000/api/students', { 
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
      const res = await fetch('http://localhost:5000/api/subadmins', {
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
      const res = await fetch(`http://localhost:5000/api/students/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) { fetchData(); toast.success(`Sub-Admin ${newStatus}`); }
    } catch (e) { toast.error('Status update failed'); }
  };

  const handleEditStudent = async () => {
    if (!selectedStudent || !originalId) return;
    const res = await fetch(`http://localhost:5000/api/students/${originalId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selectedStudent) });
    if (res.ok) { fetchData(); setShowEditDialog(false); toast.success('Updated'); }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    const res = await fetch(`http://localhost:5000/api/students/${selectedStudent.id}`, { method: 'DELETE' });
    if (res.ok) { fetchData(); setShowDeleteDialog(false); toast.success('Deleted'); }
  };

  const handleCreateAssessment = async () => {
    if (!selectedCourse || !assessmentTitle || !endDate) return;
    const config = { id: `ASMT${Date.now()}`, courseId: selectedCourse, type: 'quiz', title: assessmentTitle, mode: 'objectives', submissionMode: 'online', structuredQuestions: [], duration, startDate: new Date().toISOString(), endDate: new Date(endDate).toISOString(), assignedStudentIds: assignedStudents };
    const res = await fetch('http://localhost:5000/api/assessments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
    if (res.ok) { fetchData(); toast.success('Published'); }
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
      const mat = { id: `MAT${Date.now()}`, courseId: adminSelectedCourseId === 'global-course' ? 'GLOBAL' : adminSelectedCourseId, type: adminSelectedMaterialType, title: adminNewMaterialTitle, url: fileData, uploadedBy: user.name, approved: true, date: new Date().toISOString().split('T')[0], assignedStudentIds: adminSelectedStudentIds };
      try {
        const res = await fetch('http://localhost:5000/api/materials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mat) });
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
    const res = await fetch('http://localhost:5000/api/enrollments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: studentToAssign, courseId: courseToAssign }) });
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
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (res.ok) {
        await fetch(`http://localhost:5000/api/reg-requests/${req.id}`, { method: 'DELETE' });
        fetchData();
        toast.success(`Authorized as ${id}`);
      }
    } catch (e) {
      toast.error('Authorization failed');
    }
  };

  const handleRejectRequest = async (req: any) => {
    try {
      await fetch(`http://localhost:5000/api/reg-requests/${req.id}`, { method: 'DELETE' });
      fetchData();
      toast.error('Unauthorized and Removed');
    } catch (e) {
      toast.error('Action failed');
    }
  };

  const handleUpdateAdminProfile = async () => {
    const updated = { ...user, name: adminProfileData.name.toUpperCase(), password: adminProfileData.password, email: adminProfileData.email, contact: adminProfileData.contact };
    const res = await fetch(`http://localhost:5000/api/students/${user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    if (res.ok) { onUpdateUser(updated, user.id); setShowAdminProfileDialog(false); toast.success('Saved'); }
  };

  const getStatusBadge = (s: string) => {
    const colors: any = { active: 'bg-green-500', inactive: 'bg-gray-400', suspended: 'bg-red-500' };
    return <Badge className={cn(colors[s] || 'bg-blue-500', "font-semibold")}>{s.toUpperCase()}</Badge>;
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-admin-cream text-admin-seaBlue animate-pulse uppercase tracking-widest text-lg">AlaMel System Syncing...</div>;

  return (
    <div className="min-h-screen flex bg-admin-cream relative overflow-x-hidden font-inter">
      <aside className={`fixed left-0 top-0 h-full bg-admin-seaBlue shadow-2xl z-50 transition-all duration-500 border-r border-white/10 ${isMobile ? (mobileMenuOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full') : (sidebarCollapsed ? 'w-20' : 'w-64')}`}>
        <div className="h-20 flex items-center justify-center border-b border-white/20 bg-black/5"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg overflow-hidden border border-gray-100"><img src="/favicon.png" alt="Logo" className="w-full h-full object-cover rounded-lg scale-[1.5]" /></div>{!sidebarCollapsed && <span className="text-lg text-white uppercase tracking-tighter">AlaMel</span>}</div></div>
        <ScrollArea className="flex-1 h-[calc(100vh-180px)] py-4">
          <nav className="px-3 space-y-2">
            {[
              { icon: Users, label: 'Students', value: 'students' },
              { icon: GraduationCap, label: 'Registration', value: 'reg-requests' },
              { icon: Shield, label: 'AC Center', value: 'ac-center' },
              { icon: FolderLock, label: 'SCM', value: 'scm-management' },
              { icon: Clock, label: 'Assessment', value: 'timer' },
              { icon: BookUser, label: 'Enrollment', value: 'course-assignment' },
              { icon: CheckCircle, label: 'Results', value: 'results' },
              { icon: ActivityIcon, label: 'Activity', value: 'activity' },
              { icon: Key, label: 'Generator', value: 'generator' }
            ].map(item => (
              <button key={item.value} onClick={() => { setActiveTab(item.value); if(isMobile) setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all relative group ${activeTab === item.value ? 'bg-admin-aquamarine text-teal-900 shadow-xl scale-105' : 'text-white/80 hover:bg-white/10'}`}>
                {activeTab === item.value && <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />}
                <item.icon className={`w-5 h-5 flex-shrink-0 ${activeTab === item.value ? 'text-teal-900' : ''}`} /> {!sidebarCollapsed && <span className="text-xs uppercase">{item.label}</span>}
              </button>
            ))}
          </nav>
        </ScrollArea>
        {!isMobile && <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="absolute -right-3 top-24 w-6 h-6 bg-white text-admin-seaBlue rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform">{sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}</button>}
        <div className="p-4 border-t border-white/10 bg-black/5"><button onClick={onLogout} className="w-full flex items-center gap-3 p-3 rounded-2xl text-white/80 hover:bg-red-50 transition-all group"><LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> {!sidebarCollapsed && <span className="text-xs uppercase">Logout</span>}</button></div>
      </aside>

      <main className={`flex-1 transition-all duration-500 ${isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-20' : 'ml-64')}`}>
        <header className="h-20 bg-admin-seaBlue shadow-lg px-8 flex items-center justify-between border-b border-white/10 sticky top-0 z-30">
          <div className="flex items-center gap-4">{isMobile && <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="text-white"><Menu className="w-6 h-6" /></Button>}<h1 className="text-lg text-white uppercase tracking-tight">{activeTab.replace('-', ' ')}</h1></div>
          <div className="flex items-center gap-4">
            <Button onClick={onSwitchToStudent} className="bg-admin-aquamarine text-teal-900 rounded-xl text-xs px-6">STUDENT VIEW</Button>
            <DropdownMenu><DropdownMenuTrigger asChild><Avatar className="cursor-pointer border-2 border-admin-aquamarine shadow-md hover:scale-105 transition-transform"><AvatarFallback className="bg-white text-admin-seaBlue uppercase text-sm">{user.name[0]}</AvatarFallback></Avatar></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl border-2 shadow-2xl">
                <DropdownMenuLabel className="text-[10px] text-gray-400 uppercase font-semibold">Master Admin</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowAdminProfileDialog(true)} className="rounded-xl uppercase text-xs font-semibold"><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout} className="text-red-600 rounded-xl uppercase text-xs font-semibold"><LogOut className="mr-2 h-4 w-4" /> Logout</DropdownMenuItem>
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
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input placeholder="Search students..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 rounded-2xl h-12 bg-white font-semibold" />
                  </div>
                  <div className="flex bg-white rounded-2xl p-1 shadow-sm border-2 border-admin-seaBlue/5">
                    <button 
                      onClick={() => setViewScope('all')} 
                      className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", viewScope === 'all' ? "bg-admin-seaBlue text-white shadow-md" : "text-gray-400 hover:bg-gray-50")}
                    >
                      All Records
                    </button>
                    <button 
                      onClick={() => setViewScope('direct')} 
                      className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", viewScope === 'direct' ? "bg-admin-seaBlue text-white shadow-md" : "text-gray-400 hover:bg-gray-50")}
                    >
                      Authorized By Me
                    </button>
                  </div>
                </div>
                <Button onClick={() => setShowAddDialog(true)} className="bg-admin-seaBlue text-white rounded-2xl h-12 px-10 shadow-lg hover:bg-blue-700 transition-all text-xs">ADD STUDENT</Button>
              </div>
              <Card className="rounded-[32px] overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm">
                <Table>
                  <TableHeader className="bg-gray-50"><TableRow><TableHead className="px-8 py-6 uppercase text-xs font-semibold">Identity</TableHead><TableHead className="uppercase text-xs text-center font-semibold">Status</TableHead><TableHead className="text-right px-8 uppercase text-xs font-semibold">Action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredStudents.map(s => (
                      <TableRow key={s.id} className="hover:bg-blue-50 cursor-pointer border-b transition-colors" onClick={() => { setSelectedStudent(s); setOriginalId(s.id); setActiveTab('student-workspace'); }}>
                        <TableCell className="px-8 py-6 flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">{s.id.slice(-2)}</div><div><p className="text-gray-800 text-sm">{s.name}</p><p className="text-xs text-gray-400 uppercase">{s.id}</p></div></TableCell>
                        <TableCell className="text-center">{getStatusBadge(s.status)}</TableCell>
                        <TableCell className="text-right px-8"><Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setSelectedStudent(s); setShowDeleteDialog(true); }} className="text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></Button></TableCell>
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
                <button onClick={() => setActiveTab('students')} className="text-admin-seaBlue uppercase text-xs tracking-widest flex items-center hover:opacity-70 transition-opacity"><ChevronLeft className="w-4 h-4 mr-2" /> Back to Students</button>
                <div className="flex gap-3">
                  <Button onClick={() => setShowEditDialog(true)} className="bg-white text-admin-seaBlue border-2 border-admin-seaBlue/10 rounded-2xl h-10 px-6 text-xs font-semibold hover:bg-gray-50"><Settings className="w-4 h-4 mr-2" /> Edit Profile</Button>
                  <Button onClick={() => setShowDeleteDialog(true)} className="bg-red-50 text-red-600 border-2 border-red-100 rounded-2xl h-10 px-6 text-xs font-semibold hover:bg-red-100"><Trash2 className="w-4 h-4 mr-2" /> Expel</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="rounded-[32px] p-8 border-none shadow-xl bg-admin-seaBlue text-white relative overflow-hidden h-full">
                  <img src="/favicon.png" className="absolute -right-10 -bottom-10 w-48 h-48 opacity-10 rotate-12 grayscale" />
                  <div className="relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-xl text-admin-seaBlue shadow-2xl uppercase mb-6">{selectedStudent.name[0]}</div>
                    <h2 className="text-xl uppercase tracking-tight mb-1 leading-none font-semibold">{selectedStudent.name}</h2>
                    <p className="text-white/60 text-[10px] uppercase tracking-widest mb-8 font-semibold">{selectedStudent.id}</p>
                    <div className="space-y-4">
                      <div className="space-y-1"><p className="text-[8px] text-white/40 uppercase tracking-widest">ACCESS PASSWORD</p><p className="text-lg tracking-tight font-semibold">{selectedStudent.password}</p></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><p className="text-[8px] text-white/40 uppercase tracking-widest">EMAIL</p><p className="text-[10px] font-semibold truncate">{selectedStudent.email || 'N/A'}</p></div>
                        <div className="space-y-1"><p className="text-[8px] text-white/40 uppercase tracking-widest">CONTACT</p><p className="text-[10px] font-semibold">{selectedStudent.contact || 'N/A'}</p></div>
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
                          <div className="pt-4 border-t border-white/10 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1"><p className="text-[8px] text-white/40 uppercase tracking-widest">EDUCATION LEVEL</p><p className="text-[10px] font-semibold uppercase">{details.educationLevel || details.level || 'N/A'}</p></div>
                              <div className="space-y-1"><p className="text-[8px] text-white/40 uppercase tracking-widest">CLASS</p><p className="text-[10px] font-semibold uppercase">{details.studentClass || details.class || 'N/A'}</p></div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] text-white/40 uppercase tracking-widest">SUBJECTS TO PREPARE</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Array.isArray(details.coursesToPrepare) ? details.coursesToPrepare.map((c: string) => (
                                  <span key={c} className="text-[7px] bg-white/10 px-2 py-0.5 rounded-full font-black uppercase">{c}</span>
                                )) : <span className="text-[10px] font-semibold text-white/40">NONE</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="space-y-1 pt-4 border-t border-white/10"><p className="text-[8px] text-white/40 uppercase tracking-widest">CURRENT STATUS</p><div>{getStatusBadge(selectedStudent.status)}</div></div>
                    </div>
                  </div>
                </Card>

                <Card className="lg:col-span-2 rounded-[32px] p-8 border-none shadow-xl bg-white relative h-full">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-lg uppercase tracking-tight text-gray-800 font-semibold">Performance Analytics</h3>
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-0.5 font-semibold">Live Assessment Records</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-right"><p className="text-lg text-blue-600 tracking-tight font-semibold">{results.filter(r => r.studentId === selectedStudent.id).length}</p><p className="text-[8px] text-gray-400 uppercase font-semibold">Tests</p></div>
                      <div className="text-right pl-4 border-l-2"><p className="text-lg text-green-600 tracking-tight font-semibold">{Math.round(results.filter(r => r.studentId === selectedStudent.id).reduce((acc, curr) => acc + curr.score, 0) / (results.filter(r => r.studentId === selectedStudent.id).length || 1))}%</p><p className="text-[8px] text-gray-400 uppercase font-semibold">AVG</p></div>
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[350px] pr-4 font-semibold">
                    <Table>
                      <TableHeader className="bg-gray-50/50"><TableRow><TableHead className="py-3 text-[9px] uppercase font-semibold">Title</TableHead><TableHead className="text-[9px] uppercase text-center font-semibold">Result</TableHead><TableHead className="text-[9px] uppercase text-right font-semibold">Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {results.filter(r => r.studentId === selectedStudent.id).length > 0 ? (
                          results.filter(r => r.studentId === selectedStudent.id).map(r => (
                            <TableRow key={r.id} className="border-b hover:bg-gray-50 transition-colors">
                              <TableCell className="py-4"><p className="text-gray-800 uppercase text-xs tracking-tight font-semibold">{r.assessmentTitle}</p><p className="text-[8px] text-gray-400 tracking-widest font-semibold">{r.courseName}</p></TableCell>
                              <TableCell className="text-center font-semibold"><span className={`text-base tracking-tight ${r.score >= 50 ? 'text-green-600' : 'text-red-600'}`}>{r.score}%</span></TableCell>
                              <TableCell className="text-right"><Badge className={`text-[7px] uppercase font-semibold ${r.status === 'released' ? 'bg-green-500' : 'bg-orange-500'}`}>{r.status}</Badge></TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={3} className="text-center py-16 text-gray-300 text-[10px] tracking-widest font-semibold">No Assessment Records Found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              </div>

              <Card className="rounded-[32px] p-8 border-none shadow-xl bg-white relative overflow-hidden">
                <BookUser className="absolute -right-10 -bottom-10 w-48 h-48 text-gray-50 -rotate-12" />
                <div className="relative z-10">
                  <h3 className="text-lg uppercase tracking-tight text-gray-800 mb-6 font-semibold">Enrolled Course Modules</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courses.filter(c => selectedStudent.courses?.includes(c.id)).map(c => (
                      <div key={c.id} className="p-4 rounded-[20px] bg-gray-50 border-2 border-transparent hover:border-admin-seaBlue transition-all flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center text-admin-seaBlue text-xs font-semibold">{c.code[0]}</div>
                          <div>
                            <p className="text-gray-800 uppercase tracking-tight text-xs leading-tight font-semibold">{c.name}</p>
                            <p className="text-[8px] text-gray-400 tracking-widest mt-0.5 font-semibold">{c.code}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => fetch(`http://localhost:5000/api/enrollments/${selectedStudent.id}/${c.id}`, {method:'DELETE'}).then(() => fetchData())} className="text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))}
                    {courses.filter(c => selectedStudent.courses?.includes(c.id)).length === 0 && (
                      <div className="lg:col-span-3 h-32 rounded-[24px] border-2 border-dashed flex items-center justify-center text-gray-300 uppercase text-[10px] tracking-widest font-semibold">No Modules Assigned To This Profile</div>
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
                  {regRequests.map(r => (
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
                        <Badge className={cn(
                          "rounded-full px-4 py-1 text-[8px] font-black tracking-[0.1em] uppercase",
                          r.role === 'student' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-indigo-700"
                        )}>
                          {r.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {r.role === 'student' ? (
                          <div className="inline-block text-left">
                            <p className="text-[10px] text-gray-800 font-bold uppercase">{r.details?.educationLevel} • {r.details?.studentClass}</p>
                            <div className="flex gap-1 mt-1">
                              {r.details?.coursesToPrepare?.map((c: string) => (
                                <span key={c} className="text-[7px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 font-black uppercase">{c}</span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-400 italic max-w-[150px] mx-auto leading-tight font-semibold">{r.details?.purposeOfRegistration}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right px-8">
                        {r.status === 'approved' ? (
                          <div className="flex flex-col items-end gap-2">
                            <Badge className="bg-green-600 text-white px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest mb-1 shadow-lg shadow-green-100 uppercase">Authorized: {r.approved_user_id}</Badge>
                            <Button variant="ghost" onClick={() => handleUnapproveRequest(r)} className="text-red-500 hover:bg-red-50 h-8 px-4 rounded-xl text-[8px] font-black tracking-widest uppercase border-2 border-red-50">Revoke Access</Button>
                          </div>
                        ) : r.status === 'rejected' ? (
                          <div className="flex flex-col items-end gap-2">
                            <Badge className="bg-red-600 text-white px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest mb-1 shadow-lg shadow-red-100 uppercase">Unauthorized</Badge>
                            <Button variant="ghost" onClick={() => handleApproveRequest(r)} className="text-green-600 hover:bg-green-50 h-8 px-4 rounded-xl text-[8px] font-black tracking-widest uppercase border-2 border-green-50">Authorize Instead</Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-3">
                            <Button onClick={() => handleApproveRequest(r)} className="bg-green-500 hover:bg-green-600 text-white px-8 rounded-2xl h-12 shadow-xl shadow-green-100 text-[10px] font-black tracking-widest transition-all hover:scale-105 active:scale-95 uppercase">Authorize</Button>
                            <Button variant="ghost" onClick={() => handleRejectRequest(r)} className="text-red-400 hover:text-red-600 h-12 px-6 text-[10px] font-black tracking-widest uppercase rounded-2xl">Reject</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {regRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-24">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                          <GraduationCap className="w-10 h-10 text-gray-200" />
                        </div>
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest italic">Registration Queue Empty</h3>
                        <p className="text-[9px] text-gray-300 uppercase tracking-widest mt-2 font-semibold">No pending authorization requests found</p>
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
                <div><h2 className="text-xl text-gray-800 uppercase tracking-tight font-semibold">Authorized Creators</h2><p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mt-1">Sub-Admin Management Console</p></div>
                <Button onClick={() => setShowAddSubAdminDialog(true)} className="bg-admin-seaBlue text-white rounded-2xl h-12 px-8 shadow-lg text-xs font-semibold"><Plus className="w-5 h-5 mr-2" /> DEPLOY CREATOR</Button>
              </div>
              <Card className="rounded-[32px] overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm">
                <Table>
                  <TableHeader className="bg-gray-50"><TableRow><TableHead className="px-8 py-6 uppercase text-xs font-semibold">Name</TableHead><TableHead className="uppercase text-xs text-center font-semibold">Number of students</TableHead><TableHead className="uppercase text-xs text-center font-semibold">Status</TableHead><TableHead className="text-right px-8 uppercase text-xs font-semibold">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {subAdmins.map(sub => (
                      <TableRow key={sub.id} className="border-b hover:bg-blue-50/50 transition-colors">
                        <TableCell className="px-8 py-6 flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 uppercase font-semibold">{sub.name[0]}</div><div><p className="text-gray-800 text-sm font-semibold">{sub.name}</p><p className="text-xs text-gray-400 uppercase">{sub.id}</p></div></TableCell>
                        <TableCell className="text-center font-semibold text-lg text-blue-600">{sub.student_count}<span className="text-[10px] text-gray-400 ml-1 uppercase font-semibold">Students</span></TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger>{getStatusBadge(sub.status)}</DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="rounded-xl font-semibold">
                              <DropdownMenuItem onClick={() => handleUpdateSubAdminStatus(sub, 'active')} className="text-green-600">SET ACTIVE</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateSubAdminStatus(sub, 'inactive')} className="text-gray-500">SET INACTIVE</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateSubAdminStatus(sub, 'suspended')} className="text-red-600">SET SUSPENDED</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedStudent(sub); setOriginalId(sub.id); setShowEditDialog(true); }} className="text-blue-500 hover:bg-blue-50 rounded-xl"><Settings className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedStudent(sub); setShowDeleteDialog(true); }} className="text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {activeTab === 'timer' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="rounded-[32px] p-8 border-none shadow-xl bg-white"><CardHeader className="p-0 mb-8"><CardTitle className="text-lg uppercase font-semibold">Publish Assessment</CardTitle><CardDescription className="text-[10px] uppercase text-gray-400 font-semibold">Deploy module tests to system</CardDescription></CardHeader>
                <div className="space-y-6">
                  <div className="space-y-2"><Label className="text-xs font-semibold">Course Target</Label><Select value={selectedCourse} onValueChange={setSelectedCourse}><SelectTrigger className="h-12 rounded-2xl border-2 font-semibold"><SelectValue placeholder="Select Module" /></SelectTrigger><SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id} className="font-semibold">{c.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label className="text-xs font-semibold">Assessment Title</Label><Input value={assessmentTitle} onChange={e => setAssessmentTitle(e.target.value)} className="h-12 rounded-2xl border-2 font-semibold" /></div>
                  <div className="grid grid-cols-2 gap-6"><div className="space-y-2"><Label className="text-xs font-semibold">Deadline</Label><Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-12 rounded-2xl border-2 font-semibold" /></div><div className="space-y-2"><Label className="text-xs font-semibold">Duration</Label><Input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="h-12 rounded-2xl border-2 font-semibold" /></div></div>
                  <div className="space-y-2"><Label className="text-xs font-semibold">Target Audience</Label><MultiSelect options={studentOptions} selected={assignedStudents} onChange={setAssignedStudents} placeholder="Select students..." /></div>
                  <Button onClick={handleCreateAssessment} className="w-full bg-admin-seaBlue text-white h-14 rounded-2xl shadow-lg uppercase transition-all text-xs font-semibold">DEPLOY ASSESSMENT</Button>
                </div>
              </Card>
              <Card className="rounded-[32px] p-8 border-none shadow-xl bg-admin-seaBlue text-white overflow-hidden relative"><img src="/favicon.png" className="absolute -right-10 -bottom-10 w-48 h-48 opacity-10 rotate-12 grayscale" /><h3 className="text-lg mb-8 relative z-10 uppercase tracking-tight font-semibold">Active Assessments</h3><ScrollArea className="h-[450px] relative z-10 pr-4"><div className="space-y-4">{assessments.map(a => (<div key={a.id} className="p-4 rounded-2xl bg-white/10 border border-white/20 flex justify-between items-center group shadow-inner"><div><p className="text-sm mb-1 font-semibold">{a.title}</p><div className="flex gap-3 items-center"><Badge variant="secondary" className="bg-white/20 text-white text-[8px] uppercase font-semibold">{a.type}</Badge><p className="text-[9px] text-white/60 uppercase tracking-widest font-semibold">{courses.find(c => c.id === a.courseId)?.name}</p></div></div><Button variant="ghost" size="icon" onClick={() => fetch(`http://localhost:5000/api/assessments/${a.id}`, {method:'DELETE'}).then(() => fetchData())} className="text-white/40 hover:text-red-400 transition-all"><Trash2 className="w-4 h-4" /></Button></div>))}</div></ScrollArea></Card>
            </div>
          )}

          {activeTab === 'scm-management' && (
            <Card className="rounded-[32px] p-8 border-none shadow-xl bg-white">
              <div className="flex justify-between items-center mb-10 gap-4"><div><CardTitle className="text-lg uppercase tracking-tight text-gray-800 font-semibold">SCM REPOSITORY</CardTitle></div><Button onClick={() => setShowAdminUploadDialog(true)} className="bg-admin-seaBlue text-white rounded-2xl h-12 px-8 shadow-lg hover:bg-blue-700 transition-all text-xs font-semibold"><Upload className="w-4 h-4 mr-3" /> UPLOAD ASSET</Button></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {uploadedMaterials.map(m => (
                  <Card key={m.id} className="rounded-[32px] border-2 shadow-lg hover:shadow-2xl transition-all duration-500 p-6 group relative overflow-hidden bg-gray-50/50">
                    <div className="flex justify-between items-start mb-4"><div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xl"><Files className="w-6 h-6" /></div><Button variant="ghost" size="icon" onClick={() => fetch(`http://localhost:5000/api/materials/${m.id}`, {method:'DELETE'}).then(() => fetchData())} className="text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:text-red-600"><Trash2 className="w-4 h-4" /></Button></div>
                    <h4 className="text-gray-800 text-base mb-1 line-clamp-1 font-semibold">{m.title}</h4><p className="text-[10px] text-gray-400 uppercase mb-6 tracking-widest font-semibold">{m.type} • {courses.find(c => c.id === m.courseId)?.name || 'Global'}</p>
                    <div className="flex gap-3"><Button variant="outline" className="flex-1 rounded-xl h-10 text-xs font-semibold border-2 transition-all hover:bg-blue-50" onClick={() => handleView(m)}><Eye className="w-4 h-4 mr-2" /> VIEW</Button><Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-2 transition-all" onClick={() => handleDownload(m)}><Download className="w-4 h-4" /></Button></div>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'course-assignment' && (
            <Card className="rounded-[32px] p-10 border-none shadow-xl bg-white relative overflow-hidden text-center">
              <BookUser className="absolute -right-10 -bottom-10 w-48 h-48 text-gray-50 -rotate-12" />
              <CardTitle className="text-xl uppercase tracking-tight text-gray-800 mb-10 relative z-10 font-semibold">Module Enrollment</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto relative z-10">
                <div className="space-y-2"><Label className="text-[10px] uppercase text-gray-400 font-semibold">Identify Student Profile</Label><Select value={studentToAssign} onValueChange={setStudentToAssign}><SelectTrigger className="rounded-xl h-12 border-2 text-sm font-semibold"><SelectValue placeholder="Select Profile" /></SelectTrigger><SelectContent className="rounded-xl shadow-xl">{myStudents.map(s => <SelectItem key={s.id} value={s.id} className="font-semibold">{s.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label className="text-[10px] uppercase text-gray-400 font-semibold">Select Course Module</Label><Select value={courseToAssign} onValueChange={setCourseToAssign}><SelectTrigger className="rounded-xl h-12 border-2 text-sm font-semibold"><SelectValue placeholder="Select Module" /></SelectTrigger><SelectContent className="rounded-xl shadow-xl">{courses.map(c => <SelectItem key={c.id} value={c.id} className="font-semibold">{c.name}</SelectItem>)}</SelectContent></Select></div>
                <Button onClick={handleAssignCourse} className="h-12 bg-admin-seaBlue hover:bg-blue-700 text-white rounded-xl shadow-lg transition-all text-xs font-semibold">AUTHORIZE ACCESS</Button>
              </div>
            </Card>
          )}

          {activeTab === 'results' && (
            <Card className="rounded-[32px] border-none shadow-2xl p-8 bg-white/80 backdrop-blur-sm overflow-hidden font-semibold">
              <div className="flex justify-between items-center mb-8"><h2 className="text-xl uppercase tracking-tight text-gray-800 font-semibold">Academic Performance</h2><Button variant="outline" className="rounded-xl border-2 uppercase text-[10px] h-10 px-6 font-semibold"><Filter className="w-4 h-4 mr-2" /> FILTER ENGINE</Button></div>
              <Table>
                <TableHeader className="bg-gray-50/50 border-b-2"><TableRow><TableHead className="px-8 py-6 text-gray-400 uppercase text-[10px] font-semibold">Student Profile</TableHead><TableHead className="text-gray-400 uppercase text-[10px] text-center font-semibold">Assessment</TableHead><TableHead className="text-gray-400 uppercase text-[10px] text-center font-semibold">Score</TableHead><TableHead className="text-right px-8 text-gray-400 uppercase text-[10px] font-semibold">Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {results.map(r => (
                    <TableRow key={r.id} className="border-b hover:bg-blue-50/50 transition-colors">
                      <TableCell className="px-8 py-6"><div className="flex items-center gap-4"><Avatar className="w-10 h-10 border-2 border-blue-100 shadow-sm"><AvatarFallback className="bg-blue-600 text-white uppercase text-xs font-semibold">{r.studentName?.[0] || 'S'}</AvatarFallback></Avatar><div><p className="text-gray-800 text-sm tracking-tight font-semibold">{r.studentName}</p><p className="text-[10px] text-gray-400 tracking-widest font-semibold">{r.studentId}</p></div></div></TableCell>
                      <TableCell className="text-center text-gray-500 uppercase text-[9px] tracking-wider font-semibold">{r.assessmentTitle}</TableCell>
                      <TableCell className="text-center font-semibold"><span className={`text-xl tracking-tight ${r.score >= 50 ? 'text-green-600' : 'text-red-600'}`}>{r.score}%</span></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className={`px-3 py-1 rounded-full text-[8px] uppercase tracking-widest font-semibold ${r.status === 'released' ? 'text-green-600 border-green-200 bg-green-50' : 'text-orange-600 border-orange-200 bg-orange-50'}`}>{r.status}</Badge></TableCell>
                      <TableCell className="text-right px-8"><Button onClick={() => { setSelectedResult(r); setMarkingScore(r.score); setMarkingScoreStatus(r.status); setShowMarkDialog(true); }} className="bg-admin-seaBlue hover:bg-blue-700 text-white px-4 rounded-xl h-10 shadow-lg uppercase text-[9px] tracking-widest transition-all font-semibold">REVIEW</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {activeTab === 'activity' && (
            <Card className="rounded-[32px] border-none shadow-2xl p-8 bg-white/80 backdrop-blur-sm">
              <CardTitle className="text-lg uppercase tracking-tight mb-8 text-center text-gray-800 font-semibold">System Audit Log</CardTitle>
              <div className="space-y-4 max-w-3xl mx-auto">
                {activityLogs.map(log => (
                  <div key={log.id} className="flex gap-4 p-4 rounded-2xl border bg-white hover:border-blue-400 transition-all shadow-sm group">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><ActivityIcon className="w-5 h-5" /></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1"><h4 className="text-sm text-gray-800 tracking-tight font-semibold">{log.action}</h4><span className="text-[8px] text-gray-400 uppercase tracking-widest font-semibold">{new Date(log.timestamp).toLocaleString()}</span></div>
                      <p className="text-xs text-gray-500 tracking-wide font-semibold">{log.details}</p>
                      <p className="text-[8px] text-blue-600 mt-1 tracking-widest uppercase font-semibold">Executor ID: {log.user_id}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'generator' && (
            <div className="max-w-xl mx-auto space-y-8 py-10 text-center animate-scale-in">
              <Card className="rounded-[40px] border-none shadow-2xl p-10 bg-white relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner"><RefreshCw className="w-8 h-8" /></div>
                <h2 className="text-lg uppercase text-gray-800 mb-4 tracking-tight font-semibold">Token Generator</h2>
                <div className="p-8 rounded-[24px] bg-gray-50 border-2 border-dashed border-gray-200 mb-8">
                  {generatedCredentials ? (
                    <div><p className="text-[8px] text-blue-600 uppercase tracking-widest mb-4 font-semibold">Master Tokens Ready</p><div className="grid grid-cols-2 gap-6 text-left"><div className="space-y-1"><p className="text-[8px] text-gray-400 uppercase tracking-widest font-semibold">SYSTEM ID</p><p className="text-xl text-gray-800 tracking-tight font-semibold">{generatedCredentials.id}</p></div><div className="space-y-1"><p className="text-[8px] text-gray-400 uppercase tracking-widest font-semibold">SECRET KEY</p><p className="text-xl text-gray-800 tracking-tight font-semibold">{generatedCredentials.password}</p></div></div></div>
                  ) : <p className="text-gray-400 uppercase tracking-widest italic opacity-50 py-8 text-center text-xs font-semibold">Engine Standby...</p>}
                </div>
                <Button onClick={() => { const id = 'STU' + Math.floor(1000 + Math.random() * 9000); const pass = Math.floor(100000 + Math.random() * 900000).toString(); setGeneratedCredentials({ id, password: pass }); setNewStudentId(id); setNewStudentPassword(pass); toast.success('Tokens Generated'); }} className="w-full bg-admin-seaBlue hover:bg-blue-700 text-white h-16 rounded-2xl shadow-xl text-sm uppercase tracking-widest transition-all font-semibold">EXECUTE ENGINE</Button>
              </Card>
            </div>
          )}
        </div>
      </main>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-[40px] max-w-md p-10 border-none shadow-3xl bg-white overflow-hidden"><div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-admin-seaBlue to-admin-aquamarine" /><DialogHeader className="mb-8 text-center"><DialogTitle className="text-lg uppercase text-admin-seaBlue tracking-tight font-semibold">System Entry</DialogTitle><DialogDescription className="text-gray-400 uppercase text-[9px] tracking-widest mt-1 text-center font-semibold">Authorize new academic profile</DialogDescription></DialogHeader>
          <div className="space-y-6">
            <div className="space-y-1.5"><Label className="text-[9px] text-gray-400 uppercase tracking-widest ml-1 font-semibold">Official Full Name</Label><Input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="h-12 rounded-xl border-2 text-sm px-4 focus:border-admin-seaBlue transition-all shadow-inner font-semibold" /></div>
            <div className="space-y-1.5"><Label className="text-[9px] text-gray-400 uppercase tracking-widest ml-1 font-semibold">Identity Token</Label><div className="flex gap-2"><Input value={newStudentId} onChange={e => setNewStudentId(e.target.value)} className="h-12 rounded-xl border-2 text-lg px-4 text-admin-seaBlue bg-gray-50 flex-1 font-semibold" /><Button variant="outline" onClick={() => setNewStudentId('STU'+Math.floor(100+Math.random()*900))} className="h-12 w-12 rounded-xl border-2 bg-white hover:bg-blue-50 transition-all flex-shrink-0 font-semibold"><RefreshCw className="w-4 h-4 text-admin-seaBlue" /></Button></div></div>
            <div className="space-y-1.5"><Label className="text-[9px] text-gray-400 uppercase tracking-widest ml-1 font-semibold">Access Key</Label><Input value={newStudentPassword} onChange={e => setNewStudentPassword(e.target.value)} className="h-12 rounded-xl border-2 text-sm px-4 focus:border-admin-seaBlue transition-all shadow-inner font-semibold" placeholder="••••••••" /></div>
          </div>
          <DialogFooter className="mt-10"><Button onClick={handleAddStudent} className="w-full bg-admin-seaBlue hover:bg-blue-700 text-white h-14 rounded-2xl shadow-xl uppercase text-xs tracking-widest transition-all hover:scale-[1.02] font-semibold">AUTHORIZE ENTRY</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddSubAdminDialog} onOpenChange={setShowAddSubAdminDialog}>
        <DialogContent className="rounded-[40px] max-w-md p-10 border-none shadow-3xl bg-white overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-600 to-blue-600" />
          <DialogHeader className="mb-8 text-center">
            <DialogTitle className="text-lg uppercase text-indigo-600 tracking-tight font-semibold">Deploy Creator</DialogTitle>
            <p className="text-gray-400 uppercase text-[9px] tracking-widest mt-1 font-semibold">Authorize New Sub-Admin Profile</p>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-1.5"><Label className="text-[9px] text-gray-400 uppercase tracking-widest ml-1 font-semibold">Creator Name</Label><Input value={newSubAdminName} onChange={e => setNewSubAdminName(e.target.value)} className="h-11 rounded-xl border-2 text-sm px-4 font-semibold" /></div>
            <div className="space-y-1.5"><Label className="text-[9px] text-gray-400 uppercase tracking-widest ml-1 font-semibold">System ID</Label><Input value={newSubAdminId} onChange={e => setNewSubAdminId(e.target.value.toUpperCase())} className="h-11 rounded-xl border-2 text-sm px-4 font-semibold" placeholder="e.g. SUB001" /></div>
            <div className="space-y-1.5"><Label className="text-[9px] text-gray-400 uppercase tracking-widest ml-1 font-semibold">Access Key</Label><Input value={newSubAdminPassword} onChange={e => setNewSubAdminPassword(e.target.value)} className="h-11 rounded-xl border-2 text-sm px-4 font-semibold" placeholder="••••••••" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-[9px] text-gray-400 uppercase tracking-widest ml-1 font-semibold">Email</Label><Input value={newSubAdminEmail} onChange={e => setNewSubAdminEmail(e.target.value)} className="h-11 rounded-xl border-2 text-sm px-4 font-semibold" /></div>
              <div className="space-y-1.5"><Label className="text-[9px] text-gray-400 uppercase tracking-widest ml-1 font-semibold">Contact</Label><Input value={newSubAdminContact} onChange={e => setNewSubAdminContact(e.target.value)} className="h-11 rounded-xl border-2 text-sm px-4 font-semibold" /></div>
            </div>
          </div>
          <DialogFooter className="mt-10"><Button onClick={handleAddSubAdmin} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-14 rounded-2xl shadow-xl uppercase text-xs tracking-widest transition-all font-semibold">EXECUTE DEPLOYMENT</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-[40px] max-w-md p-10 border-none shadow-3xl bg-white"><div className="absolute top-0 left-0 w-full h-2 bg-admin-seaBlue" /><DialogHeader className="mb-8 text-center"><DialogTitle className="text-lg uppercase text-admin-seaBlue tracking-tight font-semibold">Edit Identity</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="space-y-1.5"><Label className="text-[9px] uppercase text-gray-400 font-semibold">Legal Label</Label><Input value={selectedStudent?.name || ''} onChange={e => setSelectedStudent(selectedStudent ? {...selectedStudent, name: e.target.value} : null)} className="h-12 rounded-xl border-2 text-sm px-4 font-semibold" /></div>
            <div className="space-y-1.5"><Label className="text-[9px] uppercase text-gray-400 font-semibold">System ID</Label><Input value={selectedStudent?.id || ''} onChange={e => setSelectedStudent(selectedStudent ? {...selectedStudent, id: e.target.value.toUpperCase()} : null)} className="h-12 rounded-xl border-2 text-sm px-4 font-semibold" /></div>
            <div className="space-y-1.5"><Label className="text-[9px] uppercase text-gray-400 font-semibold">Access Key</Label><Input value={selectedStudent?.password || ''} onChange={e => setSelectedStudent(selectedStudent ? {...selectedStudent, password: e.target.value} : null)} className="h-12 rounded-xl border-2 text-sm px-4 font-semibold" /></div>
            <div className="space-y-1.5"><Label className="text-[9px] uppercase text-gray-400 font-semibold">System Status</Label><Select value={selectedStudent?.status} onValueChange={(v: any) => setSelectedStudent(selectedStudent ? {...selectedStudent, status: v} : null)}><SelectTrigger className="h-12 rounded-xl border-2 font-semibold"><SelectValue /></SelectTrigger><SelectContent className=""><SelectItem value="active" className="font-semibold">ACTIVE</SelectItem><SelectItem value="inactive" className="font-semibold">INACTIVE</SelectItem><SelectItem value="suspended" className="font-semibold">SUSPENDED</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter className="mt-8"><Button onClick={handleEditStudent} className="w-full bg-admin-seaBlue text-white h-14 rounded-2xl shadow-lg transition-all hover:scale-[1.02] text-xs font-semibold">COMMIT PROFILE CHANGE</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-[32px] max-w-[320px] text-center p-8 shadow-3xl border-none bg-white sm:max-w-[320px]">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <DialogTitle className="text-base mb-2 uppercase tracking-tight text-gray-800 text-center font-semibold">Confirm Wipe?</DialogTitle>
          <p className="text-gray-400 uppercase text-[8px] tracking-widest mb-8 text-center px-2 leading-relaxed font-semibold">
            This process is final and cannot be reversed by system protocols
          </p>
          <div className="flex flex-col gap-2 w-full">
            <Button 
              onClick={handleDeleteStudent} 
              className="w-full bg-red-500 hover:bg-red-600 text-white h-10 rounded-xl shadow-lg text-[9px] uppercase tracking-widest transition-all font-semibold"
            >
              WIPE SYSTEM DATA
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowDeleteDialog(false)} 
              className="w-full text-gray-400 h-10 rounded-xl uppercase text-[9px] tracking-widest hover:bg-gray-50 font-semibold"
            >
              Abort Process
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminUploadDialog} onOpenChange={setShowAdminUploadDialog}>
        <DialogContent className="rounded-[40px] max-w-lg p-10 border-none shadow-3xl bg-white shadow-3xl"><div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600" /><DialogHeader className="mb-8 text-center"><DialogTitle className="text-lg uppercase text-admin-seaBlue tracking-tight font-semibold">SCM Deploy</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label className="text-[9px] uppercase text-gray-400 font-semibold">Module Category</Label><Select value={adminSelectedMaterialType} onValueChange={(v: any) => setAdminSelectedMaterialType(v)}><SelectTrigger className="h-12 rounded-xl border-2 px-4 font-semibold"><SelectValue /></SelectTrigger><SelectContent className=""><SelectItem value="textbooks" className="font-semibold">Textbook</SelectItem><SelectItem value="videos" className="font-semibold">Video</SelectItem><SelectItem value="pastQuestions" className="font-semibold">Past Question</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><Label className="text-[9px] uppercase text-gray-400 font-semibold">Module Allocation</Label><Select value={adminSelectedCourseId} onValueChange={setAdminSelectedCourseId}><SelectTrigger className="h-12 rounded-xl border-2 px-4 font-semibold"><SelectValue placeholder="Module" /></SelectTrigger><SelectContent className=""><SelectItem value="global-course" className="font-semibold">Global Content</SelectItem>{courses.map(c => <SelectItem key={c.id} value={c.id} className="font-semibold">{c.name}</SelectItem>)}</SelectContent></Select></div></div>
            {adminSelectedCourseId && adminSelectedCourseId !== 'global-course' && (
              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase text-gray-400 font-semibold ml-1">Assign to Students</Label>
                {students.filter(s => s.courses && s.courses.includes(adminSelectedCourseId)).length > 0 ? (
                  <>
                    <MultiSelect 
                      options={students.filter(s => s.courses && s.courses.includes(adminSelectedCourseId)).map(s => ({ label: s.name, value: s.id }))} 
                      selected={adminSelectedStudentIds} 
                      onChange={setAdminSelectedStudentIds} 
                      placeholder="Select students (Optional)" 
                    />
                    <p className="text-[8px] text-gray-400 font-bold px-1 mt-1">
                      {students.filter(s => s.courses && s.courses.includes(adminSelectedCourseId)).length} Students Enrolled
                    </p>
                  </>
                ) : (
                  <div className="h-12 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 text-gray-400 text-[9px] font-bold uppercase tracking-widest">
                    No Students Enrolled in this Course
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1.5"><Label className="text-[9px] uppercase text-gray-400 font-semibold">Asset Identifier</Label><Input value={adminNewMaterialTitle} onChange={e => setAdminNewMaterialTitle(e.target.value)} className="h-12 rounded-xl border-2 text-sm px-4 font-semibold" placeholder="Document Name..." /></div>
            <div className="space-y-1.5"><Label className="text-[9px] uppercase text-gray-400 font-semibold">Asset Physical Binary</Label><Input type="file" onChange={e => setAdminNewMaterialFile(e.target.files?.[0] || null)} className="h-12 rounded-xl border-2 cursor-pointer file:bg-blue-50 file:text-blue-600 file:border-none file:h-full file:mr-4 px-0 font-semibold" /></div>
          </div>
          <DialogFooter className="mt-10"><Button onClick={handleAdminUpload} className="w-full bg-admin-seaBlue hover:bg-blue-700 text-white h-14 rounded-2xl shadow-xl uppercase tracking-widest text-xs transition-all active:scale-95 font-semibold">EXECUTE DEPLOYMENT</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdminProfileDialog} onOpenChange={setShowAdminProfileDialog}>
        <DialogContent 
          className={cn(
            "rounded-[32px] max-w-[750px] py-10 px-10 shadow-3xl border-none bg-white sm:max-w-[750px] transition-all duration-500",
            !isMobile && (sidebarCollapsed ? "left-[calc(50%+40px)]" : "left-[calc(50%+128px)]"),
            !isMobile && "top-[calc(50%+40px)]",
            "font-semibold"
          )}
        >
          <DialogHeader className="mb-8 text-center">
            <DialogTitle className="text-lg uppercase tracking-tight text-gray-800 text-center font-semibold">Settings</DialogTitle>
            <p className="text-[8px] text-gray-400 uppercase tracking-widest mt-1 font-semibold">Authorized Profile Configuration</p>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-1">
              <Label className="text-[9px] text-gray-400 uppercase tracking-widest ml-1 font-semibold">Admin Name</Label>
              <Input 
                value={adminProfileData.name} 
                onChange={e => setAdminProfileData({...adminProfileData, name: e.target.value})} 
                className="h-10 rounded-xl border-2 text-xs px-4 focus:border-admin-seaBlue transition-all shadow-inner font-semibold" 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] text-gray-400 uppercase tracking-widest ml-1 font-semibold">System ID</Label>
              <Input 
                value={adminProfileData.id} 
                disabled
                className="h-10 rounded-xl border-2 text-xs px-4 bg-gray-50 text-gray-400 cursor-not-allowed font-semibold" 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] text-gray-400 uppercase tracking-widest ml-1 font-semibold">Access Key</Label>
              <Input 
                value={adminProfileData.password} 
                onChange={e => setAdminProfileData({...adminProfileData, password: e.target.value})} 
                className="h-10 rounded-xl border-2 text-xs px-4 focus:border-admin-seaBlue transition-all shadow-inner font-semibold" 
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] text-gray-400 uppercase tracking-widest ml-1 font-semibold">Email Endpoint</Label>
              <Input 
                value={adminProfileData.email} 
                onChange={e => setAdminProfileData({...adminProfileData, email: e.target.value})} 
                className="h-10 rounded-xl border-2 text-xs px-4 focus:border-admin-seaBlue transition-all shadow-inner font-semibold" 
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-[9px] text-gray-400 uppercase tracking-widest ml-1 font-semibold">Contact Number</Label>
              <Input 
                value={adminProfileData.contact} 
                onChange={e => setAdminProfileData({...adminProfileData, contact: e.target.value})} 
                className="h-10 rounded-xl border-2 text-xs px-4 focus:border-admin-seaBlue transition-all shadow-inner font-semibold" 
              />
            </div>
          </div>

          <div className="mt-10 max-w-xs mx-auto">
            <Button 
              onClick={handleUpdateAdminProfile} 
              className="w-full bg-admin-seaBlue hover:bg-blue-700 text-white h-11 rounded-xl shadow-lg uppercase text-[9px] tracking-widest transition-all hover:scale-[1.02] font-semibold"
            >
              SAVE CONFIGURATION
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMarkDialog} onOpenChange={setShowMarkDialog}>
        <DialogContent className="rounded-[40px] max-w-md p-10 border-none shadow-3xl bg-white"><div className="absolute top-0 left-0 w-full h-2 bg-admin-seaBlue" /><DialogHeader className="mb-8 text-center"><DialogTitle className="text-lg uppercase text-admin-seaBlue tracking-tight font-semibold">Academic Review</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="p-4 rounded-3xl bg-gray-50 border-2 border-dashed text-center">
              <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1 font-semibold">Target Profile</p>
              <p className="text-base text-gray-800 uppercase font-semibold">{selectedResult?.studentName}</p>
              <p className="text-[9px] text-blue-600 uppercase tracking-tighter mt-0.5 font-semibold">{selectedResult?.assessmentTitle}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] uppercase text-gray-400 ml-1 font-semibold">Awarded Score (%)</Label>
              <Input type="number" value={markingScore} onChange={e => setMarkingScore(Number(e.target.value))} className="h-14 rounded-2xl border-2 text-xl text-center focus:border-admin-seaBlue transition-all shadow-inner font-semibold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] uppercase text-gray-400 ml-1 font-semibold">System Visibility</Label>
              <Select value={markingStatus} onValueChange={(v: any) => setMarkingScoreStatus(v)}>
                <SelectTrigger className="h-14 rounded-2xl border-2 text-xs font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent className="">
                  <SelectItem value="pending" className="font-semibold">PENDING (HIDDEN)</SelectItem>
                  <SelectItem value="released" className="font-semibold">RELEASED (VISIBLE)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-10"><Button onClick={handleUpdateResult} className="w-full bg-admin-seaBlue hover:bg-blue-700 text-white h-16 rounded-2xl shadow-xl uppercase tracking-widest text-xs transition-all hover:scale-[1.02] font-semibold">COMMIT ACADEMIC RECORD</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
