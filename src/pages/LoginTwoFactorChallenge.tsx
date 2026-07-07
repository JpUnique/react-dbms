import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { AlertCircle, ArrowLeft, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import AuthBackground from "@/components/AuthBackground";

const LoginTwoFactorChallenge: React.FC = () => {
  const navigate = useNavigate();
  const { pendingChallenge, completeChallenge, clearChallenge } = useAuth();

  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!pendingChallenge) {
      navigate("/login", { replace: true });
    } else if (pendingChallenge.status === "2fa_setup_required") {
      navigate("/login/setup-2fa", { replace: true });
    }
  }, [pendingChallenge, navigate]);

  if (!pendingChallenge || pendingChallenge.status !== "2fa_required") return null;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!code) return;

    setIsLoading(true);
    try {
      const result = await completeChallenge(useRecoveryCode ? code.trim() : code.replace(/\D/g, ""));
      if (result.ok) {
        navigate("/");
      } else {
        setError(result.error || "Invalid code — please try again");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <AuthBackground />

      <div className="relative z-10 w-full max-w-md space-y-7" style={{ animation: "splash-text-in 0.6s ease-out both" }}>
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="h-20 w-20 rounded-3xl bg-linear-to-br from-primary to-primary/70 shadow-xl shadow-primary/30 flex items-center justify-center">
              <ShieldCheck className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Two-factor verification</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the code from your authenticator app
          </p>
        </div>

        <Card className="shadow-xl shadow-black/5 dark:shadow-black/40 border-border/60 backdrop-blur-sm bg-card/95">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Verify it's you</CardTitle>
            <CardDescription>
              {useRecoveryCode
                ? "Enter one of your saved recovery codes"
                : "Open your authenticator app and enter the 6-digit code"}
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
                  maxLength={useRecoveryCode ? 11 : 6}
                  className="text-center text-xl tracking-widest font-mono"
                  autoFocus
                  required
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setUseRecoveryCode((v) => !v);
                  setCode("");
                  setError("");
                }}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <KeyRound className="h-3 w-3" />
                {useRecoveryCode ? "Use my authenticator app instead" : "Use a recovery code instead"}
              </button>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button type="submit" className="w-full shadow-sm" disabled={isLoading || !code}>
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying…</> : "Verify"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  clearChallenge();
                  navigate("/login");
                }}
                className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginTwoFactorChallenge;
