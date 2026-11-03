export type LocalUser = {
  userId: string;
  email: string;
  fullName: string | null;
};

export type LocalConversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export type LocalMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};

type LocalAccount = LocalUser & {
  salt: string;
  passwordHash: string;
  createdAt: number;
};

type ConversationRecord = LocalConversation & {
  userId: string;
  messages: LocalMessage[];
};

const ACCOUNTS_KEY = 'dialog.accounts.v1';
const SESSION_KEY = 'dialog.session.v1';
const CONVERSATIONS_KEY = 'dialog.conversations.v1';

export function getLocalUser(): LocalUser | null {
  const userId = localStorage.getItem(SESSION_KEY);
  if (!userId) return null;
  const account = readAccounts().find((item) => item.userId === userId);
  return account ? publicUser(account) : null;
}

export async function registerLocalUser(name: string, emailValue: string, password: string): Promise<LocalUser> {
  const email = emailValue.trim().toLowerCase();
  validateCredentials(email, password);
  const accounts = readAccounts();
  if (accounts.some((item) => item.email === email)) {
    throw new Error('Пользователь с такой почтой уже зарегистрирован в этом браузере.');
  }

  const salt = randomHex(16);
  const account: LocalAccount = {
    userId: crypto.randomUUID(),
    email,
    fullName: name.trim().slice(0, 80) || null,
    salt,
    passwordHash: await hashPassword(password, salt),
    createdAt: Date.now(),
  };
  writeJson(ACCOUNTS_KEY, [...accounts, account]);
  localStorage.setItem(SESSION_KEY, account.userId);
  return publicUser(account);
}

export async function loginLocalUser(emailValue: string, password: string): Promise<LocalUser> {
  const email = emailValue.trim().toLowerCase();
  const account = readAccounts().find((item) => item.email === email);
  if (!account || await hashPassword(password, account.salt) !== account.passwordHash) {
    throw new Error('Неверная почта или пароль.');
  }
  localStorage.setItem(SESSION_KEY, account.userId);
  return publicUser(account);
}

export function logoutLocalUser(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function listLocalConversations(userId: string): LocalConversation[] {
  return readConversations()
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(({ id, title, createdAt, updatedAt }) => ({ id, title, createdAt, updatedAt }));
}

export function readLocalMessages(userId: string, conversationId: string): LocalMessage[] | null {
  const conversation = readConversations().find((item) => item.id === conversationId && item.userId === userId);
  return conversation ? conversation.messages : null;
}

export function saveLocalExchange(
  userId: string,
  text: string,
  answer: string,
  conversationId?: string,
): { conversation: LocalConversation; messages: LocalMessage[] } {
  const conversations = readConversations();
  const now = Date.now();
  let conversation = conversationId
    ? conversations.find((item) => item.id === conversationId && item.userId === userId)
    : undefined;
  if (conversationId && !conversation) throw new Error('Диалог не найден.');

  if (!conversation) {
    conversation = {
      id: crypto.randomUUID(),
      userId,
      title: text.length > 44 ? `${text.slice(0, 44).trim()}…` : text,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    conversations.push(conversation);
  }

  const messages: LocalMessage[] = [
    { id: crypto.randomUUID(), role: 'user', content: text, createdAt: now },
    { id: crypto.randomUUID(), role: 'assistant', content: answer, createdAt: now + 1 },
  ];
  conversation.messages.push(...messages);
  conversation.updatedAt = now + 1;
  writeJson(CONVERSATIONS_KEY, conversations);
  return {
    conversation: {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    },
    messages,
  };
}

function readAccounts(): LocalAccount[] {
  return readJson<LocalAccount[]>(ACCOUNTS_KEY, []);
}

function readConversations(): ConversationRecord[] {
  return readJson<ConversationRecord[]>(CONVERSATIONS_KEY, []);
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error('Не удалось сохранить данные в локальном хранилище браузера.');
  }
}

function publicUser(account: LocalAccount): LocalUser {
  return { userId: account.userId, email: account.email, fullName: account.fullName };
}

function validateCredentials(email: string, password: string): void {
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) throw new Error('Введите корректный адрес почты.');
  if (password.length < 8 || password.length > 128) throw new Error('Пароль должен содержать от 8 до 128 символов.');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomHex(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
