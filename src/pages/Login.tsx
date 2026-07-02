import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import AuthBackground from "@/components/AuthBackground";

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

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="w-full max-w-md space-y-7"
           style={{ animation: "splash-text-in 0.6s ease-out both" }}>

        {/* Branding */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="h-28 w-28 rounded-3xl bg-linear-to-br from-primary to-primary/70 shadow-xl shadow-primary/30 flex items-center justify-center">
              <img
                src="/assets/images/logo.png"
                alt="PetroData"
                className="h-20 w-20 object-contain"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">PetroData</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Document management made simple
          </p>
        </div>

        {/* Card */}
        <Card className="shadow-xl shadow-black/5 dark:shadow-black/40 border-border/60 backdrop-blur-sm bg-card/95">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription>
              Enter your credentials to access your documents
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="py-2.5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/reset-password"
                    className="text-xs text-primary hover:underline"
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
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button
                type="submit"
                className="w-full shadow-sm"
                disabled={isLoading || !username || !password}
              >
                {isLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in…</>
                  : 'Sign in'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/register" className="text-primary font-medium hover:underline">
                  Create an account
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground/60">
          Secure document management for petroleum data
        </p>
      </div>
    </div>
  );
};

export default Login;
