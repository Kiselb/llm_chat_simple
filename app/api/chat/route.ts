import OpenAI from 'openai';

export const runtime = 'nodejs';

type HistoryMessage = { role: 'user' | 'assistant'; content: string };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { text?: unknown; history?: unknown } | null;
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > 4000) {
    return Response.json({ error: 'Сообщение должно содержать от 1 до 4000 символов.' }, { status: 400 });
  }

  const history = parseHistory(body?.history);
  if (!history) return Response.json({ error: 'Некорректная история диалога.' }, { status: 400 });

  const apiKey = process.env.PROXY_API_API_KEY?.trim();
  const baseURL = process.env.PROXY_API_OPENAI_BASE_URL?.trim().replace(/\/$/, '');
  if (!apiKey || !baseURL) {
    return Response.json({ error: 'Прокси OpenAI не настроен на сервере.' }, { status: 500 });
  }

  try {
    const client = new OpenAI({ apiKey, baseURL });
    const completion = await client.chat.completions.create({
      model: process.env.PROXY_API_OPENAI_MODEL?.trim() || 'gpt-4o-mini',
      messages: [
        {
          role: 'developer',
          content: 'Ты полезный AI-ассистент в приложении «Диалог». Отвечай на языке пользователя, ясно и по существу. Используй контекст переписки, не выдумывай факты и отмечай существенную неопределённость.',
        },
        ...history,
        { role: 'user', content: text },
      ],
      temperature: 0.7,
    });
    const answer = completion.choices[0]?.message.content?.trim();
    if (!answer) throw new Error('AI вернул пустой ответ.');
    return Response.json({ answer });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось получить ответ AI.';
    return Response.json({ error: message }, { status: 502 });
  }
}

function parseHistory(value: unknown): HistoryMessage[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 30) return null;
  const result: HistoryMessage[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) return null;
    const role = 'role' in item ? item.role : null;
    const content = 'content' in item ? item.content : null;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || content.length > 4000) return null;
    result.push({ role, content });
  }
  return result;
}
