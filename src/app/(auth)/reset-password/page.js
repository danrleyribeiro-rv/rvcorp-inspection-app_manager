// app/(auth)/reset-password/page.js
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import Image from "next/image";
import { useAuth } from '@/context/auth-context';
import { auth } from '@/lib/firebase';
import { isSignInWithEmailLink, signInWithEmailLink, verifyPasswordResetCode } from 'firebase/auth';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ text: '', success: false });
  const [loading, setLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const router = useRouter();
  const { resetPasswordWithToken } = useAuth();

  // Check if the reset code in the URL is valid
  useEffect(() => {
    const checkResetCode = async () => {
      try {
        // Extract the action code from the URL
        const searchParams = new URLSearchParams(window.location.search);
        const actionCode = searchParams.get('oobCode');
        
        if (!actionCode) {
          if (isSignInWithEmailLink(auth, window.location.href)) {
            // If this is a sign-in link (for passwordless auth), handle differently
            const email = window.localStorage.getItem('emailForSignIn');
            if (email) {
              try {
                // Complete sign-in
                await signInWithEmailLink(auth, email, window.location.href);
                window.localStorage.removeItem('emailForSignIn');
                router.push('/dashboard');
              } catch (error) {
                console.error('Error signing in with email link:', error);
                setTokenValid(false);
                setMessage({
                  text: 'Link de autenticação inválido ou expirado.',
                  success: false
                });
              }
            } else {
              setTokenValid(false);
              setMessage({
                text: 'Email para autenticação não encontrado. Por favor, tente novamente.',
                success: false
              });
            }
          } else {
            setTokenValid(false);
            setMessage({
              text: 'Código de redefinição não encontrado. Por favor, solicite um novo link.',
              success: false
            });
          }
          return;
        }
        
        // Verify the code
        await verifyPasswordResetCode(auth, actionCode);
        
        // If we got here, the code is valid
        // Store the code to use it when resetting the password
        window.sessionStorage.setItem('resetCode', actionCode);

      } catch (error) {
        console.error('Error verifying reset code:', error);
        setTokenValid(false);
        setMessage({
          text: 'Link de redefinição inválido ou expirado. Por favor, solicite um novo link.',
          success: false
        });
      }
    };

    checkResetCode();
  }, [router]);

  const validatePassword = (password) => {
    // Minimum 8 characters, at least one uppercase letter, one lowercase letter, and one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', success: false });

    // Validate password
    if (!validatePassword(password)) {
      setMessage({
        text: 'A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números.',
        success: false
      });
      setLoading(false);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setMessage({
        text: 'As senhas não coincidem.',
        success: false
      });
      setLoading(false);
      return;
    }

    try {
      // Use the stored reset code
      const actionCode = window.sessionStorage.getItem('resetCode');
      if (!actionCode) {
        throw new Error('Código de redefinição não encontrado. Por favor, solicite um novo link.');
      }
      
      // Apply the password reset
      await auth.confirmPasswordReset(actionCode, password);
      
      // Clear the stored code
      window.sessionStorage.removeItem('resetCode');
      
      // Show success message
      setMessage({
        text: 'Sua senha foi redefinida com sucesso!',
        success: true
      });
      setResetComplete(true);
      
      // Clear form
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error("Error resetting password:", error);
      setMessage({
        text: error.message || 'Erro ao redefinir senha. Por favor, tente novamente.',
        success: false
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="mb-8 absolute top-8">
        <Image
          src="/logo.png"
          alt="Lince Logo"
          width={150}
          height={150}
          priority
        />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
          <CardDescription>
            {resetComplete 
              ? 'Sua senha foi atualizada com sucesso.' 
              : tokenValid 
                ? 'Crie uma nova senha segura para sua conta.'
                : 'Link de redefinição de senha'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message.text && (
            <Alert variant={message.success ? "default" : "destructive"} className="mb-4">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {resetComplete ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-4">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <p className="text-center">Você pode agora fazer login com sua nova senha.</p>
              </div>
              <Button 
                onClick={() => router.push('/login')}
                className="w-full"
              >
                Ir para Login
              </Button>
            </div>
          ) : tokenValid ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Processando...' : 'Redefinir Senha'}
              </Button>
              <Link 
                href="/login"
                className="flex items-center gap-1 text-sm text-primary hover:underline mt-4 justify-center"
              >
                <ArrowLeft size={16} />
                Retornar ao Login
              </Link>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                O link para redefinição de senha parece ser inválido ou expirou.
              </p>
              <Link href="/forgot-password">
                <Button className="w-full">
                  Solicitar Novo Link
                </Button>
              </Link>
              <Link 
                href="/login"
                className="flex items-center gap-1 text-sm text-primary hover:underline mt-4 justify-center"
              >
                <ArrowLeft size={16} />
                Retornar ao Login
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 