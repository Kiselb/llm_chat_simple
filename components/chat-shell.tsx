'use client';

import { type SyntheticEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, Bot, ChevronDown, LoaderCircle, LogIn, Menu, MessageSquare, Plus, Search, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  getLocalUser,
  listLocalConversations,
  logoutLocalUser,
  readLocalMessages,
  saveLocalExchange,
  type LocalConversation,
  type LocalMessage,
  type LocalUser,
} from '@/lib/local-storage';

const welcome: LocalMessage = {
  id: 'welcome', role: 'assistant', createdAt: Date.now(),
  content: 'Здравствуйте! Я ваш AI-помощник. Могу помочь с идеями, текстами, планированием или просто ответить на вопрос.\n\nС чего начнём?',
};

export function ChatShell() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [conversations, setConversations] = useState<LocalConversation[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [messages, setMessages] = useState<LocalMessage[]>([welcome]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentUser = getLocalUser();
      setUser(currentUser);
      setConversations(currentUser ? listLocalConversations(currentUser.userId) : []);
      setCurrentDate(formatCurrentDate(new Date()));
      setSessionReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const filteredThreads = useMemo(() => conversations.filter((item) => item.title.toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru'))), [conversations, search]);

  function openConversation(id: string) {
    if (!user) return;
    setError('');
    setSidebarOpen(false);
    const savedMessages = readLocalMessages(user.userId, id);
    if (!savedMessages) {
      setError('Диалог не найден в локальном хранилище.');
      return;
    }
    setActiveId(id);
    setMessages(savedMessages.length ? savedMessages : [welcome]);
  }

  function newChat() {
    setActiveId(undefined); setMessages([welcome]); setDraft(''); setError(''); setSidebarOpen(false);
  }

  function logout() {
    logoutLocalUser();
    setUser(null);
    setConversations([]);
    newChat();
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || loading || !user) return;
    setDraft(''); setLoading(true); setError('');
    const optimistic: LocalMessage = { id: `pending-${Date.now()}`, role: 'user', content: text, createdAt: Date.now() };
    setMessages((current) => [...current, optimistic]);
    try {
      const history = messages.filter((item) => item.id !== 'welcome').slice(-30).map(({ role, content }) => ({ role, content }));
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, history }),
      });
      const data = await response.json() as { answer?: string; error?: string };
      if (!response.ok || !data.answer) throw new Error(data.error || 'Не удалось получить ответ.');

      const saved = saveLocalExchange(user.userId, text, data.answer, activeId);
      setMessages((current) => [...current.filter((item) => item.id !== optimistic.id), ...saved.messages]);
      setActiveId(saved.conversation.id);
      setConversations(listLocalConversations(user.userId));
    } catch (reason) {
      setMessages((current) => current.filter((item) => item.id !== optimistic.id)); setDraft(text);
      setError(reason instanceof Error ? reason.message : 'Ошибка отправки.');
    } finally { setLoading(false); }
  }

  return (
    <main className="app-shell">
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Закрыть меню" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><Sparkles aria-hidden="true" /></div><span>Диалог</span>
          <Button variant="ghost" size="icon" className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Закрыть меню"><X /></Button>
        </div>
        <p className="sidebar-date" aria-label="Текущая дата">{currentDate}</p>
        <Button className="new-chat" variant="outline" onClick={newChat}><Plus /> Новый чат</Button>
        <label className="search-button"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по чатам" aria-label="Поиск по чатам" /></label>
        <nav className="thread-list" aria-label="История чатов">
          <p className="section-label">Недавние</p>
          {!sessionReady && <span className="sidebar-status"><LoaderCircle className="spin" /> Загружаем историю</span>}
          {sessionReady && filteredThreads.length === 0 && <span className="sidebar-empty">Здесь появятся диалоги из этого браузера</span>}
          {filteredThreads.map((thread) => (
            <button className={thread.id === activeId ? 'thread active' : 'thread'} key={thread.id} type="button" onClick={() => openConversation(thread.id)}>
              <MessageSquare /><span>{thread.title}</span>
            </button>
          ))}
        </nav>
        <div className="account-card">
          <div className="avatar">{user?.email.slice(0, 1).toUpperCase() ?? '?'}</div>
          <div className="min-w-0 flex-1"><strong>{user?.fullName ?? 'Гостевой режим'}</strong><span>{user?.email ?? 'Войдите, чтобы сохранять чаты'}</span></div>
          <ChevronDown aria-hidden="true" />
        </div>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <Button variant="ghost" size="icon" className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Открыть меню"><Menu /></Button>
          <div><strong>{conversations.find((item) => item.id === activeId)?.title ?? 'Новый диалог'}</strong><span><i /> Диалог AI онлайн</span></div>
          {user ? <button className="auth-link" type="button" onClick={logout}>Выйти</button> : <Link className="auth-link primary" href="/login"><LogIn /> Войти по почте</Link>}
        </header>

        <div className="messages" aria-live="polite">
          <div className="day-divider"><span>Сегодня</span></div>
          {messages.map((message) => (
            <div className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`} key={message.id}>
              {message.role === 'assistant' && <div className="bot-avatar"><Bot /></div>}
              <div>
                <div className="message-meta"><strong>{message.role === 'user' ? 'Вы' : 'Диалог AI'}</strong><time>{formatTime(message.createdAt)}</time></div>
                <div className={`bubble ${message.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>{message.content.split('\n').map((line, index) => line ? <p key={index}>{line}</p> : null)}</div>
              </div>
              {message.role === 'user' && <div className="avatar small">{user?.email.slice(0, 1).toUpperCase() ?? 'Я'}</div>}
            </div>
          ))}
          {loading && <div className="message assistant-message"><div className="bot-avatar"><Bot /></div><div><div className="message-meta"><strong>Диалог AI</strong></div><div className="bubble assistant-bubble typing"><i /><i /><i /></div></div></div>}
          <div ref={bottomRef} />
        </div>

        <form className="composer-wrap" onSubmit={submit}>
          {error && <p className="error-message">{error}</p>}
          {!user && sessionReady && <p className="signin-hint"><Link href="/login">Войдите по почте</Link>, чтобы отправлять сообщения. Данные сохраняются в этом браузере.</p>}
          <div className="composer">
            <Textarea aria-label="Сообщение" placeholder={user ? 'Напишите сообщение…' : 'Войдите, чтобы начать диалог'} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!user || loading} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
            <div className="composer-actions"><span>AI может ошибаться. Проверяйте важную информацию.</span><Button type="submit" size="icon" disabled={!user || loading || !draft.trim()} aria-label="Отправить сообщение">{loading ? <LoaderCircle className="spin" /> : <ArrowUp />}</Button></div>
          </div>
        </form>
      </section>
    </main>
  );
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
}

const RUSSIAN_MONTHS = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];

function formatCurrentDate(date: Date) {
  return `${date.getFullYear()} ${RUSSIAN_MONTHS[date.getMonth()]} ${date.getDate()}`;
}
