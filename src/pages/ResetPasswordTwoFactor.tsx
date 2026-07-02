import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "@/services/auth.service";
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
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import AuthBackground from "@/components/AuthBackground";

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

      <div className="w-full max-w-md space-y-7" style={{ animation: "splash-text-in 0.6s ease-out both" }}>
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="h-28 w-28 rounded-3xl bg-linear-to-br from-primary to-primary/70 shadow-xl shadow-primary/30 flex items-center justify-center">
              <img
                src="/assets/images/logo.png"
                alt="PetroData"
                className="h-20 w-20 object-contain"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">PetroData</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Document management made simple
          </p>
        </div>

        <Card className="shadow-xl shadow-black/5 dark:shadow-black/40 border-border/60 backdrop-blur-sm bg-card/95">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">{success ? "Password reset" : "Reset your password"}</CardTitle>
            <CardDescription>
              {success
                ? "Your password has been updated. Any other signed-in sessions have been signed out."
                : "Prove it's you with your authenticator app or a recovery code — no email needed"}
            </CardDescription>
          </CardHeader>

          {success ? (
            <CardFooter className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col items-center gap-3 py-2 text-center w-full">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
              </div>
              <Button className="w-full shadow-sm" onClick={() => navigate("/login")}>
                Back to sign in
              </Button>
            </CardFooter>
          ) : (
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
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="code">{useRecoveryCode ? "Recovery code" : "Verification code"}</Label>
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
                    className="text-center tracking-widest font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => { setUseRecoveryCode((v) => !v); setCode(""); }}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <KeyRound className="h-3 w-3" />
                    {useRecoveryCode ? "Use my authenticator app instead" : "Use a recovery code instead"}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4 pt-2">
                <Button type="submit" className="w-full shadow-sm" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Resetting…</> : "Reset password"}
                </Button>

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-1.5 text-sm text-primary font-medium hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground/60">
          Secure document management for petroleum data
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordTwoFactor;
