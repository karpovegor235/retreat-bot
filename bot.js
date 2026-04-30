const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// ===== НАСТРОЙКИ =====
const TOKEN = '8376903942:AAHm2T5QaAFQbrhu_ivhf7-11-ZH9S-D_zQ';
const SITE_URL = 'https://retreat.idealab.by/';
const ORGANIZER_TG = 'egor_provedet';
const ORGANIZER_PHONE = '+375291936694';
const ADMIN_ID = 'egor_provedet';
const GIFT_FOLDER_LINK = 'https://drive.google.com/drive/folders/1m8db4gEiLLwD1caYvEsGybIs9cm_EzEg';

const bot = new TelegramBot(TOKEN, { polling: true });

// Хранилище диалогов
const userDialogs = {};

// Главное меню
const mainMenu = {
    reply_markup: {
        keyboard: [
            [{ text: '🎴 Пройти тест' }, { text: '🎁 Получить подарок' }],
            [{ text: '🌿 О ретрите' }, { text: '❓ FAQ' }, { text: '📞 Контакты' }],
            [{ text: '🌐 Сайт' }]
        ],
        resize_keyboard: true
    }
};

// ===== /start — СРАЗУ НАЧИНАЕМ ДИАЛОГ =====
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    userDialogs[chatId] = { step: 'name', data: {} };
    
    bot.sendMessage(chatId,
        `✨ Привет! ✨\n\nЯ бот ретрита «Инь·Янь. Баланс».\n\n🌿 *Давай познакомимся!*\n\n*Как тебя зовут?*`,
        { parse_mode: 'Markdown' }
    );
});

// ===== ОБРАБОТКА ДИАЛОГА =====
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const dialog = userDialogs[chatId];
    const text = msg.text;
    
    if (!dialog) return;
    
    const menuButtons = ['🎴 Пройти тест', '🎁 Получить подарок', '🌿 О ретрите', '❓ FAQ', '📞 Контакты', '🌐 Сайт'];
    if (menuButtons.includes(text)) {
        delete userDialogs[chatId];
        return;
    }
    
    switch (dialog.step) {
        case 'name':
            dialog.data.name = text;
            dialog.step = 'experience';
            bot.sendMessage(chatId,
                `Приятно познакомиться, *${dialog.data.name}*! 🤝\n\n*Был ли у тебя опыт участия в ретритах?*`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '✨ Никогда, но хочу попробовать', callback_data: 'exp_never' }],
                            [{ text: '🌱 Был 1-2 раза', callback_data: 'exp_few' }],
                            [{ text: '🌸 Да, регулярно участвую', callback_data: 'exp_many' }]
                        ]
                    }
                }
            );
            break;
            
        case 'experience':
            dialog.data.experience = text;
            dialog.step = 'want';
            bot.sendMessage(chatId,
                `🌿 *Что бы ты хотела получить от ретрита?*\n\nНапиши своими словами ✍️`,
                { parse_mode: 'Markdown' }
            );
            break;
            
        case 'want':
            dialog.data.want = text;
            dialog.step = 'fears';
            bot.sendMessage(chatId,
                `💭 *Есть ли что-то, что тебя останавливает или пугает?*\n\nЕсли ничего не пугает, напиши "нет" 🙏`,
                { parse_mode: 'Markdown' }
            );
            break;
            
        case 'fears':
            dialog.data.fears = text;
            dialog.step = 'expectations';
            bot.sendMessage(chatId,
                `🌟 *Как ты представляешь идеальный отдых для себя?*\n\nЧто для тебя важно? Тишина? Общение? Природа? Практики?`,
                { parse_mode: 'Markdown' }
            );
            break;
            
        case 'expectations':
            dialog.data.expectations = text;
            
            const summary = `
✨ *${dialog.data.name}, спасибо за откровенный разговор!* ✨

🌿 *Вот что я поняла о тебе:*
• Ты хочешь: *${dialog.data.want.slice(0, 100)}*
• ${dialog.data.fears !== 'нет' ? `Тебя немного волнует: ${dialog.data.fears.slice(0, 80)}` : 'Сомнений нет, это прекрасно!'}

🎁 *Вот твой подарок* — 2 практики на восстановление баланса:
👉 [Скачать подарок](${GIFT_FOLDER_LINK})

🌿 *Хочешь узнать подробнее о ретрите?*
Нажми на кнопку ниже 👇
            `;
            
            bot.sendMessage(chatId, summary, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🌿 Расскажи подробнее о ретрите', callback_data: 'detailed_retreat' }],
                        [{ text: '📞 Связаться с организатором', url: `https://t.me/${ORGANIZER_TG}` }]
                    ]
                }
            });
            
            // Уведомление админу
            bot.sendMessage(`@${ADMIN_ID}`, 
                `📋 *Новый диалог!*\n👤 ${dialog.data.name}\n🎯 ${dialog.data.want}\n🕐 ${new Date().toLocaleString()}`,
                { parse_mode: 'Markdown' }
            ).catch(() => {});
            
            delete userDialogs[chatId];
            break;
    }
});

// ===== ОБРАБОТКА INLINE-КНОПОК =====
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const dialog = userDialogs[chatId];
    
    // Обработка выбора опыта
    if (data && data.startsWith('exp_')) {
        const expMap = {
            'exp_never': '✨ Никогда, но хочу попробовать',
            'exp_few': '🌱 Был 1-2 раза',
            'exp_many': '🌸 Да, регулярно участвую'
        };
        if (dialog && dialog.step === 'experience') {
            dialog.data.experience = expMap[data];
            dialog.step = 'want';
            bot.sendMessage(chatId, `🌿 *Что бы ты хотела получить от ретрита?*\n\nНапиши своими словами ✍️`, { parse_mode: 'Markdown' });
            bot.answerCallbackQuery(query.id);
        }
    }
    
    // Подробнее о ретрите
    if (data === 'detailed_retreat') {
        bot.sendMessage(chatId,
            `🌿 *Подробнее о ретрите «Инь·Янь. Баланс»*

📍 *Где?* Загородный коттедж в Могилёвской области, среди леса и тишины.

📅 *Когда?* 29–31 мая 2026 (3 дня)

👭 *Для кого?* Для женщин, которые чувствуют усталость, хотят остановиться и вернуть себе целостность.

🌟 *Что вас ждёт?*

• 🧘‍♀️ Инь и Янь йога — мягкие и динамичные практики
• 💃 Сакральный танец — танец души без правил
• 🔥 Гвоздестояние — работа со страхами
• 🧖‍♀️ Банные ритуалы — очищение тела и духа
• ☯️ Мандала выбора цвета — ритуал для понимания своей энергии
• 🌳 Работа с родом — освобождение от сценариев

💰 *Стоимость:* 450 BYN (всё включено)

📞 *Запись и вопросы:* @${ORGANIZER_TG}

🌸 *Осталось всего 12 мест!*

👇 *Хочешь посмотреть программу по дням?*`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🌙 День 1 (29 мая)', callback_data: 'day1' }],
                        [{ text: '☀️ День 2 (30 мая)', callback_data: 'day2' }],
                        [{ text: '🌸 День 3 (31 мая)', callback_data: 'day3' }],
                        [{ text: '📞 Записаться', callback_data: 'register' }],
                        [{ text: '🔙 Главное меню', callback_data: 'main_menu' }]
                    ]
                }
            }
        );
        bot.answerCallbackQuery(query.id);
    }
    
    // Программа по дням
    if (data === 'day1') {
        bot.sendMessage(chatId,
            `🌙 *День 1 — Встреча и выбор цвета*

14:00 — Заезд, расселение
15:00 — Обед
16:00 — «Первая тишина» — знакомство
17:00 — «Зеркало круга» — знакомство в кругу
18:00 — «Выбор цвета» — мандала
19:00 — Сакральный танец
20:00 — Ужин
21:00 — Вечерняя тишина`,
            { parse_mode: 'Markdown' }
        );
        bot.answerCallbackQuery(query.id);
    }
    
    if (data === 'day2') {
        bot.sendMessage(chatId,
            `☀️ *День 2 — Погружение*

08:00 — Инь-йога
09:30 — Завтрак
11:00 — «Река течёт» — образ застоев
13:00 — Обед
15:00 — «Узел рода» — работа с родом
17:00 — «Лицом к страху» — встреча со страхом
19:00 — Ужин
20:00 — Баня`,
            { parse_mode: 'Markdown' }
        );
        bot.answerCallbackQuery(query.id);
    }
    
    if (data === 'day3') {
        bot.sendMessage(chatId,
            `🌸 *День 3 — Интеграция*

08:00 — Янь-йога
09:30 — Завтрак
11:00 — «Переворот» — от страха к силе
13:00 — «Второй цвет» — символ баланса
14:00 — Круг закрытия
15:00 — Обед и отъезд`,
            { parse_mode: 'Markdown' }
        );
        bot.answerCallbackQuery(query.id);
    }
    
    if (data === 'register') {
        bot.sendMessage(chatId,
            `✨ *Запись на ретрит*

📞 Свяжитесь с организатором: @${ORGANIZER_TG}
📞 Или позвоните: ${ORGANIZER_PHONE}

🌐 Или заполните форму на сайте: ${SITE_URL}

🌸 *Осталось всего 12 мест!*`,
            { parse_mode: 'Markdown' }
        );
        bot.answerCallbackQuery(query.id);
    }
    
    if (data === 'main_menu') {
        bot.sendMessage(chatId, `Главное меню:`, mainMenu);
        bot.answerCallbackQuery(query.id);
    }
});

// ===== ОСТАЛЬНЫЕ КОМАНДЫ =====

bot.onText(/🎴 Пройти тест/, (msg) => startTest(msg.chat.id));

bot.onText(/🎁 Получить подарок/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `🎁 *${msg.from.first_name}, вот твой подарок!*\n\n👉 [Скачать 2 практики](${GIFT_FOLDER_LINK})\n\n🌙 Инь-практика — расслабление\n☀️ Янь-практика — энергия`,
        { parse_mode: 'Markdown' }
    );
});

bot.onText(/🌿 О ретрите/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `🌿 *Ретрит «Инь·Янь. Баланс»*\n\n📅 29–31 мая 2026\n📍 Могилёвская область\n💰 450 BYN\n\n📞 ${ORGANIZER_PHONE}`,
        { parse_mode: 'Markdown' }
    );
});

bot.onText(/❓ FAQ/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `❓ *Частые вопросы*\n\n1️⃣ *Нужен опыт?* Нет\n2️⃣ *Что взять?* Удобную одежду, купальник\n3️⃣ *Телефоны?* Сдаются на входе\n4️⃣ *Оплата?* Предоплата 100 BYN\n\n📞 ${ORGANIZER_PHONE}`,
        { parse_mode: 'Markdown' }
    );
});

bot.onText(/📞 Контакты/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `📞 *Контакты*\n\n📱 @${ORGANIZER_TG}\n📞 ${ORGANIZER_PHONE}\n🌐 ${SITE_URL}`,
        { parse_mode: 'Markdown' }
    );
});

bot.onText(/🌐 Сайт/, (msg) => {
    bot.sendMessage(msg.chat.id, `🌐 ${SITE_URL}`, {
        reply_markup: { inline_keyboard: [[{ text: 'Открыть сайт', url: SITE_URL }]] }
    });
});

bot.onText(/Хочу на ретрит/i, (msg) => {
    bot.sendMessage(msg.chat.id, `✨ Отлично!\n\n📞 Свяжись: @${ORGANIZER_TG} или ${ORGANIZER_PHONE}`, { parse_mode: 'Markdown' });
});

// ===== ТЕСТ =====
let testUsers = {};

function startTest(chatId) {
    testUsers[chatId] = { step: 0, answers: [] };
    askTestQuestion(chatId, 0);
}

function askTestQuestion(chatId, idx) {
    const questions = ["Когда проблема — действуешь или наблюдаешь?", "Восстанавливаешь силы в движении или тишине?", "Что ближе — контроль или поток?"];
    const opts = [["⚡ Действую", "🌙 Наблюдаю"], ["🏃‍♀️ Движение", "🛋️ Тишина"], ["📋 Контроль", "🌊 Поток"]];
    bot.sendMessage(chatId, `🌓 *Вопрос ${idx+1}/3*\n${questions[idx]}`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: opts[idx][0], callback_data: 'test_yan' }], [{ text: opts[idx][1], callback_data: 'test_yin' }]] }
    });
}

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const user = testUsers[chatId];
    if (data === 'test_yan' || data === 'test_yin') {
        if (user && user.step < 3) {
            user.answers.push(data);
            user.step++;
            if (user.step < 3) askTestQuestion(chatId, user.step);
            else {
                const yinCount = user.answers.filter(a => a === 'test_yin').length;
                const result = yinCount >= 2 ? '🌙 Инь · Принятие' : '☀️ Янь · Действие';
                bot.sendMessage(chatId, `✨ *Твой баланс:* ${result}\n\n🎁 Нажми "🎁 Получить подарок"!`, { parse_mode: 'Markdown', ...mainMenu });
                delete testUsers[chatId];
            }
            bot.answerCallbackQuery(query.id);
        }
    }
});

// Health check сервер
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
});
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => console.log(`✅ Health check on port ${PORT}`));

console.log('✅ Бот запущен! Диалог начинается сразу.');