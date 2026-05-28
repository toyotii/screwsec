export async function onRequestPost(context) {
  const apiKey = context.env.GROQ_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY не настроен' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  let body;
  try { body = await context.request.json(); }
  catch (e) { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  const {
    companyName = 'Компания', industry = 'не указана', size = 'не указан',
    dataType = 'не указаны', sensitiveData = 'нет', infra = 'не указана',
    remoteWork = 'нет', thirdParty = 'нет', currentPolicy = 'нет',
    incidents = 'нет', compliance = 'не указано', secStaff = 'нет', reason = 'не указана'
  } = body;

  const industryRules = {
    'IT': 'Особое внимание: защита исходного кода, безопасность CI/CD, управление доступом к репозиториям, защита API-ключей.',
    'Финансы': 'Особое внимание: требования Банка России (382-П, 683-П), PCI DSS, многофакторная аутентификация, мониторинг аномалий.',
    'Медицина': 'Особое внимание: врачебная тайна (ст. 13 ФЗ-323), специальные категории ПДн (ст. 10 152-ФЗ), журналирование доступа к медкартам.',
    'Торговля': 'Особое внимание: защита данных покупателей, PCI DSS для эквайринга, безопасность CRM и 1С.',
    'Производство': 'Особое внимание: защита технологических секретов, безопасность АСУ ТП, физический доступ к производственным зонам.',
    'Юридические': 'Особое внимание: адвокатская тайна, конфиденциальность клиентских данных, шифрование переписки.'
  };

  let industrySpecific = 'Учти специфику отрасли при формулировке требований.';
  for (const key of Object.keys(industryRules)) {
    if (industry.includes(key)) { industrySpecific = industryRules[key]; break; }
  }

  const prompt = `Ты опытный специалист по информационной безопасности в России. Напиши детальную и уникальную политику информационной безопасности.

ДАННЫЕ КОМПАНИИ:
- Название: ${companyName}
- Отрасль: ${industry}
- Сотрудников: ${size}
- Данные: ${dataType}
- Чувствительные данные: ${sensitiveData}
- Инфраструктура: ${infra}
- Удалённая работа: ${remoteWork}
- Подрядчики с доступом: ${thirdParty}
- Текущее состояние ИБ: ${currentPolicy}
- Инциденты ранее: ${incidents}
- Нормативные требования: ${compliance}
- Специалист по ИБ: ${secStaff}
- Причина создания: ${reason}

ОТРАСЛЕВАЯ СПЕЦИФИКА: ${industrySpecific}

СТРУКТУРА (все разделы обязательны):
1. ОБЩИЕ ПОЛОЖЕНИЯ
2. ТЕРМИНЫ И ОПРЕДЕЛЕНИЯ
3. РОЛИ И ОТВЕТСТВЕННОСТЬ
4. КЛАССИФИКАЦИЯ ИНФОРМАЦИИ
5. УПРАВЛЕНИЕ ДОСТУПОМ
6. ЗАЩИТА ИНФОРМАЦИОННЫХ СИСТЕМ
7. ФИЗИЧЕСКАЯ БЕЗОПАСНОСТЬ
8. ${remoteWork !== 'нет' ? 'УДАЛЁННАЯ РАБОТА' : 'СЕТЕВАЯ БЕЗОПАСНОСТЬ'}
9. РАБОТА С ПЕРСОНАЛЬНЫМИ ДАННЫМИ
10. РЕАГИРОВАНИЕ НА ИНЦИДЕНТЫ
11. ОБУЧЕНИЕ ПЕРСОНАЛА
12. КОНТРОЛЬ И ОТВЕТСТВЕННОСТЬ

Правила: конкретные цифры и сроки в каждом разделе, упоминай "${companyName}", адаптируй под отрасль, без markdown, объём 900-1100 слов, только текст документа.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Ты ведущий специалист по информационной безопасности с 15-летним опытом в России. Каждая политика уникальна и точно отражает специфику организации.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.85,
        max_tokens: 2500
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: err.error?.message || `Groq error: ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return new Response(JSON.stringify({ error: 'Empty response' }), { status: 500 });

    return new Response(JSON.stringify({ result: text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
