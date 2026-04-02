import { useState, useEffect, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BookOpen,
  Home,
  Calendar as CalendarIcon,
  Bell,
  Settings,
  LogOut,
  User as UserIcon,
  Shield,
  Menu,
  ChevronRight,
  ChevronLeft,
  X,
  Clock,
  GraduationCap,
  Search,
  ClipboardList,
  CheckCircle,
  Trophy,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { CourseMaterials } from './CourseMaterials';
import { QuizInterface } from './QuizInterface';
import { cn } from '@/lib/utils';
import type { Student } from '../App';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`;

interface StudentDashboardProps {
  user: Student;
  onLogout: () => void;
  onSwitchToAdmin: () => void;
  onUpdateUser: (updatedUser: Student, oldId?: string) => void;
}

interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  color: string;
  image: string;
}

interface Assessment {
  id: string;
  course_id: string;
  title: string;
  type: 'quiz' | 'examination' | 'assignment';
  mode: 'objectives' | 'written' | 'integrated' | 'file_upload';
  submission_mode: 'online' | 'file';
  duration: number;
  start_date?: string;
  end_date?: string;
  structured_questions: any[];
  assigned_student_ids?: string[];
}

interface CalendarEvent {
  id: string;
  type: 'assessment' | 'announcement';
  title: string;
  date: Date;
  courseName?: string;
  details: string;
}

type ViewMode = 'home' | 'courses' | 'materials' | 'quiz' | 'calendar' | 'announcements' | 'settings' | 'assessment-list';
type MaterialType = 'textbooks' | 'videos' | 'quiz' | 'examination' | 'pastQuestions' | 'assignments';

export function StudentDashboard({ user, onLogout, onUpdateUser }: StudentDashboardProps) {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name,
    id: user.id,
    password: user.password
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);

  // Fetch Data from MySQL
  const fetchData = async () => {
    console.log(`Fetching data for Student ID: ${user.id}`);
    try {
      const [coursesRes, resultsRes, assessmentsRes, announcementsRes, enrollmentRes] = await Promise.all([
        fetch(`${API_URL}/api/courses`),
        fetch(`${API_URL}/api/results/${user.id}`),
        fetch(`${API_URL}/api/assessments`),
        fetch(`${API_URL}/api/announcements/${user.id}`),
        fetch(`${API_URL}/api/enrollments/${user.id}`)
      ]);

      if (coursesRes.ok) setCourses(await coursesRes.json());
      if (resultsRes.ok) setStudentResults(await resultsRes.json());
      if (assessmentsRes.ok) setAssessments(await assessmentsRes.json());
      if (announcementsRes.ok) setAnnouncements(await announcementsRes.json());
      if (enrollmentRes.ok) {
        const enrollments = await enrollmentRes.json();
        console.log(`Successfully retrieved ${enrollments.length} enrollments for ${user.id}:`, enrollments);
        setEnrolledCourseIds(enrollments.map((e: any) => e.course_id));
      }
    } catch (error) {
      console.error("Critical Data Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [user.id]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Derived Data
  const userCourses = courses.filter(c => enrolledCourseIds.includes(c.id));
  const filteredUserCourses = useMemo(() => {
    return userCourses.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [userCourses, searchQuery]);

  const eventsByDate = useMemo(() => {
    const events = new Map<string, CalendarEvent[]>();
    assessments.forEach(asmt => {
      if (asmt.end_date && (asmt.assigned_student_ids?.includes(user.id) || !asmt.assigned_student_ids)) {
        const date = parseISO(asmt.end_date);
        const key = format(date, 'yyyy-MM-dd');
        if (!events.has(key)) events.set(key, []);
        events.get(key)?.push({ id: asmt.id, type: 'assessment', title: asmt.title, date, details: `Due: ${format(date, 'p')}` });
      }
    });
    announcements.forEach(ann => {
      const date = parseISO(ann.timestamp);
      const key = format(date, 'yyyy-MM-dd');
      if (!events.has(key)) events.set(key, []);
      events.get(key)?.push({ id: ann.id, type: 'announcement', title: 'Announcement', date, details: ann.message });
    });
    return events;
  }, [assessments, announcements, user.id]);

  const eventDays = useMemo(() => {
    return Array.from(eventsByDate.keys()).map(dateStr => parseISO(dateStr));
  }, [eventsByDate]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate.get(key) || [];
  }, [selectedDate, eventsByDate]);

  // Handlers
  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setViewMode('materials');
    setSelectedMaterial(null);
  };

  const handleMaterialSelect = (type: MaterialType) => {
    setSelectedMaterial(type);
    if (['quiz', 'examination', 'assignments'].includes(type)) {
      const typeKey = type === 'assignments' ? 'assignment' : type;
      const completedIds = studentResults.map(r => r.assessment_id);
      const relevant = assessments.filter(a =>
        a.course_id === selectedCourse?.id &&
        a.type === typeKey &&
        !completedIds.includes(a.id) &&
        (!a.assigned_student_ids || a.assigned_student_ids.includes(user.id))
      );
      setFilteredAssessments(relevant);
      setViewMode('assessment-list');
    }
  };

  const handleAssessmentComplete = async (score?: any, answers?: any, file?: any) => {
    if (!activeAssessment) return;
    const result = {
      id: `R${Date.now()}`,
      student_id: user.id,
      assessment_id: activeAssessment.id,
      score: score?.percentage || 0,
      correct_answers: score?.correct || 0,
      total_questions: score?.total || 0,
      status: 'pending',
      answers,
      student_file: file
    };

    // Instantly append to state to prevent race conditions that let students retake assessments
    setStudentResults(prev => [result, ...prev]);

    try {
      await fetch(`${API_URL}/api/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });
      fetchData();
      toast.success('Submitted successfully');
    } catch (e) {
      toast.error('Submission failed');
    }
    setViewMode('materials');
    setActiveAssessment(null);
  };

  const handleUpdateProfile = async () => {
    try {
      const updated = {
        ...user,
        name: profileData.name.toUpperCase(),
        password: profileData.password
      };
      const response = await fetch(`${API_URL}/api/students/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (response.ok) {
        onUpdateUser(updated, user.id);
        setShowProfileDialog(false);
        toast.success('Profile updated');
      }
    } catch (e) { toast.error('Update failed'); }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-blue-600 font-semibold animate-pulse uppercase tracking-widest text-lg">Loading System...</div>;

  return (
    <div className="min-h-screen flex bg-gray-50 relative overflow-x-hidden font-arial">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-white shadow-xl z-50 transition-all duration-500 ${isMobile ? (mobileMenuOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full') : (sidebarCollapsed ? 'w-20' : 'w-64')}`}>
        <div className="h-20 flex items-center justify-between px-6 border-b">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3 shadow-md overflow-hidden border border-gray-100">
              <img src="/favicon.png" alt="AlaMel Logo" className="w-full h-full object-cover rounded-lg scale-[1.5]" />
            </div>
            {!sidebarCollapsed && <span className="text-lg text-gray-800 uppercase tracking-tight font-semibold">AlaMel</span>}
          </div>
          {isMobile ? (
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="text-gray-400"><X className="w-5 h-5" /></Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-gray-400 hover:text-blue-600 hidden lg:flex">
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[calc(100vh-160px)] py-4">
          <div className="px-3 space-y-1">
            {[
              { id: 'home', icon: Home, label: 'Home' },
              { id: 'courses', icon: BookOpen, label: 'My Courses' },
              { id: 'calendar', icon: CalendarIcon, label: 'Calendar' },
              { id: 'announcements', icon: Bell, label: 'Updates' },
              { id: 'settings', icon: Settings, label: 'Settings' }
            ]
              .filter(item => {
                if (user.status === 'suspended') {
                  return ['home', 'courses', 'calendar', 'announcements'].includes(item.id);
                }
                return true;
              })
              .map(item => (
                <button
                  key={item.id}
                  onClick={() => { setViewMode(item.id as any); if (isMobile) setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${viewMode === item.id ? 'bg-blue-50 text-blue-600 shadow-sm font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <item.icon className="w-5 h-5" />
                  {!sidebarCollapsed && <span className="text-xs uppercase font-semibold">{item.label}</span>}
                </button>
              ))}
          </div>
        </ScrollArea>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50/50">
          <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all">
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && <span className="text-xs uppercase font-semibold">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-500 ${isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-20' : 'ml-64')}`}>
        <header className="h-20 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between border-b shadow-sm">
          <div className="flex items-center gap-4">
            {isMobile && <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="text-gray-800 font-semibold"><Menu className="w-6 h-6" /></Button>}
            <h1 className="text-lg text-gray-800 uppercase tracking-tight font-semibold">{viewMode}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Student</p>
              <p className="text-sm text-gray-800 font-semibold">{user.name}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer border-2 border-blue-100 hover:border-blue-400 transition-all shadow-md">
                  <AvatarFallback className="bg-blue-600 text-white font-semibold text-xs uppercase">{user.name[0]}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl">
                <DropdownMenuLabel className="text-[10px] text-gray-400 uppercase font-semibold">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowProfileDialog(true)} className="font-semibold text-xs uppercase"><UserIcon className="mr-2 h-4 w-4" /> Profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600 font-semibold text-xs uppercase"><LogOut className="mr-2 h-4 w-4" /> Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
            {viewMode === 'home' && (
              <div className="space-y-8 animate-fade-in font-semibold">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-xl lg:text-2xl font-semibold mb-2">Welcome back, {user.name.split(' ')[0]}!</h2>
                    <p className="text-blue-100 max-w-md text-sm">You have {userCourses.length} active courses and {assessments.length} pending tasks.</p>
                  </div>
                  <img src="/favicon.png" className="absolute -right-10 -bottom-10 w-48 h-48 opacity-20 rotate-12 grayscale" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Card className="lg:col-span-2 border-none shadow-xl rounded-3xl p-4">
                    <CardHeader><CardTitle className="text-lg font-semibold flex items-center gap-2 uppercase tracking-tight"><BookOpen className="text-blue-600" /> Recent Courses</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userCourses.length > 0 ? userCourses.slice(0, 4).map(course => (
                        <div key={course.id} onClick={() => handleCourseSelect(course)} className="group cursor-pointer p-4 rounded-2xl border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 transition-all shadow-sm bg-white">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${course.color} mb-4 flex items-center justify-center text-white shadow-md`}>
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-tight">{course.name}</h3>
                          <p className="text-[10px] text-gray-400 uppercase mt-1">{course.code}</p>
                        </div>
                      )) : (
                        <div className="col-span-full py-16 text-center">
                          <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No Course Has Been Assigned yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-xl rounded-3xl p-4">
                    <CardHeader><CardTitle className="text-lg font-semibold flex items-center gap-2 uppercase tracking-tight"><Trophy className="text-emerald-500" /> Recent Results</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {studentResults.filter(r => r.status === 'released').length > 0 ? studentResults.filter(r => r.status === 'released').slice(0, 5).map(res => (
                        <div key={res.id} className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm group-hover:scale-110 transition-transform">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-800 font-bold uppercase tracking-tight line-clamp-1">{res.assessment_title}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{res.course_name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {res.show_score ? (
                              <>
                                <p className={cn(
                                  "text-lg font-black tracking-tighter",
                                  res.score >= 70 ? 'text-emerald-600' : res.score >= 50 ? 'text-blue-600' : 'text-rose-600'
                                )}>{res.score}%</p>
                                <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Grade</p>
                              </>
                            ) : (
                              <div className="flex flex-col items-end">
                                <div className="flex gap-0.5">
                                  {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-200" />)}
                                </div>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Hidden</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )) : (
                        <div className="py-16 text-center">
                          <Trophy className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">No Results Have Been Released yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {viewMode === 'courses' && (
              <div className="space-y-6 animate-fade-in font-semibold">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Search my courses..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-12 rounded-2xl h-12 bg-white border-2 border-blue-50 focus-visible:ring-blue-500 shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredUserCourses.length > 0 ? filteredUserCourses.map(course => (
                    <Card key={course.id} className="group overflow-hidden border-none shadow-lg rounded-3xl hover:shadow-xl transition-all cursor-pointer" onClick={() => handleCourseSelect(course)}>
                      <div className="h-32 relative">
                        <img src={course.image} alt={course.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />

                        {/* Dynamic Subject Name on Placeholder */}
                        {course.image === '/course-placeholder.svg' && (
                          <div className="absolute inset-0 flex flex-col items-center justify-start pt-8 px-2 z-20 pointer-events-none">
                            <h4 className="text-[22px] font-black text-white uppercase tracking-tighter text-center leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                              {course.name}
                            </h4>
                            <div className="mt-auto mb-2 flex flex-col items-center">
                              <p className="text-[6px] font-black text-white/90 uppercase tracking-[0.2em] italic drop-shadow-sm">
                                Student Edition
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                        <div className="absolute bottom-4 left-4 text-white">
                          <p className="text-[10px] uppercase tracking-widest text-blue-200 font-semibold">{course.code}</p>
                          <h3 className="text-lg font-semibold uppercase tracking-tight">{course.name}</h3>
                        </div>
                      </div>
                      <CardContent className="p-6">
                        <p className="text-xs text-gray-500 font-semibold mb-4 flex items-center gap-2"><UserIcon className="w-4 h-4" /> {course.instructor}</p>
                        <Button onClick={(e) => { e.stopPropagation(); handleCourseSelect(course); }} className="w-full bg-blue-600 group-hover:bg-blue-700 rounded-xl font-semibold text-xs uppercase tracking-widest">Open Course</Button>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="col-span-full py-32 text-center animate-scale-in">
                      <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-200">
                        <BookOpen className="w-12 h-12" />
                      </div>
                      <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest italic">No Course Has Been Assigned yet</h3>
                      <p className="text-xs text-gray-300 uppercase tracking-[0.2em] mt-4 font-bold">Please check back later or contact your administrator</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {viewMode === 'announcements' && (
              <div className="max-w-3xl mx-auto space-y-6 animate-fade-in font-arial">
                <h2 className="text-2xl font-black text-blue-700 uppercase tracking-tight italic mb-10 border-l-8 border-blue-600 pl-6">System Updates</h2>
                {announcements.length > 0 ? announcements.map(ann => (
                  <Card key={ann.id} className="p-8 rounded-[32px] border-none shadow-xl bg-white hover:shadow-2xl transition-all duration-300 group">
                    <div className="flex gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                        <Bell className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-base text-gray-800 font-bold leading-relaxed mb-3">{ann.message}</p>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-orange-400" />
                          <p className="text-[10px] text-orange-400 uppercase font-black tracking-widest">{format(parseISO(ann.timestamp), 'PPpp')}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                )) : (
                  <div className="py-32 text-center animate-scale-in">
                    <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-200">
                      <Bell className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest italic">No Updates Have Been Posted yet</h3>
                    <p className="text-xs text-gray-300 uppercase tracking-[0.2em] mt-4 font-bold">Your notification center is currently clear</p>
                  </div>
                )}
              </div>
            )}

            {viewMode === 'materials' && selectedCourse && (
              <CourseMaterials course={selectedCourse} selectedMaterial={selectedMaterial} onMaterialSelect={handleMaterialSelect} onBack={() => setViewMode('courses')} user={user} results={studentResults} assessments={assessments} />
            )}

            {viewMode === 'assessment-list' && selectedCourse && (
              <div className="space-y-10 animate-fade-in max-w-5xl mx-auto font-arial">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <Button variant="ghost" onClick={() => setViewMode('materials')} className="text-gray-400 hover:text-blue-600 mb-4 font-black text-[10px] uppercase tracking-[0.2em] p-0 h-auto group">
                      <ChevronRight className="rotate-180 w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Back to Materials
                    </Button>
                    <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight italic flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-100">
                        <ClipboardList className="w-6 h-6 text-white" />
                      </div>
                      Available {selectedMaterial}s
                    </h2>
                  </div>
                  <div className="bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    <span className="text-blue-700 font-black text-xs uppercase tracking-widest">{filteredAssessments.length} Active Tasks</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filteredAssessments.map((asmt, idx) => (
                    <Card key={asmt.id} className="group overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-500 rounded-[40px] bg-white animate-slide-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                      <div className="h-4 bg-gradient-to-r from-blue-600 to-indigo-600" />
                      <div className="p-8 lg:p-10">
                        <div className="flex justify-between items-start mb-6">
                          <Badge className="bg-blue-50 text-blue-600 border-none px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest">
                            {asmt.type}
                          </Badge>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="border-gray-100 text-gray-400 font-black text-[9px] uppercase tracking-widest">
                              {asmt.mode.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>

                        <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-4 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {asmt.title}
                        </h3>

                        <div className="space-y-4 mb-10">
                          <div className="flex items-center gap-3 text-gray-500">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                              <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Time Limit</p>
                              <p className="text-sm font-bold text-gray-700">{asmt.duration} Minutes</p>
                            </div>
                          </div>
                          {asmt.end_date && (
                            <div className="flex items-center gap-3 text-gray-500">
                              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                                <CalendarIcon className="w-5 h-5 text-rose-500" />
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Deadline</p>
                                <p className="text-sm font-bold text-rose-600">{format(parseISO(asmt.end_date), 'MMM d, p')}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() => { setActiveAssessment(asmt); setViewMode('quiz'); }}
                          className="w-full h-16 bg-gray-900 hover:bg-blue-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group/btn"
                        >
                          Access Assessment <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
                        </Button>
                      </div>
                    </Card>
                  ))}

                  {filteredAssessments.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight italic">All Clear!</h3>
                      <p className="text-gray-500 font-bold text-sm uppercase tracking-widest mt-2">No pending {selectedMaterial}s for this course.</p>
                    </div>
                  )}
                </div>

                {/* ─── History Section ─── */}
                {(() => {
                  const typeKey = selectedMaterial === 'assignments' ? 'assignment' : selectedMaterial || '';
                  const completedForType = studentResults.filter(r =>
                    assessments.find(a => a.id === r.assessment_id && a.course_id === selectedCourse.id && a.type === typeKey)
                  );
                  if (completedForType.length === 0) return null;
                  return (
                    <div className="mt-16 animate-fade-in">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm">
                          <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight italic">
                            Submission History
                          </h3>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                            {typeKey.charAt(0).toUpperCase() + typeKey.slice(1)} Records — {selectedCourse.name}
                          </p>
                        </div>
                        <div className="ml-auto bg-emerald-50 px-5 py-2 rounded-2xl border border-emerald-100">
                          <span className="text-emerald-700 font-black text-xs uppercase tracking-widest">{completedForType.length} Submitted</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {completedForType.map((res: any) => {
                          const isReleased = !!res.show_score;
                          const score = res.score ?? 0;
                          const scoreColor = score >= 70 ? 'text-emerald-600' : score >= 50 ? 'text-blue-600' : 'text-rose-600';
                          const scoreBg = score >= 70 ? 'bg-emerald-50 border-emerald-100' : score >= 50 ? 'bg-blue-50 border-blue-100' : 'bg-rose-50 border-rose-100';
                          return (
                            <Card key={res.id} className="group overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 rounded-[32px] bg-white">
                              <div className={`h-2 ${isReleased ? (score >= 70 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : score >= 50 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-rose-500 to-pink-500') : 'bg-gradient-to-r from-gray-300 to-gray-400'}`} />
                              <div className="p-6">
                                {/* Title */}
                                <div className="flex items-start justify-between gap-3 mb-5">
                                  <div className="min-w-0">
                                    <p className="text-xs text-blue-600 font-black uppercase tracking-widest mb-1">{typeKey}</p>
                                    <h4 className="text-base font-black text-gray-800 uppercase tracking-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                                      {res.assessment_title}
                                    </h4>
                                  </div>
                                  {isReleased ? (
                                    <div className={`shrink-0 min-w-[72px] text-center px-3 py-2 rounded-2xl border ${scoreBg}`}>
                                      <p className={`text-2xl font-black tracking-tighter ${scoreColor}`}>{score}%</p>
                                      <p className={`text-[8px] font-black uppercase tracking-widest ${scoreColor} opacity-70`}>Grade</p>
                                    </div>
                                  ) : (
                                    <div className="shrink-0 min-w-[72px] text-center px-3 py-2 rounded-2xl border bg-gray-50 border-gray-100">
                                      <div className="flex justify-center gap-0.5 mb-1">
                                        {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300" />)}
                                      </div>
                                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Pending</p>
                                    </div>
                                  )}
                                </div>

                                {/* Status & Feedback */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Status</span>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${res.status === 'released' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-50 text-amber-500'}`}>
                                      {res.status === 'released' ? 'Graded & Released' : 'Pending Review'}
                                    </span>
                                  </div>
                                  {isReleased && res.feedback && (
                                    <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Instructor Feedback</p>
                                      <p className="text-xs text-gray-600 font-medium leading-relaxed italic line-clamp-3">{res.feedback}</p>
                                    </div>
                                  )}
                                  {!isReleased && (
                                    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-2">
                                      <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                      <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Awaiting instructor evaluation</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Quiz Overlay */}
            {viewMode === 'quiz' && activeAssessment && selectedCourse && (
              <div className="fixed inset-0 z-[100] bg-white font-semibold overflow-y-auto">
                <QuizInterface
                  assessment={activeAssessment}
                  course={selectedCourse}
                  onComplete={handleAssessmentComplete}
                  onCancel={() => {
                    setViewMode('materials');
                    setActiveAssessment(null);
                  }}
                />
              </div>
            )}

            {/* Calendar View */}
            {viewMode === 'calendar' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in font-arial">
                <Card className="lg:col-span-1 rounded-3xl border-none shadow-xl p-6 bg-white">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-2xl font-semibold w-full"
                    modifiers={{ event: eventDays }}
                    modifiersClassNames={{
                      event: "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-blue-600 after:rounded-full"
                    }}
                  />
                  <div className="mt-8 pt-8 border-t space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Legend</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                      <span className="text-xs font-bold text-gray-600 uppercase">System Events</span>
                    </div>
                  </div>
                </Card>
                <Card className="lg:col-span-2 rounded-3xl border-none shadow-xl p-8 bg-white">
                  <CardHeader className="p-0 mb-8 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-black uppercase tracking-tight italic text-blue-700">
                        {selectedDate ? format(selectedDate, 'MMMM do, yyyy') : 'Select a date'}
                      </CardTitle>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Scheduled Activities</p>
                    </div>
                    <div className="bg-blue-50 px-4 py-2 rounded-xl">
                      <span className="text-blue-600 font-black text-xs uppercase">{selectedDateEvents.length} Events</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    {selectedDateEvents.length > 0 ? selectedDateEvents.map(ev => (
                      <div key={ev.id} className="p-6 rounded-[24px] bg-gray-50/50 border-2 border-transparent hover:border-blue-500 hover:bg-white transition-all duration-300 group flex justify-between items-center shadow-sm">
                        <div className="flex gap-6 items-center">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${ev.type === 'assessment' ? 'bg-red-500 text-white shadow-red-200' : 'bg-blue-600 text-white shadow-blue-200'}`}>
                            {ev.type === 'assessment' ? <Clock className="w-6 h-6 stroke-[2.5px]" /> : <Bell className="w-6 h-6 stroke-[2.5px]" />}
                          </div>
                          <div>
                            <p className="text-base font-black text-gray-900 uppercase tracking-tight mb-1">{ev.title}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-md">{ev.details}</p>
                          </div>
                        </div>
                        <Button onClick={() => toast.info('Event details feature coming soon')} variant="ghost" size="icon" className="text-gray-300 group-hover:text-blue-600 transition-colors">
                          <ChevronRight className="w-6 h-6" />
                        </Button>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center animate-scale-in">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-200">
                          <CalendarIcon className="w-10 h-10" />
                        </div>
                        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">No Events Scheduled</h4>
                        <p className="text-[10px] text-gray-300 uppercase tracking-widest mt-2">Check another date for activities</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="rounded-3xl max-w-md p-8 font-semibold">
          <DialogHeader><DialogTitle className="text-xl font-semibold uppercase tracking-tight">Profile Settings</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest font-semibold ml-1">Full Name</Label><Input value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} className="h-11 rounded-xl border-2 font-semibold text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest font-semibold ml-1">Identity ID</Label><Input value={profileData.id} disabled className="h-11 border-2 rounded-xl bg-gray-50 text-gray-400 font-semibold text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest font-semibold ml-1">New Access Key</Label><Input type="password" value={profileData.password} onChange={e => setProfileData({ ...profileData, password: e.target.value })} className="h-11 rounded-xl border-2 font-semibold text-sm" /></div>

            <div className="p-4 bg-blue-50 rounded-2xl border-2 border-dashed border-blue-100 mt-6">
              <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest leading-relaxed text-center">
                Grades are released by the administrator after evaluation.
              </p>
            </div>
          </div>
          <DialogFooter className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => setShowProfileDialog(false)} className="flex-1 h-11 rounded-xl font-semibold text-xs uppercase tracking-widest">Cancel</Button>
            <Button onClick={handleUpdateProfile} className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs uppercase tracking-widest shadow-lg">Save Config</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
