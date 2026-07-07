import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import AuthBackground from "@/components/AuthBackground";

const fieldClass =
  "bg-white/10 border-white/20 text-white placeholder:text-slate-400 backdrop-blur-md focus-visible:ring-primary focus-visible:ring-offset-0";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const trimmed = username.trim();
    if (!trimmed || !password) {
      setError("Please enter your username and password");
      return;
    }
    setIsLoading(true);
    try {
      const result = await login(trimmed, password);
      if (result.ok) {
        navigate(result.status === "2fa_setup_required" ? "/login/setup-2fa" : "/login/verify");
      } else {
        setError(result.error || "Invalid username or password. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">

      <AuthBackground />

      {/* ── Content — floats directly on the video, no card panel ────── */}
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
            <h2 className="text-2xl font-semibold text-white">Sign in to your account</h2>
            <p className="mt-1 text-sm text-slate-300">
              Enter your credentials to access your documents
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="py-2.5 bg-black/40 border-red-400/40 text-red-200 backdrop-blur-md [&>svg]:text-red-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-slate-200">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-slate-200">Password</Label>
              <Link
                to="/reset-password"
                className="text-xs text-slate-200 hover:text-white hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className={fieldClass}
            />
          </div>

          <Button
            type="submit"
            className="w-full shadow-lg shadow-primary/30"
            disabled={isLoading || !username || !password}
          >
            {isLoading
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in…</>
              : 'Sign in'}
          </Button>

          <p className="text-center text-sm text-slate-300">
            Don't have an account?{" "}
            <Link to="/register" className="text-white font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </form>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400/70">
          Secure document management for petroleum data
        </p>
      </div>
    </div>
  );
};

export default Login;
