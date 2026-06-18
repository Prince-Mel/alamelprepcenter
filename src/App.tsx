import { useState, useEffect, Component, type ReactNode } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { LoginScreen } from './sections/LoginScreen';
import { StudentDashboard } from './sections/StudentDashboard';
import { AdminDashboard } from './sections/AdminDashboard';
import { SubAdminDashboard } from './sections/SubAdminDashboard';
import { Toaster } from '@/components/ui/sonner';
import { GraduationCap, LogOut, ShieldAlert, Mail, Phone, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type UserRole = 'student' | 'admin' | 'sub-admin' | null;
export type View = 'login' | 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  password: string;
  email?: string;
  contact?: string;
  created_by?: string;
  admin_code?: string;
  status?: 'active' | 'inactive' | 'suspended';
  details?: any;
}

export interface Student extends User {
  status: 'active' | 'inactive' | 'suspended';
  last_login?: string;
  courses: string[];
}

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`;

function DeactivatedAccountView({ user, onLogout }: { user: User, onLogout: () => void }) {
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreator = async (id: string) => {
      try {
        const res = await fetch(`${API_URL}/api/admins/${id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setCreator(data);
        setLoading(false);
      } catch (err) {
        if (id !== 'ADMIN') {
          fetchCreator('ADMIN'); // Fallback to Master Admin
        } else {
          setLoading(false);
        }
      }
    };

    const creatorId = user.created_by || 'ADMIN';
    fetchCreator(creatorId);
  }, [user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-inter">
      <div className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-3xl text-center border-none relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
        <div className="w-24 h-24 bg-red-50 p-1 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner overflow-hidden border-4 border-red-100">
          <img src="/favicon.png" alt="Logo" className="w-full h-full object-cover rounded-full scale-[1.5] grayscale-[0.5] opacity-80" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-tight mb-2">Your Account Has Been Deactivated</h2>
        <p className="text-gray-400 uppercase text-[10px] tracking-[0.2em] mb-10 font-semibold">Please Contact Your Admin</p>

        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-300 italic text-sm animate-pulse">
            Establishing secure connection...
          </div>
        ) : (
          <div className="bg-gray-50 rounded-[32px] p-8 mb-8 space-y-4 text-left border-2 border-dashed border-gray-200 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border"><UserIcon className="w-5 h-5 text-gray-400" /></div>
              <div><p className="text-[9px] text-gray-400 uppercase font-bold">Admin Name</p><p className="text-sm font-semibold text-gray-800">{creator?.name || 'Master Administrator'}</p></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border"><Mail className="w-5 h-5 text-gray-400" /></div>
              <div><p className="text-[9px] text-gray-400 uppercase font-bold">Email Address</p><p className="text-sm font-semibold text-gray-800">{creator?.email || 'System Support Default'}</p></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border"><Phone className="w-5 h-5 text-gray-400" /></div>
              <div><p className="text-[9px] text-gray-400 uppercase font-bold">Contact Number</p><p className="text-sm font-semibold text-gray-800">{creator?.contact || 'System Support Default'}</p></div>
            </div>
          </div>
        )}

        <Button onClick={onLogout} variant="ghost" className="w-full h-12 rounded-2xl text-gray-400 uppercase text-xs tracking-widest font-semibold hover:bg-gray-50">
          <LogOut className="w-4 h-4 mr-2" /> Exit System
        </Button>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100 font-inter">
            <h2 className="text-xl text-red-600 mb-4 font-semibold">Something went wrong</h2>
            <p className="text-gray-600 mb-6 text-sm font-medium">The application encountered an error. Please try clearing your local storage or contact support.</p>
            <pre className="bg-gray-100 p-4 rounded-lg text-[10px] overflow-auto max-h-40 mb-6 font-medium">{this.state.error?.toString()}</pre>
            <button
              onClick={() => { sessionStorage.clear(); window.location.reload(); }}
              className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors text-xs uppercase tracking-widest"
            >
              Reset Application Data
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const navigate = useNavigate();
  
  const [currentUser, setCurrentUser] = useState<Student | User | null>(() => {
    try {
      const savedUser = sessionStorage.getItem('alamel_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error("Failed to parse user from sessionStorage", e);
      return null;
    }
  });

  const handleLogin = (user: Student | User) => {
    const now = new Date().toLocaleString();
    const updatedUser = { ...user, last_login: now };

    setCurrentUser(updatedUser);
    sessionStorage.setItem('alamel_user', JSON.stringify(updatedUser));

    if (user.role === 'admin' || user.role === 'sub-admin') {
      navigate('/admin');
    } else {
      navigate('/student');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('alamel_user');
    navigate('/login');
  };

  const handleUpdateUser = (updatedUser: User | Student, oldId?: string) => {
    setCurrentUser(updatedUser);
    sessionStorage.setItem('alamel_user', JSON.stringify(updatedUser));
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-alamel-lightGray relative font-inter">
        <Toaster position="top-right" richColors />

        {currentUser?.status === 'inactive' ? (
          <DeactivatedAccountView user={currentUser} onLogout={handleLogout} />
        ) : (
          <Routes>
            <Route path="/login" element={
              !currentUser ? <LoginScreen onLogin={handleLogin} /> : <Navigate to={currentUser.role === 'student' ? '/student' : '/admin'} replace />
            } />

            <Route path="/student/:tab?" element={
              currentUser && currentUser.role === 'student' ? (
                <StudentDashboard
                  user={currentUser as Student}
                  onLogout={handleLogout}
                  onSwitchToAdmin={() => navigate('/admin')}
                  onUpdateUser={handleUpdateUser}
                />
              ) : <Navigate to="/login" replace />
            } />

            <Route path="/admin/:tab?" element={
              currentUser && (currentUser.role === 'admin' || currentUser.role === 'sub-admin') ? (
                currentUser.id.toUpperCase() === 'ADMIN' ? (
                  <AdminDashboard
                    user={currentUser}
                    onLogout={handleLogout}
                    onSwitchToStudent={() => navigate('/student')}
                    onUpdateUser={handleUpdateUser}
                  />
                ) : (
                  <SubAdminDashboard
                    user={currentUser}
                    onLogout={handleLogout}
                    onSwitchToStudent={() => navigate('/student')}
                    onUpdateUser={handleUpdateUser}
                  />
                )
              ) : <Navigate to="/login" replace />
            } />

            <Route path="*" element={<Navigate to={currentUser ? (currentUser.role === 'student' ? '/student' : '/admin') : '/login'} replace />} />
          </Routes>
        )}
        <SpeedInsights />
      </div>
    </ErrorBoundary>
  );
}

export default App;
