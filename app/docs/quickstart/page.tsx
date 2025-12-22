'use client';

import { useState } from 'react';
import Link from 'next/link';

type ServiceType = 'email' | 'sms' | 'airtime' | 'data';
type LanguageType = 'curl' | 'nodejs' | 'python' | 'php';

const services: { id: ServiceType; name: string; icon: string; status: 'live' | 'soon' }[] = [
  { id: 'email', name: 'Email', icon: '📧', status: 'live' },
  { id: 'sms', name: 'SMS', icon: '💬', status: 'soon' },
  { id: 'airtime', name: 'Airtime', icon: '📱', status: 'soon' },
  { id: 'data', name: 'Data', icon: '📶', status: 'soon' },
];

const languages: { id: LanguageType; name: string }[] = [
  { id: 'curl', name: 'cURL' },
  { id: 'nodejs', name: 'Node.js' },
  { id: 'python', name: 'Python' },
  { id: 'php', name: 'PHP' },
];

const codeExamples: Record<ServiceType, Record<LanguageType, string>> = {
  email: {
    curl: `curl -X POST https://api.sendcomms.com/v1/email/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "you@yourdomain.com",
    "to": "customer@example.com",
    "subject": "Welcome to our platform!",
    "html": "<h1>Welcome!</h1><p>Thanks for signing up.</p>"
  }'`,
    nodejs: `import fetch from 'node-fetch';

const response = await fetch('https://api.sendcomms.com/v1/email/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'you@yourdomain.com',
    to: 'customer@example.com',
    subject: 'Welcome to our platform!',
    html: '<h1>Welcome!</h1><p>Thanks for signing up.</p>'
  }),
});

const result = await response.json();
console.log(result);`,
    python: `import requests

response = requests.post(
    'https://api.sendcomms.com/v1/email/send',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'from': 'you@yourdomain.com',
        'to': 'customer@example.com',
        'subject': 'Welcome to our platform!',
        'html': '<h1>Welcome!</h1><p>Thanks for signing up.</p>'
    }
)

print(response.json())`,
    php: `<?php
$ch = curl_init('https://api.sendcomms.com/v1/email/send');

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer YOUR_API_KEY',
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'from' => 'you@yourdomain.com',
        'to' => 'customer@example.com',
        'subject' => 'Welcome to our platform!',
        'html' => '<h1>Welcome!</h1><p>Thanks for signing up.</p>'
    ])
]);

$response = curl_exec($ch);
curl_close($ch);

echo $response;`
  },
  sms: {
    curl: `curl -X POST https://api.sendcomms.com/v1/sms/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+2348012345678",
    "message": "Your OTP is 123456. Valid for 5 minutes."
  }'`,
    nodejs: `import fetch from 'node-fetch';

const response = await fetch('https://api.sendcomms.com/v1/sms/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: '+2348012345678',
    message: 'Your OTP is 123456. Valid for 5 minutes.'
  }),
});

const result = await response.json();
console.log(result);`,
    python: `import requests

response = requests.post(
    'https://api.sendcomms.com/v1/sms/send',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'to': '+2348012345678',
        'message': 'Your OTP is 123456. Valid for 5 minutes.'
    }
)

print(response.json())`,
    php: `<?php
$ch = curl_init('https://api.sendcomms.com/v1/sms/send');

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer YOUR_API_KEY',
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'to' => '+2348012345678',
        'message' => 'Your OTP is 123456. Valid for 5 minutes.'
    ])
]);

$response = curl_exec($ch);
curl_close($ch);

echo $response;`
  },
  airtime: {
    curl: `curl -X POST https://api.sendcomms.com/v1/airtime/purchase \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "+2348012345678",
    "amount": 500,
    "country": "NG"
  }'`,
    nodejs: `import fetch from 'node-fetch';

const response = await fetch('https://api.sendcomms.com/v1/airtime/purchase', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    phone: '+2348012345678',
    amount: 500,
    country: 'NG'
  }),
});

const result = await response.json();
console.log(result);`,
    python: `import requests

response = requests.post(
    'https://api.sendcomms.com/v1/airtime/purchase',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'phone': '+2348012345678',
        'amount': 500,
        'country': 'NG'
    }
)

print(response.json())`,
    php: `<?php
$ch = curl_init('https://api.sendcomms.com/v1/airtime/purchase');

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer YOUR_API_KEY',
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'phone' => '+2348012345678',
        'amount' => 500,
        'country' => 'NG'
    ])
]);

$response = curl_exec($ch);
curl_close($ch);

echo $response;`
  },
  data: {
    curl: `curl -X POST https://api.sendcomms.com/v1/data/purchase \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "+2348012345678",
    "bundle_id": "ng_mtn_1gb_30d",
    "country": "NG"
  }'`,
    nodejs: `import fetch from 'node-fetch';

const response = await fetch('https://api.sendcomms.com/v1/data/purchase', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    phone: '+2348012345678',
    bundle_id: 'ng_mtn_1gb_30d',
    country: 'NG'
  }),
});

const result = await response.json();
console.log(result);`,
    python: `import requests

response = requests.post(
    'https://api.sendcomms.com/v1/data/purchase',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'phone': '+2348012345678',
        'bundle_id': 'ng_mtn_1gb_30d',
        'country': 'NG'
    }
)

print(response.json())`,
    php: `<?php
$ch = curl_init('https://api.sendcomms.com/v1/data/purchase');

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer YOUR_API_KEY',
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'phone' => '+2348012345678',
        'bundle_id' => 'ng_mtn_1gb_30d',
        'country' => 'NG'
    ])
]);

$response = curl_exec($ch);
curl_close($ch);

echo $response;`
  }
};

const responseExamples: Record<ServiceType, string> = {
  email: `{
  "success": true,
  "data": {
    "id": "email_abc123xyz",
    "from": "you@yourdomain.com",
    "to": "customer@example.com",
    "subject": "Welcome to our platform!",
    "status": "sent"
  }
}`,
  sms: `{
  "success": true,
  "data": {
    "id": "sms_def456uvw",
    "to": "+2348012345678",
    "status": "sent",
    "segments": 1,
    "cost": 0.03
  }
}`,
  airtime: `{
  "success": true,
  "data": {
    "id": "airtime_ghi789rst",
    "phone": "+2348012345678",
    "amount": 500,
    "currency": "NGN",
    "operator": "MTN Nigeria",
    "status": "successful"
  }
}`,
  data: `{
  "success": true,
  "data": {
    "id": "data_jkl012mno",
    "phone": "+2348012345678",
    "bundle": "1GB - 30 Days",
    "operator": "MTN Nigeria",
    "status": "successful"
  }
}`
};

export default function QuickStartPage() {
  const [activeService, setActiveService] = useState<ServiceType>('email');
  const [activeLanguage, setActiveLanguage] = useState<LanguageType>('curl');

  const currentService = services.find(s => s.id === activeService)!;

  return (
    <>
      <div className="text-sm font-medium text-blue-500 mb-2">Getting Started</div>
      <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Quick Start Guide</h1>
      
      <p className="text-gray-400 leading-relaxed mb-8 border-b border-white/5 pb-8">
        Get up and running with SendComms in under 5 minutes. Choose a service below to see examples.
      </p>

      {/* Service Tabs */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Select Service</h3>
        <div className="flex flex-wrap gap-2">
          {services.map(service => (
            <button
              key={service.id}
              onClick={() => setActiveService(service.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeService === service.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#16181b] text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              <span>{service.icon}</span>
              {service.name}
              {service.status === 'soon' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Soon</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-6">
        {/* Step 1 */}
        <div className="bg-[#121316] border border-white/10 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">1</div>
            <h2 className="text-lg font-semibold text-white">Get Your API Key</h2>
          </div>
          <p className="text-gray-400 text-sm mb-3">
            Sign up or log in to your dashboard to get your API key. You&apos;ll find it in the API Keys section.
          </p>
          <Link href="/dashboard/api-keys" className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            Get API Key →
          </Link>
        </div>

        {/* Step 2 */}
        <div className="bg-[#121316] border border-white/10 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">2</div>
            <h2 className="text-lg font-semibold text-white">
              Send Your First {currentService.name} {currentService.icon}
            </h2>
            {currentService.status === 'soon' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Coming Soon</span>
            )}
          </div>

          {/* Language Tabs */}
          <div className="flex gap-1 mb-3">
            {languages.map(lang => (
              <button
                key={lang.id}
                onClick={() => setActiveLanguage(lang.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  activeLanguage === lang.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>

          {/* Code Block */}
          <div className="bg-[#0b0c0e] border border-white/5 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Request</span>
              <button 
                onClick={() => navigator.clipboard.writeText(codeExamples[activeService][activeLanguage])}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-xs">
              <code className="text-gray-300">{codeExamples[activeService][activeLanguage]}</code>
            </pre>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-[#121316] border border-white/10 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">3</div>
            <h2 className="text-lg font-semibold text-white">Handle the Response</h2>
          </div>
          <p className="text-gray-400 text-sm mb-3">
            A successful request returns a JSON response with the status and details:
          </p>
          <div className="bg-[#0b0c0e] border border-white/5 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Response</span>
              <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">200 OK</span>
            </div>
            <pre className="p-3 overflow-x-auto text-xs">
              <code className="text-gray-300">{responseExamples[activeService]}</code>
            </pre>
          </div>
        </div>

        {/* Step 4 - Webhooks */}
        <div className="bg-[#121316] border border-white/10 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">4</div>
            <h2 className="text-lg font-semibold text-white">Set Up Webhooks (Optional)</h2>
          </div>
          <p className="text-gray-400 text-sm mb-3">
            Get real-time notifications for delivery status, bounces, and more by registering a webhook endpoint:
          </p>
          <div className="bg-[#0b0c0e] border border-white/5 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Register Webhook</span>
            </div>
            <pre className="p-3 overflow-x-auto text-xs">
              <code className="text-gray-300">{`curl -X POST https://api.sendcomms.com/v1/webhooks \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yourapp.com/webhooks/sendcomms",
    "events": ["email.sent", "email.delivered", "email.bounced"]
  }'`}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="mt-10 p-5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
        <h3 className="text-sm font-semibold text-white mb-3">Next Steps</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/docs/api/email" className="flex items-center gap-2 p-2 bg-[#0b0c0e] border border-white/5 rounded hover:border-blue-500/30 transition-colors">
            <span>📧</span>
            <div>
              <p className="text-white font-medium text-xs">Email API Reference</p>
              <p className="text-gray-500 text-[10px]">Full documentation</p>
            </div>
          </Link>
          <Link href="/docs/api/email/webhooks" className="flex items-center gap-2 p-2 bg-[#0b0c0e] border border-white/5 rounded hover:border-blue-500/30 transition-colors">
            <span>🔔</span>
            <div>
              <p className="text-white font-medium text-xs">Webhooks Guide</p>
              <p className="text-gray-500 text-[10px]">Real-time events</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between border-t border-white/10 pt-8 mt-12">
        <Link href="/docs" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
          <svg className="w-4 h-4 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Introduction
        </Link>
        <Link href="/docs/api/email" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
          Email API
          <svg className="w-4 h-4 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </>
  );
}
