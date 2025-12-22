'use client';

import Link from 'next/link';
import { useState } from 'react';

type Language = 'curl' | 'nodejs' | 'python' | 'php';

const codeExamples: Record<Language, string> = {
  curl: `curl -X GET \\
  https://api.sendcomms.com/api/v1/data/packages \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Filter by network
curl -X GET \\
  "https://api.sendcomms.com/api/v1/data/packages?network=mtn" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  nodejs: `import axios from 'axios';

// Get all packages
const response = await axios.get(
  'https://api.sendcomms.com/api/v1/data/packages',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  }
);

console.log(response.data);

// Filter by network
const mtnPackages = await axios.get(
  'https://api.sendcomms.com/api/v1/data/packages?network=mtn',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  }
);

// Using fetch
const res = await fetch('https://api.sendcomms.com/api/v1/data/packages', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});
const data = await res.json();`,
  python: `import requests

# Get all packages
response = requests.get(
    'https://api.sendcomms.com/api/v1/data/packages',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY'
    }
)

packages = response.json()
print(packages)

# Filter by network
mtn_packages = requests.get(
    'https://api.sendcomms.com/api/v1/data/packages',
    params={'network': 'mtn'},
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)

# Using httpx (async)
import httpx

async with httpx.AsyncClient() as client:
    response = await client.get(
        'https://api.sendcomms.com/api/v1/data/packages',
        headers={'Authorization': 'Bearer YOUR_API_KEY'}
    )`,
  php: `<?php

$curl = curl_init();

curl_setopt_array($curl, [
    CURLOPT_URL => 'https://api.sendcomms.com/api/v1/data/packages',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer YOUR_API_KEY'
    ]
]);

$response = curl_exec($curl);
curl_close($curl);

$packages = json_decode($response, true);
print_r($packages);

// Filter by network
$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => 'https://api.sendcomms.com/api/v1/data/packages?network=mtn',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer YOUR_API_KEY'
    ]
]);`
};

export default function DataPackagesDocsPage() {
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
      <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">List Data Packages</h1>
      
      <div className="flex items-center gap-3 font-mono text-sm bg-[#16181b] border border-white/10 rounded-lg p-1.5 pr-4 w-fit mb-6">
        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-900/40 text-blue-400 border border-blue-500/20">GET</span>
        <span className="text-gray-300">/api/v1/data/packages</span>
      </div>

      <div className="flex items-start justify-between mb-8 border-b border-white/5 pb-8">
        <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
          Retrieve available data bundles for Ghana mobile networks. Returns packages for MTN, Telecel (Vodafone), 
          and AirtelTigo with current pricing and availability.
        </p>
      </div>

      {/* Supported Networks */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Supported Networks</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#16181b] border border-white/10 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🟡</div>
            <div className="text-white font-semibold">MTN Ghana</div>
            <div className="text-xs text-gray-500 font-mono">mtn</div>
          </div>
          <div className="bg-[#16181b] border border-white/10 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🔴</div>
            <div className="text-white font-semibold">Telecel</div>
            <div className="text-xs text-gray-500 font-mono">telecel</div>
          </div>
          <div className="bg-[#16181b] border border-white/10 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🔵</div>
            <div className="text-white font-semibold">AirtelTigo</div>
            <div className="text-xs text-gray-500 font-mono">airteltigo</div>
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
                <td className="py-3 px-4 text-sm text-green-400 font-mono">network</td>
                <td className="py-3 px-4 text-xs text-gray-400">string</td>
                <td className="py-3 px-4"><span className="bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded text-xs border border-gray-500/20">Optional</span></td>
                <td className="py-3 px-4 text-sm text-gray-400">Filter by network: mtn, telecel, airteltigo</td>
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
          <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs font-mono border border-red-500/20 ml-4">401</span>
          <span className="text-sm text-gray-400">Unauthorized</span>
          <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs font-mono border border-red-500/20 ml-4">503</span>
          <span className="text-sm text-gray-400">Service unavailable</span>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Response</h3>
        <div className="bg-[#121316] border border-white/5 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-3">Success Response</h4>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            Returns available data packages grouped by network with pricing information.
          </p>
          <pre className="bg-[#0b0c0e] p-4 rounded-lg text-sm overflow-x-auto border border-white/5">
            <code className="text-green-400">{`{
  "success": true,
  "data": {
    "country": "Ghana",
    "country_code": "GH",
    "currency": "GHS",
    "networks": {
      "mtn": [
        {
          "network": "MTN Ghana",
          "network_code": "mtn",
          "capacity_gb": 1,
          "capacity_mb": 1000,
          "price": { "amount": 4.72, "currency": "GHS" },
          "provider_price": { "amount": 4.10, "currency": "GHS" },
          "margin_percent": 15,
          "in_stock": true
        },
        {
          "network": "MTN Ghana",
          "network_code": "mtn",
          "capacity_gb": 5,
          "capacity_mb": 5000,
          "price": { "amount": 23.58, "currency": "GHS" },
          "provider_price": { "amount": 20.50, "currency": "GHS" },
          "margin_percent": 15,
          "in_stock": true
        }
      ],
      "telecel": [...],
      "airteltigo": [...]
    },
    "source": "database"
  }
}`}</code>
          </pre>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Sample Pricing</h3>
        <div className="bg-[#121316] border border-white/5 rounded-lg p-6">
          <p className="text-sm text-gray-400 mb-4">All prices are in Ghana Cedis (GHS). Prices shown include a 15% service margin.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h5 className="font-semibold text-yellow-400 mb-3">MTN Ghana</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">1 GB</span><span className="text-white font-mono">GH₵ 4.72</span></div>
                <div className="flex justify-between"><span className="text-gray-400">5 GB</span><span className="text-white font-mono">GH₵ 23.58</span></div>
                <div className="flex justify-between"><span className="text-gray-400">10 GB</span><span className="text-white font-mono">GH₵ 47.15</span></div>
                <div className="flex justify-between"><span className="text-gray-400">20 GB</span><span className="text-white font-mono">GH₵ 89.70</span></div>
              </div>
            </div>
            <div>
              <h5 className="font-semibold text-red-400 mb-3">Telecel</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">5 GB</span><span className="text-white font-mono">GH₵ 22.43</span></div>
                <div className="flex justify-between"><span className="text-gray-400">10 GB</span><span className="text-white font-mono">GH₵ 41.98</span></div>
                <div className="flex justify-between"><span className="text-gray-400">20 GB</span><span className="text-white font-mono">GH₵ 80.27</span></div>
                <div className="flex justify-between"><span className="text-gray-400">50 GB</span><span className="text-white font-mono">GH₵ 197.23</span></div>
              </div>
            </div>
            <div>
              <h5 className="font-semibold text-blue-400 mb-3">AirtelTigo</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">1 GB</span><span className="text-white font-mono">GH₵ 4.54</span></div>
                <div className="flex justify-between"><span className="text-gray-400">5 GB</span><span className="text-white font-mono">GH₵ 22.43</span></div>
                <div className="flex justify-between"><span className="text-gray-400">10 GB</span><span className="text-white font-mono">GH₵ 44.28</span></div>
                <div className="flex justify-between"><span className="text-gray-400">50 GB</span><span className="text-white font-mono">GH₵ 218.50</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-8 mt-12">
        <Link href="/docs/api/email/webhooks" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
          <svg className="w-4 h-4 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Email Webhooks
        </Link>
        <Link href="/docs/api/data/purchase" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
          Purchase Data
          <svg className="w-4 h-4 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </>
  );
}
