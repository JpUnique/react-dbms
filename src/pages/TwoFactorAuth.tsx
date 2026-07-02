import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth.service';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertCircle, CheckCircle2, Copy, Download, RotateCcw, Shield, Smartphone, Key } from 'lucide-react';

type Step = 'active' | 'scanning' | 'verifying' | 'recovery-codes';

const TwoFactorAuth: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [step, setStep] = useState<Step>('active');
  const [qrCode, setQrCode] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const handleStartReset = async () => {
    if (!globalThis.confirm(
      'Resetting 2FA will invalidate your current recovery codes and require scanning a new QR code. Continue?',
    )) return;

    setError('');
    setIsProcessing(true);
    try {
      const { qr_code } = await authService.enable2FA();
      setQrCode(qr_code);
      setStep('scanning');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start 2FA reset');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerify = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    try {
      const data = await authService.verify2FA(code);
      setRecoveryCodes(data.recovery_codes ?? []);
      setStep('recovery-codes');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code — please try again');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const blob = new Blob(
      [`PetroData recovery codes\nGenerated ${new Date().toISOString()}\n\n${recoveryCodes.join('\n')}\n\nEach code can only be used once.`],
      { type: 'text/plain' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'petrodata-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">Two-Factor Authentication</h1>
              <Badge className="bg-green-500 hover:bg-green-600">
                <Shield className="h-3 w-3 mr-1" /> Enabled
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">Required for every account — protects your documents even if your password leaks</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'active' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" /> 2FA is Active
              </CardTitle>
              <CardDescription>Your account is protected with two-factor authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Smartphone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Authenticator app</p>
                  <p className="text-sm text-muted-foreground">Codes refresh every 30 seconds — no need to check email</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Key className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Recovery codes</p>
                  <p className="text-sm text-muted-foreground">Used to sign in or reset your password if you lose your phone</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => navigate('/settings')}>Back to Settings</Button>
              <Button variant="outline" className="gap-1.5" onClick={handleStartReset} disabled={isProcessing}>
                <RotateCcw className="h-3.5 w-3.5" />
                {isProcessing ? 'Starting…' : 'Reset 2FA'}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 1 — scan QR */}
        {step === 'scanning' && (
          <Card>
            <CardHeader>
              <CardTitle>Scan QR Code</CardTitle>
              <CardDescription>Open your authenticator app and scan this new QR code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-xl border shadow-sm">
                  <QRCodeSVG value={qrCode} size={192} level="H" />
                </div>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                After scanning, click <strong>Next</strong> to enter the code your app shows.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('active')}>Cancel</Button>
              <Button onClick={() => setStep('verifying')}>Next →</Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2 — verify code */}
        {step === 'verifying' && (
          <Card>
            <CardHeader>
              <CardTitle>Enter Verification Code</CardTitle>
              <CardDescription>Enter the 6-digit code from your authenticator app to finish resetting 2FA</CardDescription>
            </CardHeader>
            <form onSubmit={handleVerify}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-xl tracking-widest font-mono"
                    autoFocus
                    required
                  />
                  <p className="text-xs text-muted-foreground text-center">The code refreshes every 30 seconds</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep('scanning')} disabled={isProcessing}>
                  Back
                </Button>
                <Button type="submit" disabled={isProcessing || code.length !== 6}>
                  {isProcessing ? 'Verifying…' : 'Verify'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* Step 3 — recovery codes */}
        {step === 'recovery-codes' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                2FA reset — save your new recovery codes
              </CardTitle>
              <CardDescription>
                Your old recovery codes no longer work. Save these new ones — we won't show them again.
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
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button type="button" variant="outline" className="flex-1 gap-1.5" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => { navigate('/settings'); }} className="w-full">Done</Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default TwoFactorAuth;
