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

// Хранилище для теста
let testUsers = {};

// Главное меню (кнопки внизу)
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

// ===== ФУНКЦИЯ ОТПРАВКИ ПОДРОБНОЙ ИНФОРМАЦИИ О РЕТРИТЕ =====
function sendDetailedRetreat(chatId) {
    bot.sendMessage(chatId,
        `🌿 *Подробнее о ретрите «Инь·Янь. Баланс»*

📍 *Место:* Загородный коттедж в Могилёвской области
📅 *Даты:* 29–31 мая 2026
👭 *Формат:* до 12 человек

💰 *Стоимость:* 600 BYN (всё включено)
💳 *Предоплата:* 200 BYN

🌟 *Программа:*
• 🧘‍♀️ Инь и Янь йога
• 💃 Сакральный танец
• 🔥 Гвоздестояние
• 🧖‍♀️ Банные ритуалы
• ☯️ Мандала выбора цвета
• 🌳 Работа с родом

📞 @${ORGANIZER_TG}

👇 *Программа по дням:*`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🌙 День 1', callback_data: 'day1' }, { text: '☀️ День 2', callback_data: 'day2' }, { text: '🌸 День 3', callback_data: 'day3' }],
                    [{ text: '📞 Записаться', callback_data: 'register' }],
                    [{ text: '🔙 Главное меню', callback_data: 'main_menu' }]
                ]
            }
        }
    );
}

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

// ===== ФУНКЦИИ ДЛЯ ТЕСТА =====
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

// ===== ОБРАБОТКА INLINE-КНОПОК =====
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const messageId = query.message.message_id;
    const user = testUsers[chatId];
    
    console.log('✅ Callback получен:', data, 'ChatId:', chatId);
    
    // ===== ОБРАБОТКА КНОПКИ "РАССКАЖИ ПОДРОБНЕЕ" (САМАЯ ПРИОРИТЕТНАЯ) =====
    if (data === 'detailed_retreat') {
        console.log('📢 Обработка кнопки "Расскажи подробнее" для чата:', chatId);
        // Завершаем диалог если он есть
        if (userDialogs[chatId]) {
            delete userDialogs[chatId];
            console.log('🗑️ Диалог завершён');
        }
        // Отправляем подробную информацию
        sendDetailedRetreat(chatId);
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    // ===== ЗАВЕРШАЕМ ДИАЛОГ ПРИ ЛЮБОМ ДРУГОМ INLINE-ДЕЙСТВИИ (кроме выбора опыта) =====
    if (!['exp_never', 'exp_few', 'exp_many'].includes(data) && userDialogs[chatId]) {
        delete userDialogs[chatId];
        console.log(`Диалог с ${chatId} завершён (нажато: ${data})`);
    }
    
    // 1. ТЕСТ (Инь/Янь вопросы)
    if ((data === 'test_yan' || data === 'test_yin') && user && user.step < 3) {
        user.answers.push(data);
        user.step++;
        if (user.step < 3) {
            askTestQuestion(chatId, user.step);
        } else {
            const yinCount = user.answers.filter(a => a === 'test_yin').length;
            const result = yinCount >= 2 ? '🌙 Инь · Принятие' : '☀️ Янь · Действие';
            bot.sendMessage(chatId, `✨ *Твой баланс:* ${result}\n\n🎁 Нажми "🎁 Получить подарок"!`, { parse_mode: 'Markdown', ...mainMenu });
            delete testUsers[chatId];
        }
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    // 2. ВЫБОР ОПЫТА В ДИАЛОГЕ
    if (data === 'exp_never' || data === 'exp_few' || data === 'exp_many') {
        const expMap = {
            'exp_never': '✨ Никогда, но хочу попробовать',
            'exp_few': '🌱 Был 1-2 раза',
            'exp_many': '🌸 Да, регулярно участвую'
        };
        const dialog = userDialogs[chatId];
        if (dialog && dialog.step === 'experience') {
            dialog.data.experience = expMap[data];
            dialog.step = 'want';
            bot.editMessageText(`🌿 *Что бы ты хотела получить от ретрита?*\n\nНапиши своими словами ✍️`, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
            });
        }
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    // 3. ДЕНЬ 1
    if (data === 'day1') {
        bot.sendMessage(chatId,
            `🌙 *День 1 — 29 мая*

14:00 — Заезд, расселение
15:00 — Обед
16:00 — «Первая тишина»
17:00 — «Зеркало круга»
18:00 — «Выбор цвета» — мандала
19:00 — Сакральный танец
20:00 — Ужин
21:00 — Вечерняя тишина`,
            { parse_mode: 'Markdown' }
        );
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    // 4. ДЕНЬ 2
    if (data === 'day2') {
        bot.sendMessage(chatId,
            `☀️ *День 2 — 30 мая*

08:00 — Инь-йога
09:30 — Завтрак
11:00 — «Река течёт»
13:00 — Обед
15:00 — «Узел рода»
17:00 — «Лицом к страху»
19:00 — Ужин
20:00 — Баня`,
            { parse_mode: 'Markdown' }
        );
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    // 5. ДЕНЬ 3
    if (data === 'day3') {
        bot.sendMessage(chatId,
            `🌸 *День 3 — 31 мая*

08:00 — Янь-йога
09:30 — Завтрак
11:00 — «Переворот»
13:00 — «Второй цвет» — символ баланса
14:00 — Круг закрытия
15:00 — Обед и отъезд`,
            { parse_mode: 'Markdown' }
        );
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    // 6. ЗАПИСАТЬСЯ
    if (data === 'register') {
        bot.sendMessage(chatId,
            `✨ *Запись на ретрит*

💰 600 BYN (предоплата 200 BYN)

📞 Свяжитесь с организатором: @${ORGANIZER_TG}
📞 Или позвоните: ${ORGANIZER_PHONE}
🌐 Или на сайте: ${SITE_URL}

🌸 *Осталось 12 мест!*`,
            { parse_mode: 'Markdown' }
        );
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    // 7. ГЛАВНОЕ МЕНЮ
    if (data === 'main_menu') {
        bot.sendMessage(chatId, `Главное меню:`, mainMenu);
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    // Если ничего не подошло
    console.log('❓ Неизвестный callback:', data);
    bot.answerCallbackQuery(query.id, { text: 'Действие не распознано' });
});

// ===== ОСТАЛЬНЫЕ КОМАНДЫ (КНОПКИ ГЛАВНОГО МЕНЮ) =====

bot.onText(/🎴 Пройти тест/, (msg) => startTest(msg.chat.id));

bot.onText(/🎁 Получить подарок/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `🎁 *${msg.from.first_name}, вот твой подарок!*\n\n👉 [Скачать 2 практики](${GIFT_FOLDER_LINK})\n\n🌙 Инь-практика — расслабление\n☀️ Янь-практика — энергия`,
        { parse_mode: 'Markdown' }
    );
});

bot.onText(/🌿 О ретрите/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `🌿 *Ретрит «Инь·Янь. Баланс»*\n\n📅 29–31 мая 2026\n📍 Могилёвская область\n💰 *Стоимость:* 600 BYN (всё включено)\n💳 *Предоплата:* 200 BYN для бронирования\n\n📞 ${ORGANIZER_PHONE}`,
        { parse_mode: 'Markdown' }
    );
});

bot.onText(/❓ FAQ/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `❓ *Частые вопросы*\n\n1️⃣ *Нужен опыт?* Нет, практики для любого уровня.\n2️⃣ *Что взять?* Удобную одежду, купальник, тапки.\n3️⃣ *Телефоны?* Сдаются на входе — полное погружение.\n4️⃣ *Можно с подругой?* Да, можно в одной комнате.\n5️⃣ *Как оплатить?* Предоплата 200 BYN для бронирования. Остаток 400 BYN при заезде.\n6️⃣ *Трансфер?* Да, из Минска туда и обратно.\n\n📞 ${ORGANIZER_PHONE}`,
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
    bot.sendMessage(msg.chat.id, 
        `✨ Отлично!\n\n💰 Стоимость: 600 BYN\n💳 Предоплата: 200 BYN\n\n📞 Свяжись: @${ORGANIZER_TG} или ${ORGANIZER_PHONE}`,
        { parse_mode: 'Markdown' }
    );
});

// ===== HEALTH CHECK СЕРВЕР =====
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
});
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => console.log(`✅ Health check on port ${PORT}`));

console.log('✅ Бот запущен! Кнопка "Расскажи подробнее" теперь гарантированно работает.');