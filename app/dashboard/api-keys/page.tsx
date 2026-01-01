'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface ApiKey {
  id: string;
  name: string;
  key_preview: string;
  permissions: string[];
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
  is_test?: boolean;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  created_at: string;
  is_active: boolean;
}

export default function ApiKeysPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [activeTab, setActiveTab] = useState<'keys' | 'webhooks'>('keys');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isTestKey, setIsTestKey] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const fetchedRef = useRef(false); // Prevent double fetch in StrictMode

  const webhookEvents = [
    { id: 'email.sent', label: 'Email Sent', description: 'When an email is accepted' },
    { id: 'email.delivered', label: 'Email Delivered', description: 'When an email reaches inbox' },
    { id: 'email.bounced', label: 'Email Bounced', description: 'When an email bounces' },
    { id: 'email.opened', label: 'Email Opened', description: 'When an email is opened' },
    { id: 'sms.sent', label: 'SMS Sent', description: 'When SMS is sent' },
    { id: 'sms.delivered', label: 'SMS Delivered', description: 'When SMS is delivered' },
  ];

  // Check authentication and get customer
  useEffect(() => {
    // Prevent double fetch in React Strict Mode
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Get customer record via API (bypasses RLS)
      try {
        const response = await fetch('/api/v1/customer');
        
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          if (response.status === 403) {
            setError('Your account is inactive. Please contact support.');
            setLoading(false);
            return;
          }
          setError('Unable to load your account. Please try again.');
          setLoading(false);
          return;
        }

        const customer = await response.json();
        setCustomerId(customer.id);
        
        // Fetch keys and webhooks in parallel immediately after getting customer
        fetchDataParallel();
      } catch (err) {
        console.error('Error fetching customer:', err);
        setError('Unable to load your account. Please try again.');
        setLoading(false);
      }
    };

    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch API keys and webhooks in parallel
  const fetchDataParallel = useCallback(async () => {
    setError(null);

    try {
      // Fetch API keys and webhooks in PARALLEL
      const [keysResponse, webhooksResponse] = await Promise.all([
        fetch('/api/v1/keys'),
        fetch('/api/v1/webhooks-manage')
      ]);

      if (keysResponse.ok) {
        const keys = await keysResponse.json();
        setApiKeys(keys || []);
      }

      if (webhooksResponse.ok) {
        const webhooksData = await webhooksResponse.json();
        setWebhooks(webhooksData || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data when customer is loaded (for manual refresh)
  const fetchData = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    await fetchDataParallel();
  }, [customerId, fetchDataParallel]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim() || !customerId) return;
    
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim(), is_test: isTestKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create API key');
      }

      const { key, secret } = await response.json();
      setApiKeys([key, ...apiKeys]);
      setCreatedKey(secret);
      setNewKeyName('');
      setIsTestKey(false);
    } catch (err) {
      console.error('Error creating API key:', err);
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };


  const handleCreateWebhook = async () => {
    if (!newWebhookUrl.trim() || selectedEvents.length === 0 || !customerId) return;
    
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/webhooks-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: newWebhookUrl.trim(),
          events: selectedEvents,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create webhook');
      }

      const { webhook, secret } = await response.json();
      setWebhooks([webhook, ...webhooks]);
      setCreatedWebhookSecret(secret);
      setNewWebhookUrl('');
      setSelectedEvents([]);
    } catch (err) {
      console.error('Error creating webhook:', err);
      setError(err instanceof Error ? err.message : 'Failed to create webhook');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteKey = async (id: string) => {
    if (!customerId) return;
    
    setIsDeleting(id);
    setError(null);

    try {
      const response = await fetch(`/api/v1/keys?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revoke API key');
      }

      setApiKeys(apiKeys.filter(key => key.id !== id));
    } catch (err) {
      console.error('Error deleting API key:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    } finally {
      setIsDeleting(null);
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!customerId) return;
    
    setIsDeleting(id);
    setError(null);

    try {
      const response = await fetch(`/api/v1/webhooks-manage?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete webhook');
      }

      setWebhooks(webhooks.filter(wh => wh.id !== id));
    } catch (err) {
      console.error('Error deleting webhook:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete webhook');
    } finally {
      setIsDeleting(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-8">
          
          {/* Header Area */}
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight mb-1">Access Management</h1>
            <p className="text-sm text-muted-foreground">Manage your API keys and webhook endpoints to authenticate requests.</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-red-200">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="w-full">
            <div className="border-b border-border">
              <nav className="flex gap-8" aria-label="Tabs">
                <button 
                  onClick={() => setActiveTab('keys')}
                  className={`relative py-3 text-sm font-medium transition-colors border-b-2 focus:outline-none ${
                    activeTab === 'keys' 
                      ? 'text-foreground border-indigo-500' 
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                  }`}
                >
                  API Keys
                  {apiKeys.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-secondary text-muted-foreground rounded">
                      {apiKeys.length}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('webhooks')}
                  className={`relative py-3 text-sm font-medium transition-colors border-b-2 focus:outline-none ${
                    activeTab === 'webhooks' 
                      ? 'text-foreground border-indigo-500' 
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                  }`}
                >
                  Webhooks
                  {webhooks.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-secondary text-muted-foreground rounded">
                      {webhooks.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-8">
              
              {/* API Keys Tab */}
              {activeTab === 'keys' && (
                <>
                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    </div>
                  ) : apiKeys.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl border-dashed">
                      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6 ring-1 ring-border shadow-xl shadow-black/50">
                        <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-2">No API Keys found</h3>
                      <p className="text-sm text-muted-foreground text-center max-w-sm mb-8">
                        Generate an API key to authenticate your requests to the SendComms API. Treat your secret keys like passwords.
                      </p>
                      <button 
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 border border-indigo-500/50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create API Key
                      </button>
                    </div>
                  ) : (
                    /* Keys List */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{apiKeys.length} API key{apiKeys.length !== 1 ? 's' : ''}</p>
                        <button 
                          onClick={() => setShowCreateModal(true)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 border border-indigo-500/50"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          New Key
                        </button>
                      </div>

                      <div className="bg-card border border-border rounded-xl overflow-hidden">
                        {apiKeys.map((key, index) => (
                          <div 
                            key={key.id}
                            className={`p-4 flex items-center justify-between ${index !== apiKeys.length - 1 ? 'border-b border-border' : ''}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${key.is_active ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                <svg className={`w-5 h-5 ${key.is_active ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-medium text-foreground">{key.name}</h4>
                                  {key.is_test ? (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">Test</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">Live</span>
                                  )}
                                  {key.is_active ? (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-400 rounded border border-green-500/20">Active</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-400 rounded border border-red-500/20">Revoked</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                  <code className="text-xs font-mono text-muted-foreground">{key.key_preview || `${key.id.substring(0, 8)}...`}</code>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className="text-xs text-muted-foreground">Created {formatDate(key.created_at)}</span>
                                  {key.last_used_at && (
                                    <>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <span className="text-xs text-muted-foreground">Last used {formatDate(key.last_used_at)}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => deleteKey(key.id)}
                                disabled={isDeleting === key.id}
                                className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                title="Revoke key"
                              >
                                {isDeleting === key.id ? (
                                  <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Webhooks Tab */}
              {activeTab === 'webhooks' && (
                <>
                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    </div>
                  ) : webhooks.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl border-dashed">
                      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6 ring-1 ring-border shadow-xl shadow-black/50">
                        <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-2">No Webhook Endpoints</h3>
                      <p className="text-sm text-muted-foreground text-center max-w-sm mb-8">
                        Listen for events on your account like message status updates and balance changes by configuring a webhook URL.
                      </p>
                      <button 
                        onClick={() => setShowWebhookModal(true)}
                        className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-accent hover:text-foreground rounded-lg shadow-sm transition-all flex items-center gap-2 border border-border"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Endpoint
                      </button>
                    </div>
                  ) : (
                    /* Webhooks List */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{webhooks.length} webhook endpoint{webhooks.length !== 1 ? 's' : ''}</p>
                        <button 
                          onClick={() => setShowWebhookModal(true)}
                          className="px-3 py-1.5 text-xs font-medium text-foreground bg-secondary hover:bg-accent hover:text-foreground rounded-lg transition-all flex items-center gap-2 border border-border"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Endpoint
                        </button>
                      </div>

                      <div className="bg-card border border-border rounded-xl overflow-hidden">
                        {webhooks.map((webhook, index) => (
                          <div 
                            key={webhook.id}
                            className={`p-4 ${index !== webhooks.length - 1 ? 'border-b border-border' : ''}`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${webhook.is_active ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
                                  <svg className={`w-5 h-5 ${webhook.is_active ? 'text-green-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                </div>
                                <div>
                                  <code className="text-sm font-mono text-foreground">{webhook.url}</code>
                                  <p className="text-xs text-muted-foreground mt-0.5">Created {formatDate(webhook.created_at)}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => deleteWebhook(webhook.id)}
                                disabled={isDeleting === webhook.id}
                                className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {isDeleting === webhook.id ? (
                                  <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {webhook.events.map(event => (
                                <span key={event} className="px-2 py-0.5 text-[10px] font-medium bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
                                  {event}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {createdKey ? 'API Key Created' : 'Create API Key'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {createdKey 
                  ? 'Copy your API key now. You won\'t be able to see it again!' 
                  : 'Give your API key a name to help identify it later.'}
              </p>
            </div>

            <div className="p-6">
              {createdKey ? (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-sm text-yellow-200">
                        This key will only be shown once. Please copy it and store it securely.
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <input 
                      type="text" 
                      value={createdKey}
                      readOnly
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 pr-12 font-mono text-sm text-foreground"
                    />
                    <button
                      onClick={() => copyToClipboard(createdKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied ? (
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Key Name</label>
                    <input 
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Production API Key"
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-muted-foreground"
                    />
                  </div>
                  
                  {/* Test Key Toggle */}
                  <div className="p-4 bg-background border border-border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-foreground">Sandbox Mode</label>
                        <p className="text-xs text-muted-foreground mt-0.5">Test your integration without charges</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsTestKey(!isTestKey)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isTestKey ? 'bg-amber-500' : 'bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isTestKey ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    {isTestKey && (
                      <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-xs text-amber-200">
                            <p className="font-medium mb-1">Test key features:</p>
                            <ul className="space-y-0.5 text-amber-200/80">
                              <li>• Returns mock responses (no real messages sent)</li>
                              <li>• No balance deductions</li>
                              <li>• Key will start with <code className="bg-amber-500/20 px-1 rounded">sc_test_</code></li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setCreatedKey(null);
                  setNewKeyName('');
                  setIsTestKey(false);
                }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {createdKey ? 'Done' : 'Cancel'}
              </button>
              {!createdKey && (
                <button 
                  onClick={handleCreateKey}
                  disabled={!newKeyName.trim() || isCreating}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Create Key
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {createdWebhookSecret ? 'Webhook Created' : 'Add Webhook Endpoint'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {createdWebhookSecret 
                  ? 'Copy your webhook secret to verify incoming requests.'
                  : 'Configure a URL to receive event notifications.'}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {createdWebhookSecret ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-sm text-green-200">
                        Webhook endpoint created successfully!
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Signing Secret</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={createdWebhookSecret}
                        readOnly
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 pr-12 font-mono text-xs text-foreground"
                      />
                      <button
                        onClick={() => copyToClipboard(createdWebhookSecret)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copied ? (
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Use this secret to verify webhook signatures.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Endpoint URL</label>
                    <input 
                      type="url"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                      placeholder="https://your-app.com/webhooks/sendcomms"
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-muted-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Events to listen for</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {webhookEvents.map(event => (
                        <label key={event.id} className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors">
                          <input 
                            type="checkbox"
                            checked={selectedEvents.includes(event.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEvents([...selectedEvents, event.id]);
                              } else {
                                setSelectedEvents(selectedEvents.filter(id => id !== event.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-border bg-transparent text-indigo-500 focus:ring-indigo-500/20"
                          />
                          <div>
                            <div className="text-sm font-medium text-foreground">{event.label}</div>
                            <div className="text-xs text-muted-foreground">{event.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button 
                onClick={() => {
                  setShowWebhookModal(false);
                  setNewWebhookUrl('');
                  setSelectedEvents([]);
                  setCreatedWebhookSecret(null);
                }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {createdWebhookSecret ? 'Done' : 'Cancel'}
              </button>
              {!createdWebhookSecret && (
                <button 
                  onClick={handleCreateWebhook}
                  disabled={!newWebhookUrl.trim() || selectedEvents.length === 0 || isCreating}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Add Endpoint
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
