'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ACL_TEMPLATE_VARIANTS } from '@/lib/acl4ssr/variants';

interface AdminItem {
  id: string;
  templateKey: string;
  enableDns: boolean;
  nodeCount: number;
  createdAt: string;
  lastAccessedAt: string | null;
  url: string;
}

interface AdminListResponse {
  items: AdminItem[];
  passwordSet: boolean;
}

function maskUrl(url: string): string {
  return url.replace(/token=[^&]+/, 'token=••••••••');
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

function templateLabel(key: string): string {
  return ACL_TEMPLATE_VARIANTS.find((v) => v.key === key)?.label ?? key;
}

export function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [checksDone, setChecksDone] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);
  const [items, setItems] = useState<AdminItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [loginPassword, setLoginPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showingChangeForm, setShowingChangeForm] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/configs');
    if (res.status === 401) {
      setAuthed(false);
      setItems([]);
      return;
    }
    if (res.ok) {
      const data = (await res.json()) as AdminListResponse;
      setAuthed(true);
      setPasswordSet(data.passwordSet);
      setItems(data.items);
    } else {
      setError('加载订阅列表失败');
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setChecksDone(true));
  }, [refresh]);

  async function handleLogin() {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });
      if (!res.ok) {
        setError('密码错误');
        return;
      }
      setLoginPassword('');
      await refresh();
    } catch {
      setError('登录请求失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
    setItems([]);
    setChecksDone(true);
  }

  async function submitNewPassword() {
    setError('');
    if (newPassword.length < 8) {
      setError('新密码至少 8 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '修改密码失败');
        return;
      }
      setPasswordSet(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowingChangeForm(false);
    } catch {
      setError('修改密码请求失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item: AdminItem) {
    if (!window.confirm(`确定删除订阅 ${item.id} 吗？`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/configs/${item.id}`, { method: 'DELETE' });
      if (res.ok || res.status === 404) {
        await refresh();
      } else {
        setError('删除失败');
      }
    } catch {
      setError('删除请求失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      setError('复制失败');
    }
  }

  return (
    <main className="min-h-screen bg-neo-canvas dark:bg-neo-canvasDark text-neo-foreground dark:text-white">
      <div className="w-full max-w-5xl mx-auto px-4 py-10 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">订阅管理</h1>
            <p className="mt-1 text-sm text-neo-muted dark:text-neo-mutedDark">
              管理已生成的订阅链接
            </p>
          </div>
          {authed && (
            <div className="flex items-center gap-2">
              {passwordSet && !showingChangeForm && (
                <Button variant="outline" size="sm" onClick={() => setShowingChangeForm(true)}>
                  修改密码
                </Button>
              )}
              <Button variant="outline" onClick={handleLogout}>
                退出登录
              </Button>
            </div>
          )}
        </header>

        {!checksDone && <p className="text-sm text-neo-muted dark:text-neo-mutedDark">加载中…</p>}

        {checksDone && !authed && (
          <div className="max-w-sm space-y-3 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-card dark:bg-neo-cardDark p-6">
            <label className="block text-sm font-medium">
              {passwordSet ? '管理员密码' : '管理员登录'}
            </label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              autoFocus
              placeholder={passwordSet ? '输入密码' : '首次登录无需密码'}
              className="w-full h-10 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-canvas dark:bg-neo-canvasDark px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neo-borderStrong dark:focus:ring-neo-borderStrongDark"
            />
            <Button onClick={handleLogin} disabled={busy || (!passwordSet && false)}>
              {passwordSet ? '登录' : '首次登录'}
            </Button>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        )}

        {authed && !passwordSet && (
          <div className="max-w-sm space-y-3 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-card dark:bg-neo-cardDark p-6">
            <div>
              <h2 className="font-semibold">设置管理员密码</h2>
              <p className="mt-1 text-sm text-neo-muted dark:text-neo-mutedDark">
                首次登录，请设置至少 8 位的管理员密码
              </p>
            </div>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新密码（至少 8 位）"
              className="w-full h-10 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-canvas dark:bg-neo-canvasDark px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neo-borderStrong dark:focus:ring-neo-borderStrongDark"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="确认新密码"
              onKeyDown={(e) => e.key === 'Enter' && submitNewPassword()}
              className="w-full h-10 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-canvas dark:bg-neo-canvasDark px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neo-borderStrong dark:focus:ring-neo-borderStrongDark"
            />
            <Button onClick={submitNewPassword} disabled={busy || !newPassword || !confirmPassword}>
              保存密码
            </Button>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        )}

        {authed && passwordSet && showingChangeForm && (
          <div className="max-w-sm space-y-3 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-card dark:bg-neo-cardDark p-6">
            <h2 className="font-semibold">修改密码</h2>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="当前密码"
              className="w-full h-10 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-canvas dark:bg-neo-canvasDark px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neo-borderStrong dark:focus:ring-neo-borderStrongDark"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新密码（至少 8 位）"
              className="w-full h-10 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-canvas dark:bg-neo-canvasDark px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neo-borderStrong dark:focus:ring-neo-borderStrongDark"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="确认新密码"
              onKeyDown={(e) => e.key === 'Enter' && submitNewPassword()}
              className="w-full h-10 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-canvas dark:bg-neo-canvasDark px-3 text-sm focus:outline-none focus:ring-2 focus:ring-neo-borderStrong dark:focus:ring-neo-borderStrongDark"
            />
            <div className="flex gap-2">
              <Button onClick={submitNewPassword} disabled={busy || !newPassword || !confirmPassword}>
                保存
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowingChangeForm(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                取消
              </Button>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        )}

        {authed && passwordSet && (
          <div className="space-y-3">
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {items.length === 0 ? (
              <p className="text-sm text-neo-muted dark:text-neo-mutedDark">暂无订阅</p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-card dark:bg-neo-cardDark p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-mono font-semibold">{item.id}</span>
                    <span className="px-1.5 py-0.5 rounded bg-neo-canvas dark:bg-neo-canvasDark border border-neo-border dark:border-neo-borderDark">
                      {templateLabel(item.templateKey)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-neo-canvas dark:bg-neo-canvasDark border border-neo-border dark:border-neo-borderDark">
                      {item.enableDns ? 'DNS' : '无 DNS'}
                    </span>
                    <span className="text-neo-muted dark:text-neo-mutedDark">
                      {item.nodeCount} 节点
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neo-muted dark:text-neo-mutedDark">
                    <span>创建：{formatTime(item.createdAt)}</span>
                    <span>最后拉取：{formatTime(item.lastAccessedAt)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      readOnly
                      value={maskUrl(item.url)}
                      className="flex-1 min-w-[220px] h-8 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-canvas dark:bg-neo-canvasDark px-2 text-xs focus:outline-none focus:ring-2 focus:ring-neo-borderStrong dark:focus:ring-neo-borderStrongDark"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(item.url)}
                      disabled={busy}
                    >
                      复制链接
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item)}
                      disabled={busy}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}