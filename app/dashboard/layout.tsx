'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';

interface UserData {
  id: string;
  email: string;
  name: string;
  plan: string;
  initials: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const supabase = createClient();

  // Fetch user data on mount
  useEffect(() => {
    async function fetchUser() {
      try {
        // Get authenticated user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          router.push('/login');
          return;
        }

        // Fetch customer data from API (handles creation if needed)
        const response = await fetch('/api/v1/customer');
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error fetching customer:', errorData);
          
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          if (response.status === 403) {
            router.push('/login?error=account_inactive');
            return;
          }
          router.push('/login?error=customer_fetch_failed');
          return;
        }

        const customer = await response.json();

        if (customer) {
          // Generate initials from name
          const nameParts = customer.name.split(' ');
          const initials = nameParts.length >= 2 
            ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
            : customer.name.substring(0, 2).toUpperCase();

          setUser({
            id: customer.id,
            email: customer.email,
            name: customer.name,
            plan: customer.plan || 'free',
            initials,
          });
        }
      } catch (error) {
        console.error('Error:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [router, supabase]);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isActive = (path: string) => pathname === path;
  const isActiveSection = (path: string) => pathname.startsWith(path);

  // Get current page name for breadcrumb
  const getPageName = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.includes('/emails')) return 'Emails';
    if (pathname.includes('/sms')) return 'SMS';
    if (pathname.includes('/api-keys')) return 'API Keys';
    if (pathname.includes('/usage')) return 'Analytics';
    if (pathname.includes('/webhooks')) return 'Webhooks';
    if (pathname.includes('/billing')) return 'Billing';
    return 'Dashboard';
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-muted-foreground antialiased">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          bg-sidebar border-r border-sidebar-border 
          flex flex-col shrink-0
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-[260px] translate-x-0' : 'w-[260px] -translate-x-full lg:w-0 lg:translate-x-0 lg:overflow-hidden'}
        `}
      >
        <div className={`w-[260px] flex flex-col h-full ${!sidebarOpen && 'lg:opacity-0'} transition-opacity duration-200`}>
          {/* Organization Switcher */}
          <div className="p-4 pt-5 pb-2">
            <button className="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors group">
              <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="SendComms" className="w-12 h-12 object-contain" />
                <div className="text-left">
                  <div className="text-xs font-semibold text-sidebar-foreground group-hover:text-sidebar-foreground transition-colors">SendComms</div>
                  <div className="text-[10px] text-muted-foreground capitalize">{user?.plan || 'Free'} Plan · API Access</div>
                </div>
              </div>
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Platform</div>
            
            <Link 
              href="/dashboard" 
              className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/dashboard') 
                  ? 'text-sidebar-foreground bg-sidebar-accent border border-sidebar-border' 
                  : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Dashboard
            </Link>

            <Link 
              href="/dashboard/emails" 
              className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActiveSection('/dashboard/emails') 
                  ? 'text-sidebar-foreground bg-sidebar-accent border border-sidebar-border' 
                  : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Emails
            </Link>

            <Link 
              href="/dashboard/sms" 
              className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActiveSection('/dashboard/sms') 
                  ? 'text-sidebar-foreground bg-sidebar-accent border border-sidebar-border' 
                  : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              SMS
            </Link>

            <Link 
              href="/dashboard/data" 
              className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActiveSection('/dashboard/data') 
                  ? 'text-sidebar-foreground bg-sidebar-accent border border-sidebar-border' 
                  : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              Data Bundles
            </Link>

            <Link 
              href="/dashboard/api-keys" 
              className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActiveSection('/dashboard/api-keys') 
                  ? 'text-sidebar-foreground bg-sidebar-accent border border-sidebar-border' 
                  : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              API Keys
            </Link>
            
            <Link 
              href="/dashboard/settings/webhooks" 
              className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActiveSection('/dashboard/settings/webhooks') 
                  ? 'text-sidebar-foreground bg-sidebar-accent border border-sidebar-border' 
                  : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Webhooks
            </Link>

            <div className="px-3 mt-6 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Resources</div>

            <Link 
              href="/docs" 
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Documentation
            </Link>

            <Link 
              href="/dashboard/billing" 
              className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActiveSection('/dashboard/billing') 
                  ? 'text-sidebar-foreground bg-sidebar-accent border border-sidebar-border' 
                  : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Billing
            </Link>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-sidebar-border space-y-3">
            <button className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-sidebar-accent border border-sidebar-border rounded-lg shadow-sm group hover:border-border transition-all">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-sidebar-accent">
                  <svg className="w-3.5 h-3.5 text-sidebar-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-sidebar-foreground">Ask SendComms AI</span>
              </div>
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center gap-3 px-2 py-1 hover:bg-sidebar-accent rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {loading ? '...' : user?.initials || 'U'}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-xs font-medium text-sidebar-foreground truncate">
                    {loading ? 'Loading...' : user?.name || 'Your Account'}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {loading ? '' : user?.email || 'user@sendcomms.com'}
                  </div>
                </div>
                <svg className={`w-3 h-3 text-muted-foreground transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-border">
                    <div className="text-xs text-muted-foreground">Signed in as</div>
                    <div className="text-sm text-popover-foreground font-medium truncate">{user?.email}</div>
                  </div>
                  <div className="py-1">
                    <Link 
                      href="/dashboard/settings" 
                      className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>
                    <Link 
                      href="/dashboard/billing" 
                      className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Billing
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded capitalize">{user?.plan}</span>
                    </Link>
                  </div>
                  <div className="border-t border-border py-1">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Top Bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="h-4 w-px bg-border hidden lg:block"></div>
            
            {/* Sidebar toggle for desktop - Panel icon like shadcn */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
              </svg>
            </button>
            
            {/* Breadcrumb */}
            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
              <span>Platform</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-foreground font-medium">{getPageName()}</span>
            </div>
          </div>


          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </button>
            <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors relative">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-background"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
}
