'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lock, LogOut, KeyRound, Shield, Copy, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
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

const inputClass =
  'w-full h-10 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-canvas dark:bg-neo-canvasDark px-3 text-sm text-neo-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-neo-borderStrong dark:focus:ring-neo-borderStrongDark placeholder:text-neo-muted/70 dark:placeholder:text-neo-mutedDark/70';

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
    <div className="relative min-h-screen bg-neo-canvas dark:bg-neo-canvasDark">
      <div className="fixed inset-0 -z-10 neo-grid-lines opacity-30 dark:opacity-20" />

      <header className="sticky top-0 z-50 w-full border-b border-neo-border dark:border-neo-borderDark bg-neo-card/95 dark:bg-neo-cardDark/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 items-center justify-between px-4 md:px-8 lg:max-w-6xl">
          <div className="flex items-center gap-3">
            <span className="neo-label text-neo-muted dark:text-neo-mutedLight hidden sm:inline">
              订阅管理
            </span>
          </div>
          <nav className="flex items-center gap-1 md:gap-2" aria-label="Admin navigation">
            <Link href="/">
              <button className="group flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neo-muted dark:text-neo-mutedLight hover:text-neo-foreground dark:hover:text-white transition-colors duration-200 border border-transparent hover:border-neo-border dark:hover:border-neo-borderDark rounded-neoMd">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">返回主页</span>
              </button>
            </Link>
            {authed && (
              <>
                {passwordSet && !showingChangeForm && (
                  <button
                    onClick={() => setShowingChangeForm(true)}
                    className="group flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neo-muted dark:text-neo-mutedLight hover:text-neo-foreground dark:hover:text-white transition-colors duration-200 border border-transparent hover:border-neo-border dark:hover:border-neo-borderDark rounded-neoMd"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span className="hidden sm:inline">修改密码</span>
                  </button>
                )}
                <div className="w-px h-4 bg-neo-border dark:bg-neo-borderDark mx-1 hidden sm:block" aria-hidden="true" />
                <button
                  onClick={handleLogout}
                  className="group flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neo-muted dark:text-neo-mutedLight hover:text-neo-foreground dark:hover:text-white transition-colors duration-200 border border-transparent hover:border-neo-border dark:hover:border-neo-borderDark rounded-neoMd"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">退出登录</span>
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-0 animate-neo-enter">
        <div className="w-full max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-6 md:space-y-8">
          {/* Page title */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-card dark:bg-neo-cardDark">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-neo-foreground dark:text-white">订阅管理</h1>
              <p className="text-sm text-neo-muted dark:text-neo-mutedDark">管理已生成的订阅链接</p>
            </div>
          </div>

          {!checksDone && (
            <p className="text-sm text-neo-muted dark:text-neo-mutedDark">加载中…</p>
          )}

          {checksDone && !authed && (
            <section className="w-full max-w-md mx-auto rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-card dark:bg-neo-cardDark p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-canvas dark:bg-neo-canvasDark">
                  <Lock className="w-5 h-5 text-neo-muted dark:text-neo-mutedLight" />
                </span>
                <div>
                  <h2 className="font-semibold text-neo-foreground dark:text-white">
                    {passwordSet ? '管理员登录' : '管理员登录'}
                  </h2>
                  <p className="text-xs text-neo-muted dark:text-neo-mutedDark">
                    {passwordSet ? '请输入管理员密码' : '首次登录，请设置初始密码'}
                  </p>
                </div>
              </div>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                autoFocus
                placeholder={passwordSet ? '输入密码' : '首次登录无需密码'}
                className={inputClass}
              />
              <Button onClick={handleLogin} disabled={busy} className="w-full">
                {passwordSet ? '登录' : '首次登录'}
              </Button>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            </section>
          )}

          {authed && !passwordSet && (
            <section className="w-full max-w-md mx-auto rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-card dark:bg-neo-cardDark p-6 md:p-8 space-y-4">
              <div>
                <h2 className="font-semibold text-neo-foreground dark:text-white">设置管理员密码</h2>
                <p className="mt-1 text-sm text-neo-muted dark:text-neo-mutedDark">
                  首次登录，请设置至少 8 位的管理员密码
                </p>
              </div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新密码（至少 8 位）"
                className={inputClass}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitNewPassword()}
                placeholder="确认新密码"
                className={inputClass}
              />
              <Button onClick={submitNewPassword} disabled={busy || !newPassword || !confirmPassword} className="w-full">
                保存密码
              </Button>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            </section>
          )}

          {authed && passwordSet && showingChangeForm && (
            <section className="w-full max-w-md mx-auto rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-card dark:bg-neo-cardDark p-6 md:p-8 space-y-4">
              <div>
                <h2 className="font-semibold text-neo-foreground dark:text-white">修改密码</h2>
                <p className="mt-1 text-sm text-neo-muted dark:text-neo-mutedDark">
                  输入当前密码与新的密码
                </p>
              </div>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="当前密码"
                className={inputClass}
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新密码（至少 8 位）"
                className={inputClass}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitNewPassword()}
                placeholder="确认新密码"
                className={inputClass}
              />
              <div className="flex gap-2">
                <Button onClick={submitNewPassword} disabled={busy || !newPassword || !confirmPassword} className="flex-1">
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
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            </section>
          )}

          {authed && passwordSet && (
            <div className="space-y-4 md:space-y-6">
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex items-center gap-2">
                <span className="neo-label text-neo-muted dark:text-neo-mutedLight">SUBSCRIPTIONS</span>
                <span className="text-sm text-neo-muted dark:text-neo-mutedDark">共 {items.length} 条</span>
              </div>
              {items.length === 0 ? (
                <section className="rounded-neoMd border border-dashed border-neo-border dark:border-neo-borderDark bg-neo-card/50 dark:bg-neo-cardDark/50 p-10 text-center text-sm text-neo-muted dark:text-neo-mutedDark">
                  暂无订阅，去首页生成一个吧
                </section>
              ) : (
                items.map((item) => (
                  <section
                    key={item.id}
                    className="rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-card dark:bg-neo-cardDark p-5 md:p-6 space-y-4"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="font-mono font-semibold text-neo-foreground dark:text-white">
                        {item.id}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-neo-canvas dark:bg-neo-canvasDark border border-neo-border dark:border-neo-borderDark text-xs text-neo-muted dark:text-neo-mutedLight">
                        {templateLabel(item.templateKey)}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-neo-canvas dark:bg-neo-canvasDark border border-neo-border dark:border-neo-borderDark text-xs text-neo-muted dark:text-neo-mutedLight">
                        {item.enableDns ? 'DNS' : '无 DNS'}
                      </span>
                      <span className="text-sm text-neo-muted dark:text-neo-mutedDark">
                        {item.nodeCount} 节点
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neo-muted dark:text-neo-mutedDark">
                      <span>创建：{formatTime(item.createdAt)}</span>
                      <span>最后拉取：{formatTime(item.lastAccessedAt)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        readOnly
                        value={maskUrl(item.url)}
                        className="flex-1 min-w-[220px] h-9 rounded-neoMd border border-neo-border dark:border-neo-borderDark bg-neo-canvas dark:bg-neo-canvasDark px-3 text-xs text-neo-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-neo-borderStrong dark:focus:ring-neo-borderStrongDark"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(item.url)}
                        disabled={busy}
                        className="gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" /> 复制
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item)}
                        disabled={busy}
                        className="gap-1.5 text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> 删除
                      </Button>
                    </div>
                  </section>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 h-px bg-neo-border dark:bg-neo-borderDark" />
    </div>
  );
}