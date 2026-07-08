import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import AuthBackground from '@/components/AuthBackground';
import { DEPARTMENTS } from '@/config/departments';

const fieldClass =
  "bg-white/10 border-white/20 text-white placeholder:text-slate-400 backdrop-blur-md focus-visible:ring-primary focus-visible:ring-offset-0";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName]                     = useState('');
  const [email, setEmail]                   = useState('');
  const [department, setDepartment]         = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                   = useState('');
  const [isLoading, setIsLoading]           = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !department || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const result = await register(name, email, password, department);
      if (result.ok) navigate('/login/setup-2fa');
      else setError(result.error || 'Registration failed. Email may already be in use.');
    } catch {
      setError('An error occurred during registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">

      <AuthBackground />

      {/* ── Content — floats directly on the video, no card panel ──── */}
      <div className="relative z-10 w-full max-w-md space-y-8"
           style={{ animation: "splash-text-in 0.6s ease-out both" }}>

        {/* Branding */}
        <div className="text-center">
          <img
            src="/assets/images/logo.png"
            alt="PetroData"
            className="mx-auto h-32 w-32 object-contain drop-shadow-[0_0_40px_rgba(99,102,241,0.55)]"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
          <h1 className="mt-3 text-5xl font-bold tracking-tight text-white drop-shadow-lg">PetroData</h1>
          <p className="mt-2 text-base font-medium text-slate-300 tracking-wide uppercase">
            Document Management Service
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white">Create an account</h2>
            <p className="mt-1 text-sm text-slate-300">
              Fill in your details to join your workspace
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="py-2.5 bg-black/40 border-red-400/40 text-red-200 backdrop-blur-md [&>svg]:text-red-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-slate-200">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              required
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-200">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="department" className="text-slate-200">Department</Label>
            <Select value={department} onValueChange={setDepartment} required>
              <SelectTrigger id="department" className={fieldClass}>
                <SelectValue placeholder="Select your department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-200">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-slate-200">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className={fieldClass}
            />
          </div>

          <Button type="submit" className="w-full shadow-lg shadow-primary/30" disabled={isLoading}>
            {isLoading
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating account…</>
              : 'Create account'}
          </Button>

          <p className="text-center text-sm text-slate-300">
            Already have an account?{' '}
            <Link to="/login" className="text-white font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </form>

        <p className="text-center text-xs text-slate-400/70">
          Secure document management for petroleum data
        </p>
      </div>
    </div>
  );
};

export default Register;
