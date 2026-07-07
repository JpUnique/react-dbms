import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import AuthBackground from "@/components/AuthBackground";

const fieldClass =
  "bg-white/10 border-white/20 text-white placeholder:text-slate-400 backdrop-blur-md focus-visible:ring-primary focus-visible:ring-offset-0";

const ResetPasswordTwoFactor: React.FC = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!username || !code || !newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPasswordTwoFactor(username.trim(), code.trim(), newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid username or code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <AuthBackground />

      <div className="relative z-10 w-full max-w-md space-y-8" style={{ animation: "splash-text-in 0.6s ease-out both" }}>
        <div className="text-center">
          <img
            src="/assets/images/logo.png"
            alt="PetroData"
            className="mx-auto h-32 w-32 object-contain drop-shadow-[0_0_40px_rgba(99,102,241,0.55)]"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          <h1 className="mt-3 text-5xl font-bold tracking-tight text-white drop-shadow-lg">PetroData</h1>
          <p className="mt-2 text-base font-medium text-slate-300 tracking-wide uppercase">
            Document Management Service
          </p>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white">{success ? "Password reset" : "Reset your password"}</h2>
          <p className="mt-1 text-sm text-slate-300">
            {success
              ? "Your password has been updated. Any other signed-in sessions have been signed out."
              : "Prove it's you with your authenticator app or a recovery code — no email needed"}
          </p>
        </div>

        {success ? (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3 py-2 text-center w-full">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
            </div>
            <Button className="w-full shadow-lg shadow-primary/30" onClick={() => navigate("/login")}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
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
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                required
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-slate-200">{useRecoveryCode ? "Recovery code" : "Verification code"}</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) =>
                  setCode(
                    useRecoveryCode
                      ? e.target.value.toUpperCase().slice(0, 11)
                      : e.target.value.replace(/\D/g, "").slice(0, 6),
                  )
                }
                placeholder={useRecoveryCode ? "XXXXX-XXXXX" : "000000"}
                className={`text-center tracking-widest font-mono ${fieldClass}`}
                required
              />
              <button
                type="button"
                onClick={() => { setUseRecoveryCode((v) => !v); setCode(""); }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-200 hover:text-white hover:underline"
              >
                <KeyRound className="h-3 w-3" />
                {useRecoveryCode ? "Use my authenticator app instead" : "Use a recovery code instead"}
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-slate-200">New password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-slate-200">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                className={fieldClass}
              />
            </div>

            <Button type="submit" className="w-full shadow-lg shadow-primary/30" disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Resetting…</> : "Reset password"}
            </Button>

            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-1.5 text-sm text-white font-semibold hover:underline w-full"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </form>
        )}

        <p className="text-center text-xs text-slate-400/70">
          Secure document management for petroleum data
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordTwoFactor;
