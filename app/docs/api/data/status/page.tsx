'use client';

import Link from 'next/link';
import { useState } from 'react';

type Language = 'curl' | 'nodejs' | 'python' | 'php';

const codeExamples: Record<Language, string> = {
  curl: `# Check by transaction ID
curl -X GET \\
  "https://api.sendcomms.com/api/v1/data/purchase?transaction_id=data_mjgodtyl_51c55a845f34" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Check by your reference
curl -X GET \\
  "https://api.sendcomms.com/api/v1/data/purchase?reference=order-123" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  nodejs: `import axios from 'axios';

// Check by transaction ID
const response = await axios.get(
  'https://api.sendcomms.com/api/v1/data/purchase',
  {
    params: {
      transaction_id: 'data_mjgodtyl_51c55a845f34'
    },
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  }
);

console.log(response.data);

// Check by reference
const byRef = await axios.get(
  'https://api.sendcomms.com/api/v1/data/purchase',
  {
    params: { reference: 'order-123' },
    headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
  }
);

// Using fetch
const res = await fetch(
  'https://api.sendcomms.com/api/v1/data/purchase?transaction_id=data_abc123',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  }
);`,
  python: `import requests

# Check by transaction ID
response = requests.get(
    'https://api.sendcomms.com/api/v1/data/purchase',
    params={
        'transaction_id': 'data_mjgodtyl_51c55a845f34'
    },
    headers={
        'Authorization': 'Bearer YOUR_API_KEY'
    }
)

status = response.json()
print(status)

# Check by reference
by_ref = requests.get(
    'https://api.sendcomms.com/api/v1/data/purchase',
    params={'reference': 'order-123'},
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)

# Polling example
import time

def wait_for_delivery(transaction_id, timeout=300):
    """Poll until delivered or timeout"""
    start = time.time()
    while time.time() - start < timeout:
        resp = requests.get(
            'https://api.sendcomms.com/api/v1/data/purchase',
            params={'transaction_id': transaction_id},
            headers={'Authorization': 'Bearer YOUR_API_KEY'}
        )
        data = resp.json()['data']
        if data['status'] in ['delivered', 'failed']:
            return data
        time.sleep(10)
    return None`,
  php: `<?php

// Check by transaction ID
$curl = curl_init();

$transaction_id = 'data_mjgodtyl_51c55a845f34';
$url = "https://api.sendcomms.com/api/v1/data/purchase?transaction_id={$transaction_id}";

curl_setopt_array($curl, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer YOUR_API_KEY'
    ]
]);

$response = curl_exec($curl);
curl_close($curl);

$status = json_decode($response, true);
print_r($status);

// Check by reference
$reference = 'order-123';
$url = "https://api.sendcomms.com/api/v1/data/purchase?reference={$reference}";`
};

export default function DataStatusDocsPage() {
  const [selectedLang, setSelectedLang] = useState<Language>('curl');

  const languages: { id: Language; name: string; icon: string }[] = [
    { id: 'curl', name: 'cURL', icon: '🌐' },
    { id: 'nodejs', name: 'Node.js', icon: '📦' },
    { id: 'python', name: 'Python', icon: '🐍' },
    { id: 'php', name: 'PHP', icon: '🐘' },
  ];

  return (
    <>
      <div className="text-sm font-medium text-green-500 mb-2">Data Bundles API</div>
      <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Check Purchase Status</h1>
      
      <div className="flex items-center gap-3 font-mono text-sm bg-[#16181b] border border-white/10 rounded-lg p-1.5 pr-4 w-fit mb-6">
        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-900/40 text-blue-400 border border-blue-500/20">GET</span>
        <span className="text-gray-300">/api/v1/data/purchase</span>
      </div>

      <div className="flex items-start justify-between mb-8 border-b border-white/5 pb-8">
        <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
          Check the status of a data purchase transaction. Query by transaction ID or your custom reference. 
          Useful for verifying delivery or handling manual processing delays.
        </p>
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
                  ? 'bg-green-600 text-white' 
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
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Query Parameters</h3>
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
                <td className="py-3 px-4 text-sm text-green-400 font-mono">transaction_id</td>
                <td className="py-3 px-4 text-xs text-gray-400">string</td>
                <td className="py-3 px-4"><span className="bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded text-xs border border-yellow-500/20">Conditional</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Our transaction ID (data_xxx)</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-green-400 font-mono">reference</td>
                <td className="py-3 px-4 text-xs text-gray-400">string</td>
                <td className="py-3 px-4"><span className="bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded text-xs border border-yellow-500/20">Conditional</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Your custom reference ID</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">* Either transaction_id or reference is required</p>
      </div>

      <div className="mb-10">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Response Codes</h3>
        <div className="flex flex-wrap items-center gap-3 bg-[#16181b] border border-white/10 rounded-lg p-3">
          <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-xs font-mono border border-green-500/20">200</span>
          <span className="text-sm text-gray-400">Success</span>
          <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs font-mono border border-red-500/20 ml-4">400</span>
          <span className="text-sm text-gray-400">Missing params</span>
          <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs font-mono border border-red-500/20 ml-4">401</span>
          <span className="text-sm text-gray-400">Unauthorized</span>
          <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs font-mono border border-red-500/20 ml-4">404</span>
          <span className="text-sm text-gray-400">Not found</span>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Response</h3>
        <div className="bg-[#121316] border border-white/5 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-3">Success Response</h4>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            Returns the full transaction details including timestamps and provider references.
          </p>
          <pre className="bg-[#0b0c0e] p-4 rounded-lg text-sm overflow-x-auto border border-white/5">
            <code className="text-green-400">{`{
  "success": true,
  "data": {
    "transaction_id": "data_mjgodtyl_51c55a845f34",
    "status": "sent",
    "phone_number": "0540800994",
    "network": "mtn",
    "capacity_gb": 1,
    "price": {
      "amount": 4.72,
      "currency": "GHS"
    },
    "provider_reference": "TRX-60493ef0-bd7b-4798-8c5c-a75db2da186d",
    "order_reference": "MN-AO7732GP",
    "processing_method": "manual",
    "failure_reason": null,
    "reference": "order-123",
    "metadata": { "user_id": "usr_abc123" },
    "created_at": "2025-12-22T04:48:10.428Z",
    "sent_at": "2025-12-22T04:48:11.234Z",
    "delivered_at": null,
    "failed_at": null
  }
}`}</code>
          </pre>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Response Fields</h3>
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#16181b]">
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Field</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-green-400 font-mono">transaction_id</td>
                <td className="py-3 px-4 text-xs text-gray-400">string</td>
                <td className="py-3 px-4 text-sm text-gray-400">Our unique transaction identifier</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-green-400 font-mono">status</td>
                <td className="py-3 px-4 text-xs text-gray-400">string</td>
                <td className="py-3 px-4 text-sm text-gray-400">pending, processing, sent, delivered, failed</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-green-400 font-mono">provider_reference</td>
                <td className="py-3 px-4 text-xs text-gray-400">string</td>
                <td className="py-3 px-4 text-sm text-gray-400">Provider&apos;s transaction reference</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-green-400 font-mono">order_reference</td>
                <td className="py-3 px-4 text-xs text-gray-400">string</td>
                <td className="py-3 px-4 text-sm text-gray-400">Network order reference (e.g., MN-xxx)</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-green-400 font-mono">processing_method</td>
                <td className="py-3 px-4 text-xs text-gray-400">string</td>
                <td className="py-3 px-4 text-sm text-gray-400">auto or manual</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-green-400 font-mono">failure_reason</td>
                <td className="py-3 px-4 text-xs text-gray-400">string | null</td>
                <td className="py-3 px-4 text-sm text-gray-400">Error message if status is failed</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-green-400 font-mono">sent_at</td>
                <td className="py-3 px-4 text-xs text-gray-400">timestamp</td>
                <td className="py-3 px-4 text-sm text-gray-400">When order was sent to provider</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-green-400 font-mono">delivered_at</td>
                <td className="py-3 px-4 text-xs text-gray-400">timestamp | null</td>
                <td className="py-3 px-4 text-sm text-gray-400">When data was confirmed delivered</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#101318] border border-blue-500/20 rounded-lg py-3 px-4 mb-12 flex items-start gap-2 text-sm text-blue-400">
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <strong>Pro tip:</strong> Instead of polling, set up webhooks to receive real-time notifications when 
          transaction status changes. See the <Link href="/docs/api/email/webhooks" className="underline hover:text-white">Webhooks documentation</Link>.
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-8 mt-12">
        <Link href="/docs/api/data/purchase" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
          <svg className="w-4 h-4 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Purchase Data
        </Link>
        <Link href="/docs/api/email/webhooks" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
          Webhooks
          <svg className="w-4 h-4 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </>
  );
}
