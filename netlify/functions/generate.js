exports.handler = async function(event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'GROQ_API_KEY not configured in Netlify environment variables' })
    };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const {
    industry = 'не указана',
    size = 'не указан',
    dataType = 'не указаны',
    currentPolicy = 'не указано',
    reason = 'не указана',
    secStaff = 'не указан',
    infra = 'не указана',
    companyName = 'Компания'
  } = body;

  const prompt = `Напиши политику информационной безопасности для компании.

Данные о компании:
- Название: ${companyName}
- Отрасль: ${industry}
- Размер: ${size}
- Обрабатываемые данные: ${dataType}
- Текущее состояние ИБ: ${currentPolicy}
- Причина создания политики: ${reason}
- Специалист по ИБ: ${secStaff}
- Инфраструктура: ${infra}

Требования к документу:
1. Соответствие 152-ФЗ и ГОСТ Р 57580.1-2017
2. Обязательные разделы: общие положения, область применения, управление доступом, защита информации, физическая безопасность, реагирование на инциденты, ответственность
3. Язык понятный, без прямого копирования текста из ГОСТа
4. Учти специфику отрасли и размер компании
5. Объём около 700 слов
6. Без markdown-разметки (без **, ##, * и т.д.)

Пиши только текст политики, без вступлений и пояснений.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Ты эксперт по информационной безопасности. Пишешь документы на русском языке, грамотно и профессионально.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `Groq API error: ${response.status}`;
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: errMsg })
      };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Empty response from Groq' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ result: text })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
