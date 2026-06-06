import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
    if (!trimmedUsername || !trimmedPassword) {
      setError('Please enter both username and password');
      return;
    }
    
    // License check temporarily disabled for debugging
    // if (!isLicenseValid) {
    //   setError('No valid license found. Please activate your license first.');
    //   return;
    // }
    
    setIsLoading(true);
    
    try {
      console.log('🔐 Attempting login with:', { username: trimmedUsername });
      const success = await login(trimmedUsername, trimmedPassword);
      
      if (success) {
        console.log('✅ Login successful, navigating to dashboard');
        navigate('/');
      } else {
        console.log('❌ Login failed');
        setError('Invalid username or password. Please use your backend credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and title */}
        <div className="text-center">
          <div className="flex justify-center">
            <img src="/assets/images/logo.png" alt="DocManager Logo" className="h-16 w-16" />
          </div>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">DocManager</h2>
          <p className="mt-1 text-sm text-gray-500">Document management made simple</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Login to your account</CardTitle>
            <CardDescription>
              Enter your credentials to access your documents
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              
              {/* Error message */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              
              <Alert>
                <AlertDescription className="text-xs">
                  Use your backend account credentials to sign in.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link 
                    to="/forgot-password" 
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
              
              
              <div className="text-center text-sm">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary hover:underline">
                  Create an account
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;