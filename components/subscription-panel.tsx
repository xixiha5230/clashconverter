'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ACL_TEMPLATE_VARIANTS } from '@/lib/acl4ssr/variants';
import type { SubscriptionSettings } from '@/lib/acl4ssr/types';

export function SubscriptionPanel() {
  const t = useTranslations('subscriptionPanel');

  const [input, setInput] = useState('');
  const [templateKey, setTemplateKey] = useState(ACL_TEMPLATE_VARIANTS[0].key);
  const [enableDns, setEnableDns] = useState(true);
  const [preview, setPreview] = useState('');
  const [url, setUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [id, setId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const settings: SubscriptionSettings = { templateKey, enableDns };

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('copied'));
    } catch {
      toast.error(t('copied'));
    }
  }

  async function handlePreview() {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, settings }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || t('create'));
        return;
      }
      setPreview(data.output);
    } catch {
      setError(t('create'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, settings }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || t('create'));
        return;
      }
      setUrl(data.url);
      setAccessToken(data.accessToken);
      setId(data.id);
      setPreview('');
    } catch {
      setError(t('create'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!id || !accessToken) return;
    if (!window.confirm(t('deleteConfirm'))) return;

    setError('');
    try {
      const response = await fetch(`/api/configs/${id}?token=${encodeURIComponent(accessToken)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        setError(t('delete'));
        return;
      }
      toast.success(t('deleted'));
      setUrl('');
      setAccessToken('');
      setId('');
    } catch {
      setError(t('delete'));
    }
  }

  return (
    <section className="w-full rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-card dark:bg-neo-cardDark p-6 md:p-8 space-y-6 animate-neo-enter">
      <div>
        <h2 className="text-xl font-bold text-neo-foreground dark:text-white">{t('title')}</h2>
        <p className="mt-1 text-sm text-neo-muted dark:text-neo-mutedDark">{t('subtitle')}</p>
      </div>

      <div className="space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('inputPlaceholder')}
          rows={6}
          className="w-full rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-canvas dark:bg-neo-canvasDark text-sm text-neo-foreground dark:text-white p-3 focus:outline-none focus:ring-2 focus:ring-neo-borderStrong dark:focus:ring-neo-borderStrongDark resize-y"
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neo-foreground dark:text-white">
            {t('templateLabel')}
          </label>
          <Select value={templateKey} onValueChange={setTemplateKey}>
            <SelectTrigger className="w-auto min-w-[260px] h-9 rounded-neoMd bg-neo-canvas dark:bg-neo-canvasDark border border-neo-border dark:border-neo-borderDark text-sm font-medium text-neo-foreground dark:text-white focus:ring-2 focus:ring-neo-borderStrong dark:focus:ring-neo-borderStrongDark">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-card dark:bg-neo-cardDark">
              {ACL_TEMPLATE_VARIANTS.map((variant) => (
                <SelectItem key={variant.key} value={variant.key} className="font-medium text-neo-foreground dark:text-white">
                  <span className="truncate block max-w-[320px]">
                    {variant.label}
                    <span className="block text-xs text-neo-muted dark:text-neo-mutedDark">{variant.desc}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer pb-1.5">
          <input
            type="checkbox"
            checked={enableDns}
            onChange={(e) => setEnableDns(e.target.checked)}
            className="h-4 w-4 rounded border-neo-border dark:border-neo-borderDark text-accent focus:ring-neo-borderStrong dark:focus:ring-neo-borderStrongDark"
          />
          <span className="text-sm font-medium text-neo-foreground dark:text-white">{t('enableDnsLabel')}</span>
        </label>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" onClick={handlePreview} disabled={loading || !input.trim()}>
            {loading ? t('previewing') : t('preview')}
          </Button>
          <Button onClick={handleCreate} disabled={loading || !input.trim()}>
            {loading ? t('creating') : t('create')}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {preview && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neo-foreground dark:text-white">{t('previewTitle')}</h3>
            <Button variant="ghost" size="sm" onClick={() => copy(preview)}>{t('copy')}</Button>
          </div>
          <pre className="max-h-72 overflow-auto rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-canvas dark:bg-neo-canvasDark p-3 text-xs text-neo-foreground dark:text-white whitespace-pre-wrap break-all">
            {preview}
          </pre>
        </div>
      )}

      {url && (
        <div className="space-y-3 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-canvas dark:bg-neo-canvasDark p-4">
          <h3 className="text-sm font-semibold text-neo-foreground dark:text-white">{t('resultTitle')}</h3>

          <div className="space-y-1.5">
            <label className="block text-xs text-neo-muted dark:text-neo-mutedDark">{t('urlLabel')}</label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 h-9 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-card dark:bg-neo-cardDark text-sm text-neo-foreground dark:text-white px-3 focus:outline-none focus:ring-2 focus:ring-neo-borderStrong dark:focus:ring-neo-borderStrongDark"
              />
              <Button variant="outline" size="sm" onClick={() => copy(url)}>{t('copy')}</Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-neo-muted dark:text-neo-mutedDark">{t('tokenLabel')}</label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={accessToken}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 h-9 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-card dark:bg-neo-cardDark text-sm text-neo-foreground dark:text-white px-3 focus:outline-none focus:ring-2 focus:ring-neo-borderStrong dark:focus:ring-neo-borderStrongDark"
              />
              <Button variant="outline" size="sm" onClick={() => copy(accessToken)}>{t('copy')}</Button>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={handleDelete}>
            {t('delete')}
          </Button>
        </div>
      )}
    </section>
  );
}