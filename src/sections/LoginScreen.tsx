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

const API_URL = `http://${window.location.hostname}:5001`;

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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fluid background animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    let animationId: number;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
    }> = [];

    // Create particles
    for (let i = 0; i < 25; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 80 + 40,
        color: i % 2 === 0 ? 'rgba(0, 112, 192, 0.15)' : 'rgba(0, 255, 194, 0.12)',
      });
    }

    const animate = () => {
      time += 0.01;
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      gradient.addColorStop(0, '#0070c0');
      gradient.addColorStop(0.5, '#00b0f0');
      gradient.addColorStop(1, '#00ffc2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Update and draw particles
      particles.forEach((particle, i) => {
        // Mouse influence
        const dx = mousePos.x - particle.x;
        const dy = mousePos.y - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          particle.vx -= dx * 0.0001;
          particle.vy -= dy * 0.0001;
        }

        particle.x += particle.vx;
        particle.y += particle.vy;

        // Boundary check
        if (particle.x < -particle.radius) particle.x = canvas.offsetWidth + particle.radius;
        if (particle.x > canvas.offsetWidth + particle.radius) particle.x = -particle.radius;
        if (particle.y < -particle.radius) particle.y = canvas.offsetHeight + particle.radius;
        if (particle.y > canvas.offsetHeight + particle.radius) particle.y = -particle.radius;

        // Draw blob
        ctx.beginPath();
        for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
          const r = particle.radius + Math.sin(angle * 3 + time + i) * 10;
          const x = particle.x + Math.cos(angle) * r;
          const y = particle.y + Math.sin(angle) * r;
          if (angle === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = particle.color;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [mousePos]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

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
    <div className="min-h-screen flex font-opensans" onMouseMove={handleMouseMove}>
      {/* Left Side - Fluid Background */}
      <div className="hidden lg:block w-1/2 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />
        
        {/* Logo Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 mx-auto animate-scale-in shadow-[0_0_20px_rgba(255,255,255,0.5)] overflow-hidden border-4 border-alamel-aquamarine relative">
              <img 
                src="/favicon.png" 
                alt="AlaMel Logo" 
                className="w-full h-full object-cover rounded-full scale-[1.7] object-center" 
              />
            </div>
            <h1 className="text-4xl mb-1 animate-slide-in-up font-bold tracking-tight drop-shadow-md">AlaMel</h1>
            <p className="text-base text-white animate-slide-in-up font-bold drop-shadow-sm" style={{ animationDelay: '0.1s' }}>
              Your Best Place To Prepare
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8 bg-gradient-to-br from-white via-alamel-lightGray to-alamel-aquamarine/10 overflow-y-auto">
        <Card className="w-full max-w-md glass-card animate-slide-in-up shadow-xl border-none p-4">
          <CardHeader className="space-y-1 mb-4">
            <CardTitle className="text-xl text-center text-alamel-darkBlue font-semibold uppercase tracking-tight">
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="text-center text-alamel-darkGray text-[10px] uppercase tracking-widest font-semibold">
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
                    <Input id="id" placeholder="Enter your ID" value={id} onChange={(e) => setId(e.target.value)} className="pl-10 h-11 border-2 rounded-xl font-semibold text-sm" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-alamel-darkBlue text-[10px] uppercase tracking-widest ml-1 font-semibold">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-alamel-blue" />
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11 border-2 rounded-xl font-semibold text-sm" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full h-12 bg-alamel-blue text-white text-xs uppercase tracking-widest rounded-xl mt-4 font-semibold shadow-lg">
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>

                <div className="text-center pt-4">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                    Don't have an account?{' '}
                    <button type="button" onClick={() => setIsRegistering(true)} className="text-alamel-blue hover:underline">
                      Register Now
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4 max-h-[60vh] overflow-y-auto px-1 font-semibold">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest ml-1 font-semibold">I am a...</Label>
                  <Select value={role} onValueChange={(v: any) => setRole(v)}>
                    <SelectTrigger className="h-11 border-2 rounded-xl font-semibold text-xs"><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent><SelectItem value="student" className="font-semibold text-xs">Student</SelectItem><SelectItem value="admin" className="font-semibold text-xs">Admin</SelectItem></SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest ml-1 font-semibold">Full Name</Label><Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 border-2 rounded-xl font-semibold text-sm" required /></div>
                <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest ml-1 font-semibold">Phone Number</Label><Input type="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 border-2 rounded-xl font-semibold text-sm" required /></div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest ml-1 font-semibold">
                    Email Address {role === 'student' && <span className="text-gray-400 font-normal italic">(Optional)</span>}
                  </Label>
                  <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 border-2 rounded-xl font-semibold text-sm" required={role === 'admin'} />
                </div>

                {role === 'student' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest ml-1 font-semibold">Education Level</Label><Input placeholder="Tertiary" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} className="h-11 border-2 rounded-xl font-semibold text-sm" required /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest ml-1 font-semibold">Class</Label><Input placeholder="100L" value={studentClass} onChange={(e) => setStudentClass(e.target.value)} className="h-11 border-2 rounded-xl font-semibold text-sm" required /></div>
                    </div>
                    <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest ml-1 font-semibold">Courses to Prepare</Label><Input placeholder="Math, English, Physics" value={courses} onChange={(e) => setCourses(e.target.value)} className="h-11 border-2 rounded-xl font-semibold text-sm" required /></div>
                  </>
                ) : (
                  <div className="space-y-1.5"><Label className="text-[10px] uppercase tracking-widest ml-1 font-semibold">Purpose</Label><Input placeholder="Reason for admin access" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="h-11 border-2 rounded-xl font-semibold text-sm" required /></div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full h-12 bg-alamel-blue text-white text-xs uppercase tracking-widest rounded-xl mt-4 font-semibold shadow-lg">
                  {isLoading ? 'Processing...' : 'Submit Request'}
                </Button>

                <button type="button" onClick={() => setIsRegistering(false)} className="w-full text-[9px] uppercase tracking-widest text-gray-400 mt-2">Back to Login</button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
