'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-black text-white min-h-screen flex w-full selection:bg-zinc-800 selection:text-white">
      {/* Main Container */}
      <div className="flex w-full min-h-screen">

        {/* Left Panel: Visual/Brand (Hidden on Mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-zinc-900">
          {/* Background Gradients */}
          <div className="absolute inset-0 bg-zinc-950 z-0"></div>
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-zinc-900/20 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-zinc-800/10 blur-[100px] rounded-full pointer-events-none"></div>

          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 z-0 opacity-[0.03]" 
            style={{ 
              backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', 
              backgroundSize: '60px 60px' 
            }}
          />

          {/* Logo */}
          <div className="relative z-10">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-lg font-medium tracking-tighter text-white">SENDCOMMS</span>
            </Link>
          </div>

          {/* Testimonial / Art Content */}
          <div className="relative z-10 max-w-lg">
            <svg className="w-6 h-6 text-zinc-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xl font-light leading-relaxed text-zinc-300 tracking-tight">
              &ldquo;SendComms has transformed how we communicate with customers across Africa. One API for SMS, email, airtime, and data - it&apos;s exactly what we needed.&rdquo;
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-400 font-medium">AK</div>
              <div>
                <p className="text-sm font-medium text-white">Amara Kofi</p>
                <p className="text-xs text-zinc-500">CTO, TechAfrica Inc.</p>
              </div>
            </div>
          </div>

          {/* Footer Meta */}
          <div className="relative z-10 flex justify-between items-end text-xs text-zinc-600 font-medium uppercase tracking-widest">
            <span>API Status: Operational</span>
            <span>© 2024 SendComms</span>
          </div>
        </div>

        {/* Right Panel: Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-black relative z-20">
          
          {/* Mobile Logo (Visible only on small screens) */}
          <div className="absolute top-8 left-8 lg:hidden">
            <Link href="/">
              <span className="text-lg font-medium tracking-tighter text-white">SENDCOMMS</span>
            </Link>
          </div>

          <div className="w-full max-w-[380px] space-y-8">
            
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-medium tracking-tight text-white">Welcome back</h1>
              <p className="text-sm text-zinc-500 font-normal">Enter your credentials to access the dashboard.</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400 text-center">{error}</p>
              </div>
            )}

            {/* Form */}
            <form className="space-y-5" onSubmit={handleEmailLogin}>
              
              {/* Email Input */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-zinc-400 block ml-1">Email address</label>
                <div className="relative group">
                  <input 
                    type="email" 
                    id="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all placeholder-zinc-700 shadow-sm" 
                    placeholder="name@company.com" 
                    autoComplete="email"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-medium text-zinc-400 block ml-1">Password</label>
                <div className="relative group">
                  <input 
                    type="password" 
                    id="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all placeholder-zinc-700 shadow-sm" 
                    placeholder="••••••••" 
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Actions: Checkbox & Link */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center">
                  <label className="relative flex items-center cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-4 h-4 border border-zinc-700 rounded bg-zinc-900 peer-checked:bg-white peer-checked:border-white transition-all duration-200 flex items-center justify-center">
                      {rememberMe && (
                        <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="ml-2 text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors select-none">Remember for 30 days</span>
                  </label>
                </div>
                <Link href="/forgot-password" className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-white text-black hover:bg-zinc-200 focus:ring-4 focus:ring-zinc-800 font-medium rounded-lg text-sm px-5 py-3 text-center transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-900"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-black px-2 text-zinc-600 tracking-wider">Or continue with</span>
              </div>
            </div>

            {/* Social Login */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleOAuthLogin('github')}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 text-white rounded-lg py-2.5 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-[18px] h-[18px] text-zinc-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="text-xs font-medium text-zinc-400 group-hover:text-white transition-colors">GitHub</span>
              </button>
              <button 
                onClick={() => handleOAuthLogin('google')}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 text-white rounded-lg py-2.5 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-[18px] h-[18px] text-zinc-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-xs font-medium text-zinc-400 group-hover:text-white transition-colors">Google</span>
              </button>
            </div>

            {/* Footer Sign Up */}
            <p className="text-center text-xs text-zinc-500 pt-4">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-medium text-white hover:underline decoration-zinc-500 underline-offset-4 transition-all">
                Request access
              </Link>
            </p>

          </div>
          
          {/* Bottom Right Help */}
          <div className="absolute bottom-8 right-8">
            <Link href="/docs" className="flex items-center gap-2 text-zinc-600 hover:text-zinc-400 transition-colors">
              <span className="text-xs font-medium">Help &amp; Support</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
