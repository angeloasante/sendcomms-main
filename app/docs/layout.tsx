'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isEmailSection = pathname.startsWith('/docs/api/email');
  const isDataSection = pathname.startsWith('/docs/api/data');
  const [emailDropdownOpen, setEmailDropdownOpen] = useState(isEmailSection);
  const [dataDropdownOpen, setDataDropdownOpen] = useState(isDataSection);

  // Auto-open dropdown when navigating to email section
  useEffect(() => {
    if (isEmailSection) {
      setEmailDropdownOpen(true);
    }
  }, [isEmailSection]);

  // Auto-open dropdown when navigating to data section
  useEffect(() => {
    if (isDataSection) {
      setDataDropdownOpen(true);
    }
  }, [isDataSection]);

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-[#e5e5e5] antialiased">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-white/5 bg-[#0b0c0e] flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="SendComms" className="w-6 h-6 object-contain" />
              <span className="text-lg font-bold tracking-tight text-white">SendComms</span>
            </Link>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1c1e21] text-gray-400 border border-white/5">v1.0.0</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors">
            Dashboard
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-[280px] bg-[#0b0c0e] border-r border-white/5 h-[calc(100vh-64px)] sticky top-16 hidden md:flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5">
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <div className="pb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 px-2">Overview</h3>
              <Link 
                href="/docs" 
                className={`block px-2 py-1.5 text-sm rounded transition-colors ${
                  isActive('/docs') 
                    ? 'text-blue-400 bg-blue-500/10 font-medium' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Introduction
              </Link>
              <Link 
                href="/docs/quickstart" 
                className={`block px-2 py-1.5 text-sm rounded transition-colors ${
                  isActive('/docs/quickstart') 
                    ? 'text-blue-400 bg-blue-500/10 font-medium' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Quick Start
              </Link>
              <Link href="/docs/authentication" className="block px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors">Authentication</Link>
              <Link href="/docs/rate-limits" className="block px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors">Rate Limits</Link>
            </div>

            <div>
              <button 
                onClick={() => setEmailDropdownOpen(!emailDropdownOpen)}
                className={`flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium rounded transition-colors ${isEmailSection || emailDropdownOpen ? 'text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                Email API
                <svg className={`w-4 h-4 transition-transform ${emailDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {emailDropdownOpen && (
                <div className="relative ml-2 pl-4 mt-1 space-y-0.5">
                  <div className="absolute left-2 top-0 bottom-2 w-px bg-white/10"></div>
                  <Link 
                    href="/docs/api/email" 
                    className={`block px-3 py-1.5 text-sm transition-colors border-l ${
                      isActive('/docs/api/email') 
                        ? 'text-blue-400 bg-blue-500/5 font-medium border-blue-500' 
                        : 'text-gray-400 hover:text-white border-transparent hover:border-gray-600'
                    }`}
                  >
                    Send Email
                  </Link>
                  <Link 
                    href="/docs/api/email/batch" 
                    className={`block px-3 py-1.5 text-sm transition-colors border-l ${
                      isActive('/docs/api/email/batch') 
                        ? 'text-blue-400 bg-blue-500/5 font-medium border-blue-500' 
                        : 'text-gray-400 hover:text-white border-transparent hover:border-gray-600'
                    }`}
                  >
                    Batch Send
                  </Link>
                  <Link 
                    href="/docs/api/email/webhooks" 
                    className={`block px-3 py-1.5 text-sm transition-colors border-l ${
                      isActive('/docs/api/email/webhooks') 
                        ? 'text-blue-400 bg-blue-500/5 font-medium border-blue-500' 
                        : 'text-gray-400 hover:text-white border-transparent hover:border-gray-600'
                    }`}
                  >
                    Webhooks
                  </Link>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button 
                onClick={() => setDataDropdownOpen(!dataDropdownOpen)}
                className={`flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium rounded transition-colors ${isDataSection || dataDropdownOpen ? 'text-green-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                Data Bundles API
                <svg className={`w-4 h-4 transition-transform ${dataDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {dataDropdownOpen && (
                <div className="relative ml-2 pl-4 mt-1 space-y-0.5">
                  <div className="absolute left-2 top-0 bottom-2 w-px bg-white/10"></div>
                  <Link 
                    href="/docs/api/data" 
                    className={`block px-3 py-1.5 text-sm transition-colors border-l ${
                      isActive('/docs/api/data') 
                        ? 'text-green-400 bg-green-500/5 font-medium border-green-500' 
                        : 'text-gray-400 hover:text-white border-transparent hover:border-gray-600'
                    }`}
                  >
                    List Packages
                  </Link>
                  <Link 
                    href="/docs/api/data/purchase" 
                    className={`block px-3 py-1.5 text-sm transition-colors border-l ${
                      isActive('/docs/api/data/purchase') 
                        ? 'text-green-400 bg-green-500/5 font-medium border-green-500' 
                        : 'text-gray-400 hover:text-white border-transparent hover:border-gray-600'
                    }`}
                  >
                    Purchase Data
                  </Link>
                  <Link 
                    href="/docs/api/data/status" 
                    className={`block px-3 py-1.5 text-sm transition-colors border-l ${
                      isActive('/docs/api/data/status') 
                        ? 'text-green-400 bg-green-500/5 font-medium border-green-500' 
                        : 'text-gray-400 hover:text-white border-transparent hover:border-gray-600'
                    }`}
                  >
                    Check Status
                  </Link>
                </div>
              )}
            </div>

            <div className="pt-4">
              <button className="flex items-center justify-between w-full px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors">
                SMS API
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Soon</span>
              </button>
            </div>

            <div className="pt-2">
              <button className="flex items-center justify-between w-full px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors">
                Airtime API
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Soon</span>
              </button>
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              All systems operational
            </div>
          </div>
        </aside>

        {/* Center Content */}
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-64px)]">
          <div className="max-w-4xl mx-auto px-8 py-10 pb-32">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
