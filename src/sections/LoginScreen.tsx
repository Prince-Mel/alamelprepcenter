import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, EyeOff, GraduationCap, Lock, User as UserIcon, IdCard, Phone, Mail, BookOpen, Briefcase } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { User, Student } from '../App';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`;

interface LoginScreenProps {
  onLogin: (user: User | Student) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<'student' | 'admin'>('student');
  
  // Form fields
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [courses, setCourses] = useState('');
  const [purpose, setPurpose] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    const registrationData = {
      name: name.toUpperCase(),
      phone,
      email: email || (role === 'student' ? 'N/A' : ''),
      role,
      details: role === 'student' ? {
        educationLevel,
        studentClass,
        coursesToPrepare: courses.split(',').map(c => c.trim()),
      } : {
        purposeOfRegistration: purpose,
      }
    };

    try {
      const response = await fetch(`${API_URL}/api/reg-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit request');
      }

      toast.success('Registration request submitted! Please wait for admin approval.');
      setIsRegistering(false);
    } catch (error: any) {
      toast.error(error.message || 'Network error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
    
    // Clear form
    setName('');
    setPhone('');
    setEmail('');
    setEducationLevel('');
    setStudentClass('');
    setCourses('');
    setPurpose('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const trimmedId = id.trim();
    const trimmedPassword = password.trim();

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: trimmedId, password: trimmedPassword })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Invalid credentials');
      }

      const userToLogin = await response.json();
      toast.success(`Welcome back, ${userToLogin.name}!`);
      onLogin(userToLogin);
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center font-opensans relative overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/login-background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/20 z-0" />

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-20 p-4 lg:p-12 h-full">
        
        {/* Left Side - Branding */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left text-white drop-shadow-lg animate-slide-in-up">
          <div className="w-24 h-24 lg:w-40 lg:h-40 bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.3)] overflow-hidden border-4 border-alamel-aquamarine relative">
            <img 
              src="/favicon.png" 
              alt="AlaMel Logo" 
              className="w-full h-full object-cover rounded-full scale-[1.7] object-center" 
            />
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-2 drop-shadow-md">AlaMel</h1>
          <p className="text-lg lg:text-2xl font-bold text-white/90 drop-shadow-sm">
            Your Best Place To Prepare
          </p>
        </div>

        {/* Right Side - Form */}
        <Card className="w-full max-w-md glass-card animate-slide-in-up shadow-2xl border-white/30 p-4 lg:p-6 backdrop-blur-xl bg-white/90 lg:bg-white/80">
          <CardHeader className="space-y-1 mb-4">
            <CardTitle className="text-xl lg:text-2xl text-center text-alamel-darkBlue font-bold uppercase tracking-tight">
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="text-center text-alamel-darkGray text-[10px] lg:text-xs uppercase tracking-widest font-semibold">
              {isRegistering 
                ? 'Fill in the form to request an account' 
                : 'Enter your credentials to access your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isRegistering ? (
              <form onSubmit={handleSubmit} className="space-y-4 font-semibold">
                <div className="space-y-1.5">
                  <Label htmlFor="id" className="text-alamel-darkBlue text-[10px] uppercase tracking-widest ml-1 font-semibold">
                    Student/Admin ID
                  </Label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-alamel-blue" />
                    <Input id="id" placeholder="Enter your ID" value={id} onChange={(e) => setId(e.target.value)} className="pl-10 h-11 border-2 rounded-xl font-semibold text-sm bg-white/50 focus:bg-white transition-colors" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-alamel-darkBlue text-[10px] uppercase tracking-widest ml-1 font-semibold">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-alamel-blue" />
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11 border-2 rounded-xl font-semibold text-sm bg-white/50 focus:bg-white transition-colors" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-alamel-blue transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full h-12 bg-alamel-blue hover:bg-alamel-darkBlue text-white text-xs uppercase tracking-widest rounded-xl mt-4 font-semibold shadow-lg transition-all duration-300 transform hover:scale-[1.02]">
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>

                <div className="text-center pt-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                    Don't have an account?{' '}
                    <button type="button" onClick={() => setIsRegistering(true)} className="text-alamel-blue hover:underline font-bold">
                      Register Now
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4 max-h-[60vh] overflow-y-auto px-1 font-semibold custom-scrollbar">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest ml-1 font-semibold">I am a...</Label>
                  <Select value={role} onValueChange={(v: any) => setRole(v)}>
                    <SelectTrigger className="h-11 border-2 rounded-xl font-semibold text-xs bg-white/50"><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent><SelectItem value="student" className="font-semibold text-xs">Student</SelectItem><SelectItem value="admin" className="font-semibold text-xs">Admin</SelectItem></SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest ml-1 font-semibold">Full Name</Label><Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 border-2 rounded-xl font-semibold text-sm bg-white/50" required /></div>
                <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest ml-1 font-semibold">Phone Number</Label><Input type="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 border-2 rounded-xl font-semibold text-sm bg-white/50" required /></div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest ml-1 font-semibold">
                    Email Address {role === 'student' && <span className="text-gray-400 font-normal italic">(Optional)</span>}
                  </Label>
                  <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 border-2 rounded-xl font-semibold text-sm bg-white/50" required={role === 'admin'} />
                </div>

                {role === 'student' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest ml-1 font-semibold">Education Level</Label><Input placeholder="Tertiary" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} className="h-11 border-2 rounded-xl font-semibold text-sm bg-white/50" required /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest ml-1 font-semibold">Class</Label><Input placeholder="100L" value={studentClass} onChange={(e) => setStudentClass(e.target.value)} className="h-11 border-2 rounded-xl font-semibold text-sm bg-white/50" required /></div>
                    </div>
                    <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest ml-1 font-semibold">Courses to Prepare</Label><Input placeholder="Math, English, Physics" value={courses} onChange={(e) => setCourses(e.target.value)} className="h-11 border-2 rounded-xl font-semibold text-sm bg-white/50" required /></div>
                  </>
                ) : (
                  <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest ml-1 font-semibold">Purpose</Label><Input placeholder="Reason for admin access" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="h-11 border-2 rounded-xl font-semibold text-sm bg-white/50" required /></div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full h-12 bg-alamel-blue hover:bg-alamel-darkBlue text-white text-xs uppercase tracking-widest rounded-xl mt-4 font-semibold shadow-lg transition-all duration-300">
                  {isLoading ? 'Processing...' : 'Submit Request'}
                </Button>

                <button type="button" onClick={() => setIsRegistering(false)} className="w-full text-[9px] uppercase tracking-widest text-gray-500 mt-2 hover:text-alamel-blue transition-colors">Back to Login</button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
