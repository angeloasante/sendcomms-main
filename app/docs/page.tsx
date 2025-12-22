'use client';

import Link from 'next/link';

export default function DocsIntroPage() {
  return (
    <>
      <div className="text-sm font-medium text-blue-500 mb-2">Documentation</div>
      <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Introduction to SendComms</h1>
      
      <div className="flex items-center gap-3 mb-6">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          All Systems Operational
        </span>
        <span className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
          API v1
        </span>
      </div>

      <p className="text-gray-400 leading-relaxed mb-8 border-b border-white/5 pb-8">
        A unified communications API for Africa. Send emails, SMS, purchase airtime 
        and data bundles - all through a single, powerful API.
      </p>

      {/* Quick Links */}
      <div className="mb-10">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/docs/quickstart" className="group p-4 bg-[#121316] border border-white/10 rounded-lg hover:border-blue-500/50 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg">🚀</span>
              <h3 className="text-white font-semibold text-sm">Quick Start</h3>
            </div>
            <p className="text-gray-500 text-xs">Get up and running in under 5 minutes</p>
          </Link>

          <Link href="/docs/api/email" className="group p-4 bg-[#121316] border border-white/10 rounded-lg hover:border-blue-500/50 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg">📧</span>
              <h3 className="text-white font-semibold text-sm">Email API</h3>
            </div>
            <p className="text-gray-500 text-xs">Send transactional and marketing emails</p>
          </Link>

          <Link href="/docs/api/sms" className="group p-4 bg-[#121316] border border-white/10 rounded-lg hover:border-blue-500/50 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg">💬</span>
              <h3 className="text-white font-semibold text-sm">SMS API</h3>
            </div>
            <p className="text-gray-500 text-xs">SMS across 50+ African countries</p>
          </Link>

          <Link href="/docs/api/data" className="group p-4 bg-[#121316] border border-white/10 rounded-lg hover:border-blue-500/50 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg">📱</span>
              <h3 className="text-white font-semibold text-sm">Airtime & Data</h3>
            </div>
            <p className="text-gray-500 text-xs">Top-up mobile credit and data bundles</p>
          </Link>
        </div>
      </div>

      {/* What is SendComms */}
      <div className="mb-10">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">What is SendComms?</h2>
        <div className="bg-[#121316] border border-white/10 rounded-lg p-6">
          <p className="text-gray-300 text-sm leading-relaxed mb-6">
            SendComms is a B2B API platform that enables developers and businesses to integrate 
            multiple communication services across Africa through a single, unified API. Instead 
            of integrating separately with SMS providers, email services, and mobile top-up platforms, 
            businesses can use SendComms as a single integration point.
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">The Problem</h4>
              <ul className="space-y-2 text-gray-400 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">✗</span>
                  Different SMS providers for different countries
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">✗</span>
                  Separate integrations for email, airtime, data
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">✗</span>
                  Complex webhook management across providers
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">✗</span>
                  Inconsistent API formats and authentication
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">The Solution</h4>
              <ul className="space-y-2 text-gray-400 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <strong className="text-white">One API</strong> to send SMS across 50+ countries
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <strong className="text-white">One API</strong> for transactional and marketing emails
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <strong className="text-white">One API</strong> to purchase airtime for any carrier
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <strong className="text-white">One API</strong> to purchase mobile data bundles
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* API Overview */}
      <div className="mb-10">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">API Overview</h2>
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#16181b]">
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Service</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Endpoint</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="bg-[#0b0c0e] hover:bg-[#121316] transition-colors">
                <td className="py-3 px-4 text-sm text-white font-medium">Email - Single</td>
                <td className="py-3 px-4 text-sm text-blue-400 font-mono text-xs">/api/v1/email/send</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400">Live</span></td>
              </tr>
              <tr className="bg-[#0b0c0e] hover:bg-[#121316] transition-colors">
                <td className="py-3 px-4 text-sm text-white font-medium">Email - Batch</td>
                <td className="py-3 px-4 text-sm text-blue-400 font-mono text-xs">/api/v1/email/batch</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400">Live</span></td>
              </tr>
              <tr className="bg-[#0b0c0e] hover:bg-[#121316] transition-colors">
                <td className="py-3 px-4 text-sm text-white font-medium">Webhooks</td>
                <td className="py-3 px-4 text-sm text-blue-400 font-mono text-xs">/api/v1/webhooks</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400">Live</span></td>
              </tr>
              <tr className="bg-[#0b0c0e] hover:bg-[#121316] transition-colors">
                <td className="py-3 px-4 text-sm text-white font-medium">SMS</td>
                <td className="py-3 px-4 text-sm text-blue-400 font-mono text-xs">/api/v1/sms/send</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-400">Coming Soon</span></td>
              </tr>
              <tr className="bg-[#0b0c0e] hover:bg-[#121316] transition-colors">
                <td className="py-3 px-4 text-sm text-white font-medium">Airtime</td>
                <td className="py-3 px-4 text-sm text-blue-400 font-mono text-xs">/api/v1/airtime/purchase</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-400">Coming Soon</span></td>
              </tr>
              <tr className="bg-[#0b0c0e] hover:bg-[#121316] transition-colors">
                <td className="py-3 px-4 text-sm text-white font-medium">Data Bundles</td>
                <td className="py-3 px-4 text-sm text-blue-400 font-mono text-xs">/api/v1/data/purchase</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-400">Coming Soon</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Base URL */}
      <div className="mb-10">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Base URL</h2>
        <div className="bg-[#121316] border border-white/10 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-3">All API requests should be made to:</p>
          <div className="bg-[#0b0c0e] border border-white/5 rounded p-3 font-mono text-sm text-blue-400">
            https://api.sendcomms.com/v1
          </div>
          <p className="text-gray-500 text-xs mt-3">
            For local development: <code className="text-gray-400">http://localhost:3000/api/v1</code>
          </p>
        </div>
      </div>

      {/* Authentication */}
      <div className="mb-10">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Authentication</h2>
        <div className="bg-[#121316] border border-white/10 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-3">
            All API requests require authentication using Bearer tokens in the Authorization header:
          </p>
          <div className="bg-[#0b0c0e] border border-white/5 rounded p-3 font-mono text-sm mb-4">
            <span className="text-gray-500">Authorization:</span> <span className="text-green-400">Bearer</span> <span className="text-blue-400">YOUR_API_KEY</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0b0c0e] border border-white/5 rounded p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Production Keys</p>
              <code className="text-blue-400 text-xs">ac_live_</code><span className="text-gray-400 text-xs">+ 48 hex chars</span>
            </div>
            <div className="bg-[#0b0c0e] border border-white/5 rounded p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Test Keys</p>
              <code className="text-yellow-400 text-xs">ac_test_</code><span className="text-gray-400 text-xs">+ 48 hex chars</span>
            </div>
          </div>
        </div>
      </div>

      {/* Who Uses SendComms */}
      <div className="mb-10">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Who Uses SendComms?</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#121316] border border-white/10 rounded-lg p-4">
            <div className="text-xl mb-2">🏦</div>
            <h4 className="text-white font-semibold text-sm mb-1">Fintech</h4>
            <p className="text-gray-500 text-xs">OTPs, alerts, rewards</p>
          </div>
          <div className="bg-[#121316] border border-white/10 rounded-lg p-4">
            <div className="text-xl mb-2">🛒</div>
            <h4 className="text-white font-semibold text-sm mb-1">E-commerce</h4>
            <p className="text-gray-500 text-xs">Orders, shipping, promos</p>
          </div>
          <div className="bg-[#121316] border border-white/10 rounded-lg p-4">
            <div className="text-xl mb-2">💼</div>
            <h4 className="text-white font-semibold text-sm mb-1">SaaS</h4>
            <p className="text-gray-500 text-xs">Notifications, onboarding</p>
          </div>
          <div className="bg-[#121316] border border-white/10 rounded-lg p-4">
            <div className="text-xl mb-2">🎁</div>
            <h4 className="text-white font-semibold text-sm mb-1">Loyalty</h4>
            <p className="text-gray-500 text-xs">Airtime/data rewards</p>
          </div>
          <div className="bg-[#121316] border border-white/10 rounded-lg p-4">
            <div className="text-xl mb-2">👥</div>
            <h4 className="text-white font-semibold text-sm mb-1">HR/Payroll</h4>
            <p className="text-gray-500 text-xs">Payslips, allowances</p>
          </div>
          <div className="bg-[#121316] border border-white/10 rounded-lg p-4">
            <div className="text-xl mb-2">🏥</div>
            <h4 className="text-white font-semibold text-sm mb-1">Healthcare</h4>
            <p className="text-gray-500 text-xs">Reminders, results</p>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between border-t border-white/10 pt-8 mt-12">
        <div></div>
        <Link href="/docs/quickstart" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
          Quick Start
          <svg className="w-4 h-4 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </>
  );
}
