const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const TOKEN = '8376903942:AAHm2T5QaAFQbrhu_ivhf7-11-ZH9S-D_zQ';
const SITE_URL = 'https://retreat.idealab.by/';
const ORGANIZER_TG = 'egor_provedet';
const ORGANIZER_PHONE = '+375291936694';
const ADMIN_ID = 'egor_provedet';

const GIFT_FOLDER_LINK = 'https://drive.google.com/drive/folders/1m8db4gEiLLwD1caYvEsGybIs9cm_EzEg';

const bot = new TelegramBot(TOKEN, { polling: true });

// Хранилище состояний диалога
const userDialogs = {};

// Главное меню (после диалога)
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

// ===== КОМАНДА /start — СРАЗУ НАЧИНАЕТ ДИАЛОГ =====
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    // Начинаем диалог сразу
    userDialogs[chatId] = {
        step: 'name',
        data: {}
    };
    
    bot.sendMessage(chatId,
        `✨ Привет! ✨\n\n` +
        `Я бот ретрита «Инь·Янь. Баланс».\n\n` +
        `🌿 *Давай познакомимся!*\n\n` +
        `*Как тебя зовут?*`,
        { parse_mode: 'Markdown' }
    );
});

// ===== ОБРАБОТКА ДИАЛОГА =====
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const dialog = userDialogs[chatId];
    const text = msg.text;
    
    // Если нет активного диалога — выходим
    if (!dialog) return;
    
    // Если пользователь нажал кнопку меню — прерываем диалог
    const menuButtons = ['🎴 Пройти тест', '🎁 Получить подарок', '🌿 О ретрите', '❓ FAQ', '📞 Контакты', '🌐 Сайт'];
    if (menuButtons.includes(text)) {
        delete userDialogs[chatId];
        return;
    }
    
    // Диалог по шагам
    switch (dialog.step) {
        case 'name':
            dialog.data.name = text;
            dialog.step = 'experience';
            bot.sendMessage(chatId,
                `Приятно познакомиться, *${dialog.data.name}*! 🤝\n\n` +
                `*Был ли у тебя опыт участия в ретритах?*\n\n` +
                `Выбери вариант:`,
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
                `🌿 *Что бы ты хотела получить от ретрита?*\n\n` +
                `Напиши своими словами ✍️\n\n` +
                `Например: отдохнуть, разобраться в себе, найти единомышленниц...`,
                { parse_mode: 'Markdown' }
            );
            break;
            
        case 'want':
            dialog.data.want = text;
            dialog.step = 'fears';
            bot.sendMessage(chatId,
                `💭 *Есть ли что-то, что тебя останавливает или пугает?*\n\n` +
                `Поделись — это нормально 🙏\n\n` +
                `(Если ничего не пугает, напиши "нет")`,
                { parse_mode: 'Markdown' }
            );
            break;
            
        case 'fears':
            dialog.data.fears = text;
            dialog.step = 'expectations';
            bot.sendMessage(chatId,
                `🌟 *Как ты представляешь идеальный отдых для себя?*\n\n` +
                `Что для тебя важно? Тишина? Общение? Природа? Практики?`,
                { parse_mode: 'Markdown' }
            );
            break;
            
        case 'expectations':
            dialog.data.expectations = text;
            
            // Отправляем итог пользователю
            const summary = `
✨ *${dialog.data.name}, спасибо за откровенный разговор!* ✨

🌿 *Вот что я поняла о тебе:*
• Ты хочешь: *${dialog.data.want.slice(0, 100)}*
• ${dialog.data.fears !== 'нет' ? `Тебя немного волнует: ${dialog.data.fears.slice(0, 80)}` : 'Сомнений нет, это прекрасно!'}

🌸 *Ретрит «Инь·Янь. Баланс»* — это именно то, что тебе нужно:
• 3 дня полного погружения в себя
• Опытные ведущие
• Уютный коттедж в лесу
• Глубокие практики и тишина

🎁 *Вот твой подарок* — 2 практики на восстановление баланса:
👉 [Скачать подарок](${GIFT_FOLDER_LINK})

📞 *Что дальше?*
• Пройди тест, чтобы узнать свой баланс
• Посмотри программу ретрита
• Свяжись с организатором: @${ORGANIZER_TG}

👇 *Выбери действие в меню ниже:*
            `;
            
            bot.sendMessage(chatId, summary, {
                parse_mode: 'Markdown',
                ...mainMenu
            });
            
            // Уведомление админу
            const adminMessage = `
📋 *Новый диалог с участницей!*

👤 *Имя:* ${dialog.data.name}
🌱 *Опыт:* ${dialog.data.experience}
🎯 *Что хочет:* ${dialog.data.want}
😟 *Страхи:* ${dialog.data.fears}
💭 *Идеальный отдых:* ${dialog.data.expectations}
🕐 *Время:* ${new Date().toLocaleString()}
            `;
            
            bot.sendMessage(`@${ADMIN_ID}`, adminMessage, { parse_mode: 'Markdown' })
                .catch(() => console.log('Уведомление админу не отправлено'));
            
            // Завершаем диалог
            delete userDialogs[chatId];
            break;
    }
});

// ===== ОБРАБОТКА INLINE-КНОПОК ДЛЯ ОПЫТА =====
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const dialog = userDialogs[chatId];
    
    if (data && data.startsWith('exp_')) {
        const experienceMap = {
            'exp_never': '✨ Никогда, но хочу попробовать',
            'exp_few': '🌱 Был 1-2 раза',
            'exp_many': '🌸 Да, регулярно участвую'
        };
        
        if (dialog && dialog.step === 'experience') {
            dialog.data.experience = experienceMap[data];
            dialog.step = 'want';
            bot.sendMessage(chatId,
                `🌿 *Что бы ты хотела получить от ретрита?*\n\n` +
                `Напиши своими словами ✍️`,
                { parse_mode: 'Markdown' }
            );
            bot.answerCallbackQuery(query.id);
        }
    }
});

// ===== ОСТАЛЬНЫЕ КОМАНДЫ =====

// 🎴 Тест
bot.onText(/🎴 Пройти тест/, (msg) => {
    startTest(msg.chat.id);
});

// 🎁 Подарок
bot.onText(/🎁 Получить подарок/, (msg) => {
    const name = msg.from.first_name;
    bot.sendMessage(msg.chat.id,
        `🎁 *${name}, вот твой подарок!*\n\n` +
        `👉 [Скачать 2 практики](${GIFT_FOLDER_LINK})\n\n` +
        `🌙 Инь-практика — расслабление\n` +
        `☀️ Янь-практика — энергия\n\n` +
        `🌸 Сохрани ссылку!`,
        { parse_mode: 'Markdown' }
    );
});

// 🌿 О ретрите
bot.onText(/🌿 О ретрите/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `🌿 *Ретрит «Инь·Янь. Баланс»*\n\n` +
        `📅 *Даты:* 29–31 мая 2026\n` +
        `📍 *Место:* Могилёвская область\n` +
        `👭 *Формат:* до 12 человек\n` +
        `💰 *Стоимость:* 450 BYN (всё включено)\n\n` +
        `📞 По вопросам: ${ORGANIZER_PHONE}`,
        { parse_mode: 'Markdown' }
    );
});

// ❓ FAQ
bot.onText(/❓ FAQ/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `❓ *Частые вопросы*\n\n` +
        `*1. Нужен ли опыт йоги?*\nНет, практики для любого уровня.\n\n` +
        `*2. Что взять с собой?*\nУдобную одежду, купальник, тапки.\n\n` +
        `*3. Будет ли связь?*\nТелефоны сдаются — полное погружение.\n\n` +
        `*4. Можно с подругой?*\nДа, можно в одной комнате.\n\n` +
        `*5. Как оплатить?*\nПредоплата 100 BYN.\n\n` +
        `*6. Трансфер?*\nДа, из Минска туда и обратно.\n\n` +
        `📞 ${ORGANIZER_PHONE}`,
        { parse_mode: 'Markdown' }
    );
});

// 📞 Контакты
bot.onText(/📞 Контакты/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `📞 *Контакты*\n\n📱 @${ORGANIZER_TG}\n📞 ${ORGANIZER_PHONE}\n🌐 ${SITE_URL}`,
        { parse_mode: 'Markdown' }
    );
});

// 🌐 Сайт
bot.onText(/🌐 Сайт/, (msg) => {
    bot.sendMessage(msg.chat.id, `🌐 ${SITE_URL}`, {
        reply_markup: { inline_keyboard: [[{ text: 'Открыть сайт', url: SITE_URL }]] }
    });
});

// ===== ТЕСТ (упрощённый) =====
let testUsers = {};

function startTest(chatId) {
    testUsers[chatId] = { step: 0, answers: [] };
    askTestQuestion(chatId, 0);
}

function askTestQuestion(chatId, questionIndex) {
    const questions = [
        "Когда возникает проблема, ты обычно действуешь или наблюдаешь?",
        "Как восстанавливаешь силы — в движении или тишине?",
        "Какое состояние ближе — контроль или поток?"
    ];
    const options = [
        ["⚡ Действую", "🌙 Наблюдаю"],
        ["🏃‍♀️ Движение", "🛋️ Тишина"],
        ["📋 Контроль", "🌊 Поток"]
    ];
    
    bot.sendMessage(chatId,
        `🌓 *Вопрос ${questionIndex + 1}/3*\n${questions[questionIndex]}`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: options[questionIndex][0], callback_data: `test_yan` }],
                    [{ text: options[questionIndex][1], callback_data: `test_yin` }]
                ]
            }
        }
    );
}

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const user = testUsers[chatId];
    
    if (data === 'test_yan' || data === 'test_yin') {
        if (user && user.step < 3) {
            user.answers.push(data);
            user.step++;
            if (user.step < 3) {
                askTestQuestion(chatId, user.step);
            } else {
                const yinCount = user.answers.filter(a => a === 'test_yin').length;
                const result = yinCount >= 2 ? '🌙 Инь · Принятие' : '☀️ Янь · Действие';
                bot.sendMessage(chatId,
                    `✨ *Твой баланс:* ${result}\n\n` +
                    `🎁 Нажми "🎁 Получить подарок", чтобы забрать практики!`,
                    { parse_mode: 'Markdown', ...mainMenu }
                );
                delete testUsers[chatId];
            }
            bot.answerCallbackQuery(query.id);
        }
    }
});

// Хочу на ретрит
bot.onText(/Хочу на ретрит/i, (msg) => {
    bot.sendMessage(msg.chat.id,
        `✨ Отлично!\n\n📞 Свяжись с нами: @${ORGANIZER_TG} или ${ORGANIZER_PHONE}`,
        { parse_mode: 'Markdown' }
    );
});

// Health check сервер
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
});
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => console.log(`✅ Health check on port ${PORT}`));

console.log('✅ Бот запущен! Диалог начинается сразу при /start');