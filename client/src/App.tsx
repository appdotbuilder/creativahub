import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { LoginForm } from '@/components/LoginForm';
import { Dashboard } from '@/components/Dashboard';
import type { User } from '../../server/src/schema';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Check for stored user session
  useEffect(() => {
    const storedUser = localStorage.getItem('creativahub_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('creativahub_user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setLoginError(null);
    
    try {
      const result = await trpc.login.mutate({ email, password });
      setUser(result);
      localStorage.setItem('creativahub_user', JSON.stringify(result));
    } catch (error) {
      setLoginError('Login gagal. Periksa email dan password Anda.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('creativahub_user');
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat CreativaHub...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-purple-800 mb-2">🎨 CreativaHub</h1>
            <p className="text-gray-600">Platform LMS untuk Ekstrakurikuler Media Kreatif</p>
          </div>
          <LoginForm onLogin={handleLogin} error={loginError} isLoading={isLoading} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Dashboard user={user} onLogout={handleLogout} />
    </div>
  );
}

export default App;