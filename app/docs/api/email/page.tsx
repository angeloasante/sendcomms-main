'use client';

import Link from 'next/link';
import { useState } from 'react';

type Language = 'curl' | 'nodejs' | 'python' | 'php';

const codeExamples: Record<Language, string> = {
  curl: `curl -X POST \\
  https://api.sendcomms.com/v1/email/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "user@example.com",
    "subject": "Welcome to our platform!",
    "html": "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
    "from": "Your App <hello@yourdomain.com>"
  }'`,
  nodejs: `import axios from 'axios';

const response = await axios.post(
  'https://api.sendcomms.com/v1/email/send',
  {
    to: 'user@example.com',
    subject: 'Welcome to our platform!',
    html: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
    from: 'Your App <hello@yourdomain.com>'
  },
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    }
  }
);

console.log(response.data);

// Using fetch
const res = await fetch('https://api.sendcomms.com/v1/email/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Welcome to our platform!',
    html: '<h1>Welcome!</h1><p>Thanks for signing up.</p>'
  })
});`,
  python: `import requests

response = requests.post(
    'https://api.sendcomms.com/v1/email/send',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'to': 'user@example.com',
        'subject': 'Welcome to our platform!',
        'html': '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
        'from': 'Your App <hello@yourdomain.com>'
    }
)

print(response.json())

# Using httpx (async)
import httpx

async with httpx.AsyncClient() as client:
    response = await client.post(
        'https://api.sendcomms.com/v1/email/send',
        headers={'Authorization': 'Bearer YOUR_API_KEY'},
        json={
            'to': 'user@example.com',
            'subject': 'Welcome!',
            'html': '<h1>Welcome!</h1>'
        }
    )`,
  php: `<?php

$curl = curl_init();

$data = [
    'to' => 'user@example.com',
    'subject' => 'Welcome to our platform!',
    'html' => '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
    'from' => 'Your App <hello@yourdomain.com>'
];

curl_setopt_array($curl, [
    CURLOPT_URL => 'https://api.sendcomms.com/v1/email/send',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($data),
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer YOUR_API_KEY',
        'Content-Type: application/json'
    ]
]);

$response = curl_exec($curl);
curl_close($curl);

$result = json_decode($response, true);
print_r($result);`
};

export default function SendEmailDocsPage() {
  const [selectedLang, setSelectedLang] = useState<Language>('curl');

  const languages: { id: Language; name: string; icon: string }[] = [
    { id: 'curl', name: 'cURL', icon: '🌐' },
    { id: 'nodejs', name: 'Node.js', icon: '📦' },
    { id: 'python', name: 'Python', icon: '🐍' },
    { id: 'php', name: 'PHP', icon: '🐘' },
  ];

  return (
    <>
      <div className="text-sm font-medium text-blue-500 mb-2">Email API</div>
      <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Send Email</h1>
      
      <div className="flex items-center gap-3 font-mono text-sm bg-[#16181b] border border-white/10 rounded-lg p-1.5 pr-4 w-fit mb-6">
        <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-900/40 text-green-400 border border-green-500/20">POST</span>
        <span className="text-gray-300">/api/v1/email/send</span>
      </div>

      <div className="flex items-start justify-between mb-8 border-b border-white/5 pb-8">
        <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
          Send transactional emails to one or more recipients. Supports HTML content, attachments, and custom headers.
          Perfect for welcome emails, password resets, notifications, and more.
        </p>
      </div>

      <div className="bg-[#1a1410] border border-orange-500/20 rounded-lg py-3 px-4 mb-6 flex items-center gap-2 text-sm text-orange-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Requires API key authentication. Include your key in the Authorization header.
      </div>

      {/* Language Selector */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Select Language</h3>
        <div className="flex gap-2">
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setSelectedLang(lang.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                selectedLang === lang.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-[#16181b] text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              <span>{lang.icon}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Code Example */}
      <div className="mb-10">
        <div className="bg-[#121316] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-[#1a1c20] border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">REQUEST</span>
            <button 
              onClick={() => navigator.clipboard.writeText(codeExamples[selectedLang])}
              className="text-gray-500 hover:text-white transition-colors text-xs flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
          </div>
          <div className="p-4">
            <pre className="font-mono text-xs leading-relaxed bg-[#0b0c0e] p-4 rounded border border-white/5 overflow-x-auto">
              <code className="text-gray-300">{codeExamples[selectedLang]}</code>
            </pre>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Request Body</h3>
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#16181b]">
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Parameter</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Required</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-blue-400 font-mono">to</td>
                <td className="py-3 px-4 text-xs text-gray-400">string | string[]</td>
                <td className="py-3 px-4"><span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs border border-red-500/20">Required</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Recipient email address(es)</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-blue-400 font-mono">subject</td>
                <td className="py-3 px-4 text-xs text-gray-400">string</td>
                <td className="py-3 px-4"><span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs border border-red-500/20">Required</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Email subject line</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-blue-400 font-mono">html</td>
                <td className="py-3 px-4 text-xs text-gray-400">string</td>
                <td className="py-3 px-4"><span className="bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded text-xs border border-yellow-500/20">Conditional</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">HTML content (required if no text)</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-blue-400 font-mono">text</td>
                <td className="py-3 px-4 text-xs text-gray-400">string</td>
                <td className="py-3 px-4"><span className="bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded text-xs border border-yellow-500/20">Conditional</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Plain text (required if no html)</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-blue-400 font-mono">from</td>
                <td className="py-3 px-4 text-xs text-gray-400">string</td>
                <td className="py-3 px-4"><span className="bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded text-xs border border-gray-500/20">Optional</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Sender address</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-blue-400 font-mono">replyTo</td>
                <td className="py-3 px-4 text-xs text-gray-400">string | string[]</td>
                <td className="py-3 px-4"><span className="bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded text-xs border border-gray-500/20">Optional</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Reply-to address(es)</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-blue-400 font-mono">cc</td>
                <td className="py-3 px-4 text-xs text-gray-400">string | string[]</td>
                <td className="py-3 px-4"><span className="bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded text-xs border border-gray-500/20">Optional</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">CC recipients</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-blue-400 font-mono">bcc</td>
                <td className="py-3 px-4 text-xs text-gray-400">string | string[]</td>
                <td className="py-3 px-4"><span className="bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded text-xs border border-gray-500/20">Optional</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">BCC recipients</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-10">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Response Codes</h3>
        <div className="flex flex-wrap items-center gap-3 bg-[#16181b] border border-white/10 rounded-lg p-3">
          <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-xs font-mono border border-green-500/20">200</span>
          <span className="text-sm text-gray-400">Success</span>
          <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs font-mono border border-red-500/20 ml-4">400</span>
          <span className="text-sm text-gray-400">Bad request</span>
          <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs font-mono border border-red-500/20 ml-4">401</span>
          <span className="text-sm text-gray-400">Unauthorized</span>
          <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs font-mono border border-red-500/20 ml-4">402</span>
          <span className="text-sm text-gray-400">No balance</span>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Response</h3>
        <div className="bg-[#121316] border border-white/5 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-3">Success Response</h4>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            When an email is successfully queued for delivery, you&apos;ll receive a response containing the transaction ID and email details.
          </p>
          <pre className="bg-[#0b0c0e] p-4 rounded-lg text-sm overflow-x-auto border border-white/5">
            <code className="text-green-400">{`{
  "success": true,
  "data": {
    "id": "email_abc123xyz",
    "email_id": "re_xxxxxxxxxxxx",
    "status": "sent",
    "recipients": 1,
    "cost": 0.01,
    "currency": "USD"
  }
}`}</code>
          </pre>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Pricing</h3>
        <div className="bg-[#121316] border border-white/5 rounded-lg p-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-2xl font-bold text-white">$0.001</div>
              <div className="text-sm text-gray-400">per email</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">$0.01</div>
              <div className="text-sm text-gray-400">minimum charge</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">50</div>
              <div className="text-sm text-gray-400">max recipients</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-8 mt-12">
        <Link href="/docs/authentication" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
          <svg className="w-4 h-4 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Authentication
        </Link>
        <Link href="/docs/api/email/batch" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
          Batch Email
          <svg className="w-4 h-4 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </>
  );
}
