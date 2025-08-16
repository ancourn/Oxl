'use client';

import { useState, useEffect } from 'react';
import { Shield, QrCode, Key, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MotionWrapper } from '@/components/ui/motion-wrapper';
import { TwoFactorAuth } from '@/lib/security';

interface TwoFactorSetupProps {
  userId: string;
  onComplete: () => void;
}

export function TwoFactorSetup({ userId, onComplete }: TwoFactorSetupProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [secret, setSecret] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (step === 1) {
      generateSecret();
    }
  }, [step]);

  const generateSecret = async () => {
    try {
      const newSecret = TwoFactorAuth.generateTOTPSecret();
      const newBackupCodes = TwoFactorAuth.generateBackupCodes();
      const qrData = TwoFactorAuth.generateQRCodeData(`user-${userId}`, newSecret);
      
      setSecret(newSecret);
      setBackupCodes(newBackupCodes);
      setQrCodeData(qrData);
    } catch (error) {
      console.error('Error generating 2FA secret:', error);
      setError('Failed to generate 2FA setup');
    }
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const isValid = TwoFactorAuth.verifyTOTPToken(secret, verificationCode);
      
      if (isValid) {
        // Save 2FA settings to backend
        const response = await fetch('/api/user/2fa/enable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret,
            backupCodes,
            enabled: true
          })
        });

        if (response.ok) {
          setStep(3);
          onComplete();
        } else {
          setError('Failed to save 2FA settings');
        }
      } else {
        setError('Invalid verification code');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      setError('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'oxl-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        {[1, 2, 3].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= stepNumber
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {stepNumber}
            </div>
            {stepNumber < 3 && (
              <div
                className={`w-16 h-1 mx-2 ${
                  step > stepNumber ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Introduction */}
      {step === 1 && (
        <MotionWrapper type="scale">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Set Up Two-Factor Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Two-factor authentication adds an extra layer of security to your account.
                  You'll need a code from your authenticator app in addition to your password.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h4 className="font-medium">What you'll need:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    An authenticator app (Google Authenticator, Authy, Microsoft Authenticator)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Your mobile device
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    A safe place to store backup codes
                  </li>
                </ul>
              </div>

              <Button onClick={() => setStep(2)} className="w-full">
                Get Started
              </Button>
            </CardContent>
          </Card>
        </MotionWrapper>
      )}

      {/* Step 2: Scan QR Code */}
      {step === 2 && (
        <MotionWrapper type="slide" direction="right">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Scan QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg inline-block">
                  {/* QR Code would be generated here */}
                  <div className="w-48 h-48 bg-gray-200 rounded flex items-center justify-center">
                    <QrCode className="w-24 h-24 text-gray-400" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Scan this code with your authenticator app
                </p>
              </div>

              <div className="space-y-2">
                <Label>Manual Entry Key</Label>
                <div className="flex gap-2">
                  <Input value={secret} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(secret)}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  If you can't scan the QR code, enter this key manually
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Verification Code</Label>
                <Input
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-lg font-mono tracking-widest"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={verifyCode} 
                  className="flex-1"
                  disabled={isVerifying || verificationCode.length !== 6}
                >
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>
      )}

      {/* Step 3: Backup Codes */}
      {step === 3 && (
        <MotionWrapper type="slide" direction="right">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Save Backup Codes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  These backup codes can be used to access your account if you lose your authenticator device.
                  Save them in a secure place.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Backup Codes</Label>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="p-2 border rounded bg-muted/50 font-mono text-sm"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={downloadBackupCodes} variant="outline" className="flex-1">
                  Download
                </Button>
                <Button onClick={() => copyToClipboard(backupCodes.join('\n'))} variant="outline" className="flex-1">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>

              <div className="pt-4 border-t">
                <Badge variant="secondary" className="w-full justify-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Two-factor authentication is now enabled
                </Badge>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>
      )}
    </div>
  );
}