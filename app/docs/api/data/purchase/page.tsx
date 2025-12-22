'use client';

import Link from 'next/link';
import { useState } from 'react';

type Language = 'curl' | 'nodejs' | 'python' | 'php';

const codeExamples: Record<Language, string> = {
  curl: `curl -X POST \\
  https://api.sendcomms.com/api/v1/data/purchase \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone_number": "0540800994",
    "network": "mtn",
    "capacity_gb": 1,
    "reference": "order-123",
    "metadata": {
      "user_id": "usr_abc123",
      "order_id": "ord_xyz789"
    }
  }'`,
  nodejs: `import axios from 'axios';

const response = await axios.post(
  'https://api.sendcomms.com/api/v1/data/purchase',
  {
    phone_number: '0540800994',
    network: 'mtn',
    capacity_gb: 1,
    reference: 'order-123',
    metadata: {
      user_id: 'usr_abc123',
      order_id: 'ord_xyz789'
    }
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
const res = await fetch('https://api.sendcomms.com/api/v1/data/purchase', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phone_number: '0540800994',
    network: 'mtn',
    capacity_gb: 1
  })
});`,
  python: `import requests

response = requests.post(
    'https://api.sendcomms.com/api/v1/data/purchase',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'phone_number': '0540800994',
        'network': 'mtn',
        'capacity_gb': 1,
        'reference': 'order-123',
        'metadata': {
            'user_id': 'usr_abc123'
        }
    }
)

result = response.json()
print(result)

# Check transaction status
transaction_id = result['data']['transaction_id']
status = requests.get(
    f'https://api.sendcomms.com/api/v1/data/purchase?transaction_id={transaction_id}',
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)`,
  php: `<?php

$curl = curl_init();

$data = [
    'phone_number' => '0540800994',
    'network' => 'mtn',
    'capacity_gb' => 1,
    'reference' => 'order-123',
    'metadata' => [
        'user_id' => 'usr_abc123'
    ]
];

curl_setopt_array($curl, [
    CURLOPT_URL => 'https://api.sendcomms.com/api/v1/data/purchase',
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

export default function PurchaseDataDocsPage() {
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
      <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Purchase Data Bundle</h1>
      
      <div className="flex items-center gap-3 font-mono text-sm bg-[#16181b] border border-white/10 rounded-lg p-1.5 pr-4 w-fit mb-6">
        <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-900/40 text-green-400 border border-green-500/20">POST</span>
        <span className="text-gray-300">/api/v1/data/purchase</span>
      </div>

      <div className="flex items-start justify-between mb-8 border-b border-white/5 pb-8">
        <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
          Purchase mobile data bundles for Ghana networks. Supports MTN, Telecel (Vodafone), and AirtelTigo. 
          Data is delivered instantly or within minutes depending on the network.
        </p>
      </div>

      <div className="bg-[#1a1410] border border-orange-500/20 rounded-lg py-3 px-4 mb-6 flex items-center gap-2 text-sm text-orange-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        This endpoint charges your account balance. Ensure sufficient funds before making purchases.
      </div>

      {/* Phone Number Formats */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Accepted Phone Formats</h3>
        <div className="bg-[#16181b] border border-white/10 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Local:</span>
              <span className="text-white font-mono ml-2">0540800994</span>
            </div>
            <div>
              <span className="text-gray-500">With code:</span>
              <span className="text-white font-mono ml-2">233540800994</span>
            </div>
            <div>
              <span className="text-gray-500">International:</span>
              <span className="text-white font-mono ml-2">+233540800994</span>
            </div>
          </div>
        </div>
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
                <td className="py-3 px-4 text-sm text-green-400 font-mono">phone_number</td>
                <td className="py-3 px-4 text-xs text-gray-400">string</td>
                <td className="py-3 px-4"><span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs border border-red-500/20">Required</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Recipient&apos;s Ghana phone number</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-green-400 font-mono">network</td>
                <td className="py-3 px-4 text-xs text-gray-400">string</td>
                <td className="py-3 px-4"><span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs border border-red-500/20">Required</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">mtn, telecel, vodafone, or airteltigo</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-green-400 font-mono">capacity_gb</td>
                <td className="py-3 px-4 text-xs text-gray-400">number</td>
                <td className="py-3 px-4"><span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs border border-red-500/20">Required</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Data amount in GB (1, 2, 5, 10, etc.)</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-green-400 font-mono">reference</td>
                <td className="py-3 px-4 text-xs text-gray-400">string</td>
                <td className="py-3 px-4"><span className="bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded text-xs border border-gray-500/20">Optional</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Your internal reference ID</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-green-400 font-mono">metadata</td>
                <td className="py-3 px-4 text-xs text-gray-400">object</td>
                <td className="py-3 px-4"><span className="bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded text-xs border border-gray-500/20">Optional</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Custom key-value data for your records</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-10">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Response Codes</h3>
        <div className="flex flex-wrap items-center gap-3 bg-[#16181b] border border-white/10 rounded-lg p-3">
          <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-xs font-mono border border-green-500/20">201</span>
          <span className="text-sm text-gray-400">Created</span>
          <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs font-mono border border-red-500/20 ml-4">400</span>
          <span className="text-sm text-gray-400">Bad request</span>
          <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs font-mono border border-red-500/20 ml-4">401</span>
          <span className="text-sm text-gray-400">Unauthorized</span>
          <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs font-mono border border-red-500/20 ml-4">402</span>
          <span className="text-sm text-gray-400">Insufficient balance</span>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Response</h3>
        <div className="bg-[#121316] border border-white/5 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-3">Success Response</h4>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            Returns the transaction details including status and provider references.
          </p>
          <pre className="bg-[#0b0c0e] p-4 rounded-lg text-sm overflow-x-auto border border-white/5">
            <code className="text-green-400">{`{
  "success": true,
  "data": {
    "transaction_id": "data_mjgodtyl_51c55a845f34",
    "status": "processing",
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
    "message": "Order placed successfully. Processing manually (may take a few minutes).",
    "reference": "order-123",
    "created_at": "2025-12-22T04:48:10.428Z"
  }
}`}</code>
          </pre>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Transaction Statuses</h3>
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#16181b]">
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4"><span className="bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded text-xs border border-gray-500/20">pending</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Order created, not yet sent to provider</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4"><span className="bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded text-xs border border-yellow-500/20">processing</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Sent to provider, awaiting confirmation</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4"><span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-xs border border-blue-500/20">sent</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Provider confirmed, data being delivered</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4"><span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-xs border border-green-500/20">delivered</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Data successfully delivered to recipient</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4"><span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs border border-red-500/20">failed</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Purchase failed - check failure_reason</td>
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
          <strong>Note:</strong> Some orders are processed manually by the network provider and may take a few minutes. 
          Check the <code className="bg-blue-500/20 px-1 rounded">processing_method</code> field in the response. 
          Use webhooks or poll the status endpoint for updates.
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-8 mt-12">
        <Link href="/docs/api/data" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
          <svg className="w-4 h-4 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          List Packages
        </Link>
        <Link href="/docs/api/data/status" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
          Check Status
          <svg className="w-4 h-4 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </>
  );
}
