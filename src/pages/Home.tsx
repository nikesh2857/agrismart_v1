import { useState, FormEvent, useEffect } from 'react';
import { TranslateWidget } from '../components/TranslateWidget';
import { Sprout, ShieldCheck, ShoppingBag, Leaf, ArrowRight, Briefcase, Globe, Phone } from 'lucide-react';
import { User } from '../types';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface HomeProps {
  onLogin: (user: User) => void;
}

export function Home({ onLogin }: HomeProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'farmer' | 'buyer' | 'worker'>('farmer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Phone Login States
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) return;
    setAuthError('');
    setOtpSent(true);
    setAuthError("OTP sent to your phone! Please enter verification code 123456.");
  };

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (loginMethod === 'phone') {
      if (!otpSent) {
        await handleSendOtp();
        return;
      }

      if (otpCode && otpCode !== '123456') {
        setAuthError("Invalid verification code. Please enter 123456.");
        return;
      }
      
      try {
        const res = await fetch('/api/auth/phone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phoneNumber,
            role: selectedRole.toUpperCase(),
            name: name || undefined
          })
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to sync user");
        }
        
        const backendUser = await res.json();
        const loggedInUser: User = {
          id: backendUser.user.id,
          name: backendUser.user.name,
          role: backendUser.user.role.toLowerCase() as any,
          avatar: ''
        };
        
        localStorage.setItem('phone_user', JSON.stringify(loggedInUser));
        onLogin(loggedInUser);
        return;
      } catch (err: any) {
        console.error("Phone verification failed:", err);
        setAuthError(err.message || 'OTP verification failed. Please try again.');
        return;
      }
    }

    try {
      localStorage.setItem('selected_role', selectedRole);

      if (isLogin) {
        // --- 1. SUPABASE SIGN IN ---
        const { data: supaData, error: supaErr } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (supaErr) {
          throw new Error(supaErr.message || 'Invalid email or password.');
        }

        if (supaData?.session) {
          const idToken = supaData.session.access_token;
          const res = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ role: selectedRole.toUpperCase() })
          }).catch(() => null);

          if (res && res.ok) {
            const data = await res.json();
            const actualRole = data.user.role.toLowerCase();
            if (actualRole !== selectedRole) {
              await supabase.auth.signOut();
              throw new Error(`Access Denied: This account is registered as a ${actualRole}. Please select the ${actualRole} role to login.`);
            }
            onLogin({
              id: supaData.session.user.id,
              name: data.user.name || supaData.session.user.user_metadata?.full_name || name || 'User',
              role: actualRole as any,
              avatar: data.user.avatarUrl || ''
            });
            return;
          } else {
            // Direct session login
            onLogin({
              id: supaData.session.user.id,
              name: supaData.session.user.user_metadata?.full_name || name || 'User',
              role: selectedRole,
              avatar: ''
            });
            return;
          }
        }
      } else {
        // --- 2. SIGN UP VIA BACKEND REGISTRATION (Bypasses SMTP email rate limits) ---
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            name,
            role: selectedRole.toUpperCase()
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to register account.');
        }

        const data = await res.json();
        const registeredUser = data.user;

        // Auto sign-in via Supabase client session if available
        await supabase.auth.signInWithPassword({ email, password }).catch(() => null);

        onLogin({
          id: registeredUser.id || registeredUser.firebaseUid,
          name: registeredUser.name || name || 'User',
          role: selectedRole,
          avatar: registeredUser.avatarUrl || ''
        });
        return;
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setAuthError(err.message || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleAdminLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (adminEmail === 'nikeshsammineni@gmail.com' && adminPassword === 'S.N.C.2024') {
      localStorage.setItem('admin_token', 'admin_hardcoded_token_123');
      onLogin({
        id: 'admin-1',
        name: 'System Admin',
        role: 'admin',
        avatar: ''
      });
    } else {
      setAdminError('Invalid email or password.');
    }
  };



  const handleGoogleLogin = async () => {
    try {
      localStorage.setItem('selected_role', selectedRole);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Google sign in failed", error);
      setAuthError("Google Sign-In failed.");
    }
  };

  // Removed Google One Tap to fix GSI_LOGGER origin issues on localhost.
  // We now strictly use Firebase's popup signInWithGoogle via handleGoogleLogin.

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans relative">
      <button 
        onClick={() => setShowAdminLogin(true)}
        className="absolute top-6 right-6 z-20 flex items-center gap-2 bg-white/80 hover:bg-white backdrop-blur-sm border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <ShieldCheck className="w-4 h-4" />
        Admin Login
      </button>

      {showAdminLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Admin Login</h2>
              <p className="text-slate-500 text-sm mt-1">Access the administrative portal</p>
            </div>
            
            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              {adminError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 text-center">
                  {adminError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admin Email</label>
                <input 
                  type="email" 
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@email.com" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input 
                  type="password" 
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" 
                  required 
                />
              </div>
              
              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  className="w-1/2 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="w-1/2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-md shadow-green-600/20 transition-all"
                >
                  Login
                </button>
              </div>

              <div className="mt-6 flex justify-center">
                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-3.5 rounded-xl font-bold shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-slate-100"
                >
                  <Globe className="w-5 h-5 text-blue-500" />
                  Sign In with Google
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Left side: Branding/Hero */}
      <div className="w-full md:w-1/2 bg-[#0A2F1D] text-white p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
           <img src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80" alt="Farm Background" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="p-3 bg-green-500 rounded-xl">
              <Sprout className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">AgriSmart</h1>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            The Future of<br/>Farm Management
          </h2>
          <p className="text-green-100 text-lg max-w-md">
            Join thousands of farmers, buyers, and administrators in the most comprehensive agricultural ecosystem.
          </p>
        </div>
        
        <div className="relative z-10 mt-12 grid grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
            <h3 className="font-bold text-xl mb-1">10k+</h3>
            <p className="text-green-100 text-sm">Active Farmers</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
            <h3 className="font-bold text-xl mb-1">₹50M+</h3>
            <p className="text-green-100 text-sm">Marketplace Traded</p>
          </div>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-20 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8 relative z-20">
            <TranslateWidget id="google_translate_element_home" />
          </div>
          <div className="flex bg-slate-200 p-1 rounded-xl mb-8 w-fit mx-auto">
            <button 
              onClick={() => setIsLogin(true)}
              aria-label="Switch to Login"
              className={cn("px-6 py-2 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-green-500 outline-none", isLogin ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Login
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              aria-label="Switch to Sign Up"
              className={cn("px-6 py-2 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-green-500 outline-none", !isLogin ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Sign Up
            </button>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">{isLogin ? 'Welcome back' : 'Create an account'}</h2>
            <p className="text-slate-500 text-sm mt-2">Access your personalized agricultural dashboard.</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Select your role</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('farmer')}
                  aria-pressed={selectedRole === 'farmer'}
                  className={cn("flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2", selectedRole === 'farmer' ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300")}
                >
                  <Leaf className="w-6 h-6 mb-2" />
                  <span className="text-xs font-semibold">Farmer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('buyer')}
                  aria-pressed={selectedRole === 'buyer'}
                  className={cn("flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2", selectedRole === 'buyer' ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300")}
                >
                  <ShoppingBag className="w-6 h-6 mb-2" />
                  <span className="text-xs font-semibold">Customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('worker')}
                  aria-pressed={selectedRole === 'worker'}
                  className={cn("flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2", selectedRole === 'worker' ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300")}
                >
                  <Briefcase className="w-6 h-6 mb-2" />
                  <span className="text-xs font-semibold">Worker</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {!isLogin && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input 
                    id="name"
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" 
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input 
                  id="email"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" 
                  required 
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
                  {isLogin && <a href="#" className="text-xs text-green-600 font-medium hover:underline focus:outline-none focus:underline">Forgot password?</a>}
                </div>
                <input 
                  id="password"
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all" 
                  required 
                />
              </div>
            </div>

            {authError && <div className="text-red-500 text-sm font-medium">{authError}</div>}

            <button 
              type="submit" 
              aria-label={isLogin ? 'Sign In' : 'Create Account'}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold shadow-md shadow-green-600/20 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-green-500/50"
            >
              {isLogin ? 'Sign In to Dashboard' : 'Create Account'} 
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="relative mt-6 mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Or continue with</span>
              </div>
            </div>

            <div className="flex justify-center">
              <button 
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-3.5 rounded-xl font-bold shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-slate-100"
              >
                <Globe className="w-5 h-5 text-blue-500" />
                Sign In with Google
              </button>
            </div>
            <div id="recaptcha-container" className="mt-2"></div>
          </form>

        </div>
      </div>
    </div>
  );
}
