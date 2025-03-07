// app/(auth)/reset-password/page.js
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import Image from "next/image";
import { useAuth } from '@/context/auth-context';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ text: '', success: false });
  const [loading, setLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const router = useRouter();
  const { resetPasswordWithToken } = useAuth();

  // Verificar se o token está presente na URL
  useEffect(() => {
    // Extrai e verifica o token do URL
    const checkToken = async () => {
      try {
        // Check if in browser environment
        if (typeof window !== 'undefined') {
          // Verificar os parâmetros de hash na URL
          const hash = window.location.hash;
          
          if (hash && hash.includes('error')) {
            console.error('Reset password error:', hash);
            setTokenValid(false);
            setMessage({
              text: 'Link de redefinição inválido ou expirado. Por favor, solicite um novo link.',
              success: false
            });
          } else if (!hash || hash.length < 10) {
            // Nenhum token encontrado
            setTokenValid(false);
            setMessage({
              text: 'Link de redefinição incorreto. Verifique seu email novamente ou solicite um novo link.',
              success: false
            });
          } else {
            // Supabase deve estar processando o token automaticamente
            // Verificar se a sessão está configurada
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              setTokenValid(false);
              setMessage({
                text: 'Sessão de redefinição de senha não detectada. Por favor, verifique seu email novamente ou solicite um novo link.',
                success: false
              });
            }
          }
        }
      } catch (error) {
        console.error('Error checking reset token:', error);
        setTokenValid(false);
        setMessage({
          text: 'Erro ao verificar o token de redefinição. Por favor, tente novamente.',
          success: false
        });
      }
    };

    checkToken();
  }, []);

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
      // Use the resetPasswordWithToken function from context
      const result = await resetPasswordWithToken(password);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao redefinir senha.');
      }

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
          alt="RV Corp Logo"
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