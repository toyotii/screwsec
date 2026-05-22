exports.handler = async function(event, context) {
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
      body: JSON.stringify({ error: 'GROQ_API_KEY не настроен в переменных окружения Netlify' })
    };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const {
    companyName = 'Компания',
    industry = 'не указана',
    size = 'не указан',
    dataType = 'не указаны',
    sensitiveData = 'нет',
    currentPolicy = 'нет',
    reason = 'не указана',
    secStaff = 'нет',
    infra = 'не указана',
    remoteWork = 'нет',
    thirdParty = 'нет',
    incidents = 'нет',
    compliance = 'не указано'
  } = body;

  // Build industry-specific requirements
  const industryRules = {
    'IT': 'Особое внимание: защита исходного кода и интеллектуальной собственности, безопасность CI/CD пайплайнов, управление доступом к репозиториям, защита API-ключей и секретов, политика bug bounty.',
    'Финансы': 'Особое внимание: соответствие требованиям Банка России (382-П, 683-П), PCI DSS для платёжных данных, многофакторная аутентификация для всех финансовых операций, шифрование транзакций, мониторинг аномалий.',
    'Медицина': 'Особое внимание: защита врачебной тайны (ст. 13 ФЗ-323), требования Минздрава по МИС, специальные категории ПДн (ст. 10 152-ФЗ), разграничение доступа по медицинским специализациям, журналирование доступа к медкартам.',
    'Торговля': 'Особое внимание: защита данных покупателей, PCI DSS для эквайринга, безопасность CRM и 1С, защита от скиминга, политика возвратов и доступа к кассовым системам.',
    'Производство': 'Особое внимание: защита технологических секретов и чертежей, безопасность АСУ ТП и SCADA-систем, физический доступ к производственным зонам, защита от промышленного шпионажа.',
    'Юридические': 'Особое внимание: адвокатская тайна и конфиденциальность клиентских данных, защита документов по сделкам M&A, шифрование переписки с клиентами, политика хранения и уничтожения юридических документов.'
  };

  let industrySpecific = 'Учти специфику отрасли при формулировке требований.';
  for (const key of Object.keys(industryRules)) {
    if (industry.includes(key)) {
      industrySpecific = industryRules[key];
      break;
    }
  }

  // Size-specific tone
  const sizeNote = size.includes('500') || size.includes('150–500')
    ? 'Компания среднего размера — документ должен быть формальным, с указанием подразделений и ролей.'
    : 'Небольшая компания — документ должен быть практичным и исполнимым, без избыточной бюрократии.';

  // Compliance requirements
  const complianceNote = compliance.includes('152') || dataType.includes('Персональн')
    ? 'ОБЯЗАТЕЛЬНО включи раздел о соответствии 152-ФЗ с конкретными мерами защиты персональных данных.'
    : '';

  const remoteNote = remoteWork === 'Да' || remoteWork.includes('да') || remoteWork.includes('Да')
    ? 'ОБЯЗАТЕЛЬНО включи требования к удалённой работе: VPN, шифрование устройств, запрет использования публичных Wi-Fi без защиты.'
    : '';

  const incidentNote = incidents.includes('Да') || incidents.includes('да') || incidents.includes('инцидент')
    ? 'Компания уже сталкивалась с инцидентами ИБ — сделай раздел реагирования более детальным.'
    : '';

  const prompt = `Ты опытный специалист по информационной безопасности в России. Напиши ДЕТАЛЬНУЮ и УНИКАЛЬНУЮ политику информационной безопасности.

ДАННЫЕ КОМПАНИИ:
- Название: ${companyName}
- Отрасль: ${industry}
- Количество сотрудников: ${size}
- Типы обрабатываемых данных: ${dataType}
- Чувствительные данные (спецкатегории): ${sensitiveData}
- Текущее состояние ИБ: ${currentPolicy}
- Инфраструктура: ${infra}
- Удалённая работа: ${remoteWork}
- Сторонние подрядчики с доступом к данным: ${thirdParty}
- Были ли инциденты ИБ ранее: ${incidents}
- Нормативные требования: ${compliance}
- Специалист по ИБ: ${secStaff}
- Причина создания политики: ${reason}

ОТРАСЛЕВАЯ СПЕЦИФИКА:
${industrySpecific}

ТРЕБОВАНИЯ К РАЗМЕРУ КОМПАНИИ:
${sizeNote}

ДОПОЛНИТЕЛЬНЫЕ ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ:
${complianceNote}
${remoteNote}
${incidentNote}

СТРУКТУРА ДОКУМЕНТА (все разделы обязательны):
1. ОБЩИЕ ПОЛОЖЕНИЯ — цели, область применения, нормативная база
2. ТЕРМИНЫ И ОПРЕДЕЛЕНИЯ — 5-7 ключевых терминов
3. РОЛИ И ОТВЕТСТВЕННОСТЬ — кто за что отвечает конкретно в этой компании
4. КЛАССИФИКАЦИЯ ИНФОРМАЦИИ — категории данных с примерами для данной отрасли
5. УПРАВЛЕНИЕ ДОСТУПОМ — требования к паролям, MFA, права доступа
6. ЗАЩИТА ИНФОРМАЦИОННЫХ СИСТЕМ — антивирус, обновления, резервные копии
7. ФИЗИЧЕСКАЯ БЕЗОПАСНОСТЬ — рабочие места, носители, серверные помещения
8. ${remoteWork !== 'нет' ? 'УДАЛЁННАЯ РАБОТА — VPN, личные устройства, публичные сети' : 'СЕТЕВАЯ БЕЗОПАСНОСТЬ — межсетевые экраны, сегментация, мониторинг'}
9. РАБОТА С ПЕРСОНАЛЬНЫМИ ДАННЫМИ — меры защиты ПДн, 152-ФЗ
10. РЕАГИРОВАНИЕ НА ИНЦИДЕНТЫ — порядок действий, контакты, сроки
11. ОБУЧЕНИЕ ПЕРСОНАЛА — периодичность, форматы
12. КОНТРОЛЬ И ОТВЕТСТВЕННОСТЬ — аудит, нарушения, санкции

ВАЖНЫЕ ПРАВИЛА:
- Каждый раздел минимум 3-4 конкретных пункта, не общих фраз
- Используй конкретные цифры: сроки, периодичность, минимальные требования
- Упоминай название компании "${companyName}" в тексте
- Адаптируй под отрасль — не пиши одно и то же для всех
- Без markdown (без **, ## и т.д.)
- Объём 900-1100 слов
- Только текст документа, без предисловий`;

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
            content: 'Ты ведущий специалист по информационной безопасности с 15-летним опытом в России. Ты пишешь юридически грамотные, практичные документы на русском языке. Каждая политика которую ты пишешь уникальна и точно отражает специфику конкретной организации. Ты никогда не используешь шаблонные фразы и всегда адаптируешь документ под реальные условия компании.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.85,
        max_tokens: 2500,
        top_p: 0.95
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
      return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Empty response' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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
