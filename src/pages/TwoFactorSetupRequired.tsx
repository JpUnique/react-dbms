import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Copy, Download, Loader2, ShieldCheck } from "lucide-react";
import AuthBackground from "@/components/AuthBackground";

type Step = "scan" | "verify" | "recovery-codes";

const TwoFactorSetupRequired: React.FC = () => {
  const navigate = useNavigate();
  const { pendingChallenge, completeChallenge } = useAuth();

  const [step, setStep] = useState<Step>("scan");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!pendingChallenge) {
      navigate("/login", { replace: true });
    } else if (pendingChallenge.status !== "2fa_setup_required") {
      navigate("/login/verify", { replace: true });
    }
  }, [pendingChallenge, navigate]);

  if (!pendingChallenge || pendingChallenge.status !== "2fa_setup_required") return null;

  const handleVerify = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await completeChallenge(code);
      if (!result.ok) {
        setError(result.error || "Invalid code — please try again");
        return;
      }
      if (result.recoveryCodes?.length) {
        setRecoveryCodes(result.recoveryCodes);
        setStep("recovery-codes");
      } else {
        navigate("/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const blob = new Blob(
      [`PetroData recovery codes\nGenerated ${new Date().toISOString()}\n\n${recoveryCodes.join("\n")}\n\nEach code can only be used once.`],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "petrodata-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Secure your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Two-factor authentication is required for every account
          </p>
        </div>

        <Card className="shadow-xl shadow-black/5 dark:shadow-black/40 border-border/60 backdrop-blur-sm bg-card/95">
          {step === "scan" && (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Scan QR code</CardTitle>
                <CardDescription>Open your authenticator app (Google Authenticator, Authy, etc.) and scan this code</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-xl border shadow-sm">
                    <QRCodeSVG value={pendingChallenge.qrCode ?? ""} size={192} level="H" />
                  </div>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  After scanning, click <strong>Next</strong> to enter the code your app shows.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full shadow-sm" onClick={() => setStep("verify")}>
                  Next →
                </Button>
              </CardFooter>
            </>
          )}

          {step === "verify" && (
            <form onSubmit={handleVerify}>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Enter verification code</CardTitle>
                <CardDescription>Enter the 6-digit code from your authenticator app</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="py-2.5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="code">Verification code</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-xl tracking-widest font-mono"
                    autoFocus
                    required
                  />
                  <p className="text-xs text-muted-foreground text-center">The code refreshes every 30 seconds</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between gap-3">
                <Button type="button" variant="outline" onClick={() => setStep("scan")} disabled={isLoading}>
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading || code.length !== 6}>
                  {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying…</> : "Verify & continue"}
                </Button>
              </CardFooter>
            </form>
          )}

          {step === "recovery-codes" && (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Save your recovery codes</CardTitle>
                <CardDescription>
                  Use one of these if you ever lose access to your authenticator app. Each code works once. We won't show these again.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-4 font-mono text-sm">
                  {recoveryCodes.map((c) => (
                    <div key={c} className="text-center tracking-wide">{c}</div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1 gap-1.5" onClick={handleCopy}>
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 gap-1.5" onClick={handleDownload}>
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
                <label className="flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer">
                  <Checkbox checked={saved} onCheckedChange={(v) => setSaved(v === true)} className="mt-0.5" />
                  I've saved my recovery codes somewhere safe
                </label>
              </CardContent>
              <CardFooter>
                <Button className="w-full shadow-sm" disabled={!saved} onClick={() => navigate("/")}>
                  Continue to PetroData
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TwoFactorSetupRequired;
