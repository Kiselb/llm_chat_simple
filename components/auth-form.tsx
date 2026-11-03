'use client';

import { type SyntheticEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LoaderCircle, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loginLocalUser, registerLocalUser } from '@/lib/local-storage';

export function AuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const name = formValue(form, 'name');
    const email = formValue(form, 'email');
    const password = formValue(form, 'password');
    try {
      if (mode === 'register') await registerLocalUser(name, email, password);
      else await loginLocalUser(email, password);
      window.location.assign('/');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось выполнить запрос.');
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-back" href="/"><ArrowLeft /> Вернуться к чату</Link>
        <div className="auth-logo"><span><Sparkles /></span> Диалог</div>
        <h1>{mode === 'login' ? 'С возвращением' : 'Создайте аккаунт'}</h1>
        <p>{mode === 'login' ? 'Войдите, чтобы открыть диалоги, сохранённые в этом браузере.' : 'Аккаунт и история сохранятся только в этом браузере.'}</p>
        <form onSubmit={submit}>
          {mode === 'register' && <label><span>Имя</span><div><UserRound /><input name="name" autoComplete="name" maxLength={80} placeholder="Как к вам обращаться" /></div></label>}
          <label><span>Почта</span><div><Mail /><input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></div></label>
          <label><span>Пароль</span><div><LockKeyhole /><input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={128} placeholder="Не менее 8 символов" /></div></label>
          {error && <p className="auth-error">{error}</p>}
          <Button type="submit" disabled={loading}>{loading && <LoaderCircle className="spin" />}{mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</Button>
        </form>
        <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </button>
      </section>
    </main>
  );
}

function formValue(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}
