'use client';

import Link from 'next/link';
import { useState } from 'react';

type Language = 'curl' | 'nodejs' | 'python' | 'php';

const codeExamples: Record<Language, string> = {
  curl: `# Register a webhook endpoint
curl -X POST \\
  https://api.sendcomms.com/v1/webhooks \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-server.com/webhooks/email",
    "events": ["email.sent", "email.delivered", "email.bounced", "email.complained"],
    "secret": "your_webhook_secret"
  }'`,
  nodejs: `import axios from 'axios';

// Register a webhook endpoint
const response = await axios.post(
  'https://api.sendcomms.com/v1/webhooks',
  {
    url: 'https://your-server.com/webhooks/email',
    events: ['email.sent', 'email.delivered', 'email.bounced', 'email.complained'],
    secret: 'your_webhook_secret'
  },
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    }
  }
);

console.log(response.data);`,
  python: `import requests

# Register a webhook endpoint
response = requests.post(
    'https://api.sendcomms.com/v1/webhooks',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'url': 'https://your-server.com/webhooks/email',
        'events': ['email.sent', 'email.delivered', 'email.bounced', 'email.complained'],
        'secret': 'your_webhook_secret'
    }
)

print(response.json())`,
  php: `<?php

$curl = curl_init();

$data = [
    'url' => 'https://your-server.com/webhooks/email',
    'events' => ['email.sent', 'email.delivered', 'email.bounced', 'email.complained'],
    'secret' => 'your_webhook_secret'
];

curl_setopt_array($curl, [
    CURLOPT_URL => 'https://api.sendcomms.com/v1/webhooks',
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

echo $response;`
};

export default function WebhooksDocsPage() {
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
      <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Webhooks</h1>

      <div className="flex items-start justify-between mb-8 border-b border-white/5 pb-8">
        <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
          Receive real-time notifications about email events via webhooks. Track email delivery, 
          bounces, complaints, and more. Perfect for building responsive email tracking systems.
        </p>
      </div>

      {/* Webhook Events */}
      <div className="mb-10">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Available Events</h3>
        
        {/* API Note */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-blue-400">💡</span>
            <div>
              <p className="text-sm text-blue-300 font-medium">Secret is Auto-Generated</p>
              <p className="text-xs text-gray-400 mt-1">If you don&apos;t provide a <code className="text-blue-400 bg-blue-500/10 px-1 rounded">secret</code>, we&apos;ll generate one for you. Save it - it&apos;s only shown once!</p>
            </div>
          </div>
        </div>
        
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#16181b]">
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Event</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-blue-400 font-mono">email.sent</td>
                <td className="py-3 px-4 text-sm text-gray-400">Email was successfully sent to the mail server</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-blue-400 font-mono">email.delivered</td>
                <td className="py-3 px-4 text-sm text-gray-400">Email was successfully delivered to the recipient</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-blue-400 font-mono">email.bounced</td>
                <td className="py-3 px-4 text-sm text-gray-400">Email bounced (hard or soft bounce)</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-blue-400 font-mono">email.complained</td>
                <td className="py-3 px-4 text-sm text-gray-400">Recipient marked email as spam</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-blue-400 font-mono">email.opened</td>
                <td className="py-3 px-4 text-sm text-gray-400">Email was opened (if tracking enabled)</td>
              </tr>
              <tr className="bg-[#0b0c0e]">
                <td className="py-3 px-4 text-sm text-blue-400 font-mono">email.clicked</td>
                <td className="py-3 px-4 text-sm text-gray-400">Link in email was clicked (if tracking enabled)</td>
              </tr>
            </tbody>
          </table>
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
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">REGISTER WEBHOOK</span>
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

      {/* Webhook Payload */}
      <div className="mb-10">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Webhook Payload</h3>
        <div className="bg-[#121316] border border-white/5 rounded-lg p-6">
          <p className="text-sm text-gray-400 mb-4">
            When an event occurs, we&apos;ll send a POST request to your webhook URL with the following payload:
          </p>
          <pre className="bg-[#0b0c0e] p-4 rounded-lg text-sm overflow-x-auto border border-white/5">
            <code className="text-gray-300">{`{
  "event": "email.delivered",
  "transaction_id": "txn_mjgc0ejr_3ca715bfb7a0",
  "timestamp": "2025-12-21T10:30:00Z",
  "data": {
    "id": "txn_xxx",
    "email_id": "abc123-def456-789",
    "type": "email",
    "status": "delivered",
    "to": "recipient@example.com",
    "subject": "Welcome to our platform!",
    "from": "hello@yourdomain.com"
  }
}`}</code>
          </pre>
        </div>
      </div>

      {/* Response Format */}
      <div className="mb-10">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Registration Response</h3>
        <div className="bg-[#121316] border border-white/5 rounded-lg p-6">
          <p className="text-sm text-gray-400 mb-4">
            When you register a webhook, you&apos;ll receive this response. <span className="text-yellow-400 font-medium">Save the secret - it&apos;s only shown once!</span>
          </p>
          <pre className="bg-[#0b0c0e] p-4 rounded-lg text-sm overflow-x-auto border border-white/5">
            <code className="text-gray-300">{`{
  "success": true,
  "data": {
    "id": "e406c83c-50bc-4783-b5fc-4beafe6bf5eb",
    "url": "https://your-server.com/webhooks/email",
    "events": ["email.sent", "email.delivered", "email.bounced"],
    "secret": "whsec_21be983f359112f9e07658ed2bddcee3...",
    "active": true,
    "created_at": "2025-12-21T23:25:12.006Z"
  }
}`}</code>
          </pre>
        </div>
      </div>

      {/* Verifying Webhooks */}
      <div className="mb-10">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Verifying Webhooks</h3>
        <div className="bg-[#121316] border border-white/5 rounded-lg p-6">
          <p className="text-sm text-gray-400 mb-4">
            Always verify the <code className="text-blue-400 bg-blue-500/10 px-1 rounded">X-SendComms-Signature</code> header to ensure requests are authentic:
          </p>
          <pre className="bg-[#0b0c0e] p-4 rounded-lg text-sm overflow-x-auto border border-white/5">
            <code className="text-gray-300">{`// Node.js/Express example
const crypto = require('crypto');

app.post('/webhooks/sendcomms', (req, res) => {
  const signature = req.headers['x-sendcomms-signature'];
  const secret = 'whsec_your_secret_here';
  
  const expectedSignature = 'sha256=' + 
    crypto.createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process the webhook
  const { event, data } = req.body;
  console.log(\`Received \${event} for \${data.to}\`);
  
  res.status(200).json({ received: true });
});`}</code>
          </pre>
        </div>
      </div>

      {/* Best Practices */}
      <div className="mb-10">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Best Practices</h3>
        <div className="bg-[#121316] border border-white/5 rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-green-400">✓</span>
            <div>
              <p className="text-sm text-white font-medium">Respond quickly</p>
              <p className="text-xs text-gray-400">Return a 200 status within 5 seconds. Process events asynchronously.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-400">✓</span>
            <div>
              <p className="text-sm text-white font-medium">Handle duplicates</p>
              <p className="text-xs text-gray-400">Use transaction_id to deduplicate events. We may retry failed deliveries.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-400">✓</span>
            <div>
              <p className="text-sm text-white font-medium">Use HTTPS</p>
              <p className="text-xs text-gray-400">Webhook URLs must use HTTPS for security.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-400">✓</span>
            <div>
              <p className="text-sm text-white font-medium">Verify signatures</p>
              <p className="text-xs text-gray-400">Always verify the X-SendComms-Signature header to prevent spoofing.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Managing Webhooks */}
      <div className="mb-12">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Managing Webhooks</h3>
        <div className="bg-[#121316] border border-white/5 rounded-lg p-6 space-y-6">
          {/* List Webhooks */}
          <div>
            <p className="text-sm text-white font-medium mb-2">List Your Webhooks</p>
            <pre className="bg-[#0b0c0e] p-3 rounded text-xs overflow-x-auto border border-white/5">
              <code className="text-gray-300">{`curl -X GET https://api.sendcomms.com/v1/webhooks \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</code>
            </pre>
          </div>
          
          {/* Delete Webhook */}
          <div>
            <p className="text-sm text-white font-medium mb-2">Delete a Webhook</p>
            <pre className="bg-[#0b0c0e] p-3 rounded text-xs overflow-x-auto border border-white/5">
              <code className="text-gray-300">{`curl -X DELETE "https://api.sendcomms.com/v1/webhooks?id=WEBHOOK_ID" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-white/10 pt-8 mt-12">
        <Link href="/docs/api/email/batch" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
          <svg className="w-4 h-4 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Batch Send
        </Link>
        <Link href="/docs/api/sms" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
          SMS API
          <svg className="w-4 h-4 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </>
  );
}
