const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const TOKEN = '8376903942:AAHm2T5QaAFQbrhu_ivhf7-11-ZH9S-D_zQ';
const SITE_URL = 'https://retreat.idealab.by/';
const ORGANIZER_TG = 'egor_provedet';
const ORGANIZER_PHONE = '+375291936694';
const ADMIN_ID = 'egor_provedet';

const YIN_PRACTICE_LINK = 'https://drive.google.com/drive/folders/1m8db4gEiLLwD1caYvEsGybIs9cm_EzEg';
const YANG_PRACTICE_LINK = 'https://drive.google.com/drive/folders/1m8db4gEiLLwD1caYvEsGybIs9cm_EzEg';

const bot = new TelegramBot(TOKEN, { polling: true });

// Хранилище состояний диалога
const userSessions = {};

// Главное меню
const mainMenu = {
    reply_markup: {
        keyboard: [
            [{ text: '🎴 Пройти тест' }, { text: '🎁 Получить подарок' }],
            [{ text: '💬 Поговорить с ботом' }, { text: '🌿 О ретрите' }],
            [{ text: '❓ FAQ' }, { text: '📞 Контакты' }, { text: '🌐 Сайт' }]
        ],
        resize_keyboard: true
    }
};

// Команда /start
bot.onText(/\/start/, (msg) => {
    const name = msg.from.first_name;
    userSessions[msg.chat.id] = null; // Сбрасываем диалог
    bot.sendMessage(msg.chat.id,
        `✨ Привет, ${name}! ✨\n\n` +
        `Я бот ретрита «Инь·Янь. Баланс».\n\n` +
        `🌸 Что я могу для тебя сделать?\n\n` +
        `• 🎴 Пройти тест — узнать свой баланс\n` +
        `• 🎁 Получить подарок — 2 практики\n` +
        `• 💬 Поговорить со мной — я задам вопросы и помогу понять, что тебе нужно\n` +
        `• 🌿 Узнать о ретрите\n\n` +
        `👇 Выбери действие:`,
        mainMenu
    );
});

// ===== ДИАЛОГ =====
bot.onText(/💬 Поговорить с ботом/, (msg) => {
    const chatId = msg.chat.id;
    
    // Начинаем диалог
    userSessions[chatId] = {
        step: 'name',
        data: {}
    };
    
    bot.sendMessage(chatId,
        `🌿 *Давай познакомимся поближе!*\n\n` +
        `Я помогу тебе понять, подходит ли тебе ретрит.\n\n` +
        `*Как тебя зовут?*`,
        { parse_mode: 'Markdown' }
    );
});

// Обработка ответов в диалоге
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const session = userSessions[chatId];
    const text = msg.text;
    
    // Если нет активного диалога — игнорируем
    if (!session) return;
    
    // Если пользователь нажал кнопку меню — прерываем диалог
    const menuButtons = ['🎴 Пройти тест', '🎁 Получить подарок', '💬 Поговорить с ботом', '🌿 О ретрите', '❓ FAQ', '📞 Контакты', '🌐 Сайт'];
    if (menuButtons.includes(text)) {
        userSessions[chatId] = null;
        return;
    }
    
    // Диалог
    switch (session.step) {
        case 'name':
            session.data.name = text;
            session.step = 'experience';
            bot.sendMessage(chatId,
                `Приятно познакомиться, *${session.data.name}*! 🤝\n\n` +
                `*Был ли у тебя опыт участия в ретритах?*\n\n` +
                `Напиши в нескольких словах или выбери вариант:`,
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
            session.data.experience = text;
            session.step = 'want';
            bot.sendMessage(chatId,
                `🌿 *Что ты хочешь получить от ретрита?*\n\n` +
                `Например:\n` +
                `• Отдохнуть и восстановить силы\n` +
                `• Разобраться в себе\n` +
                `• Найти новых друзей\n` +
                `• Попрактиковать йогу\n` +
                `• Побыть в тишине\n\n` +
                `Напиши своими словами ✍️`,
                { parse_mode: 'Markdown' }
            );
            break;
            
        case 'want':
            session.data.want = text;
            session.step = 'fears';
            bot.sendMessage(chatId,
                `💭 *Есть ли что-то, что тебя останавливает или пугает?*\n\n` +
                `Страх не справиться? Не хватает времени? Переживания?\n\n` +
                `Поделись — это нормально 🙏`,
                { parse_mode: 'Markdown' }
            );
            break;
            
        case 'fears':
            session.data.fears = text;
            session.step = 'expectations';
            bot.sendMessage(chatId,
                `🌟 *Что для тебя идеальный отдых?*\n\n` +
                `Как ты представляешь себе идеальный ретрит?\n\n` +
                `Уютный домик в лесу? Тёплая компания? Глубокие практики? Тишина?`,
                { parse_mode: 'Markdown' }
            );
            break;
            
        case 'expectations':
            session.data.expectations = text;
            session.step = 'complete';
            
            // Отправляем итоговое сообщение и уведомление админу
            const result = `
📋 *Новая заявка на ретрит!*

👤 *Имя:* ${session.data.name}
🌱 *Опыт:* ${session.data.experience}
🎯 *Что хочет:* ${session.data.want}
😟 *Страхи/сомнения:* ${session.data.fears}
💭 *Идеальный отдых:* ${session.data.expectations}
🕐 *Время:* ${new Date().toLocaleString()}
            `;
            
            // Отправляем человеку персонализированный ответ
            bot.sendMessage(chatId,
                `✨ *Спасибо, ${session.data.name}, за откровенный разговор!* ✨\n\n` +
                `Я вижу, что ты ищешь: *${session.data.want.slice(0, 100)}*\n\n` +
                `🌿 *Ретрит «Инь·Янь. Баланс»* создан именно для таких запросов:\n` +
                `• 3 дня полного погружения\n` +
                `• Опытные ведущие\n` +
                `• Уютный коттедж в лесу\n` +
                `• Глубокие практики и тишина\n\n` +
                `📞 *Что делать дальше?*\n` +
                `1️⃣ Нажми "🌿 О ретрите" — узнай программу\n` +
                `2️⃣ Напиши *"Хочу на ретрит"* — я помогу записаться\n` +
                `3️⃣ Или свяжись с организатором: @${ORGANIZER_TG}\n\n` +
                `🎁 А пока — вот твой подарок:\n` +
                `[Инь-практика](${YIN_PRACTICE_LINK}) | [Янь-практика](${YANG_PRACTICE_LINK})\n\n` +
                `До встречи на ретрите! 🌸`,
                { parse_mode: 'Markdown', ...mainMenu }
            );
            
            // Уведомление админу
            bot.sendMessage(`@${ADMIN_ID}`, result, { parse_mode: 'Markdown' })
                .catch(() => console.log('Не удалось отправить уведомление админу'));
            
            // Завершаем диалог
            delete userSessions[chatId];
            break;
    }
});

// Обработка inline-кнопок для опыта
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    if (data.startsWith('exp_')) {
        const experienceMap = {
            'exp_never': '✨ Никогда, но хочу попробовать',
            'exp_few': '🌱 Был 1-2 раза',
            'exp_many': '🌸 Да, регулярно участвую'
        };
        const text = experienceMap[data];
        
        if (text && userSessions[chatId] && userSessions[chatId].step === 'experience') {
            userSessions[chatId].data.experience = text;
            userSessions[chatId].step = 'want';
            bot.sendMessage(chatId,
                `🌿 *Что ты хочешь получить от ретрита?*\n\n` +
                `Напиши своими словами ✍️`,
                { parse_mode: 'Markdown' }
            );
            bot.answerCallbackQuery(query.id);
        }
    }
});

// ===== ОСТАЛЬНЫЕ ФУНКЦИИ =====

// 🎁 Подарок
bot.onText(/🎁 Получить подарок/, (msg) => {
    const userName = msg.from.first_name;
    bot.sendMessage(msg.chat.id,
        `🎁 *${userName}, вот ваш подарок!*\n\n` +
        `🌙 [Инь-практика](${YIN_PRACTICE_LINK})\n` +
        `☀️ [Янь-практика](${YANG_PRACTICE_LINK})\n\n` +
        `🌸 Сохрани ссылки — они твои!`,
        { parse_mode: 'Markdown' }
    );
});

// 🌿 О ретрите
bot.onText(/🌿 О ретрите/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `🌿 *Ретрит «Инь·Янь. Баланс»*\n\n` +
        `📅 29–31 мая 2026\n📍 Могилёвская область\n💰 450 BYN\n\n` +
        `📞 ${ORGANIZER_PHONE}`,
        { parse_mode: 'Markdown' }
    );
});

// ❓ FAQ
bot.onText(/❓ FAQ/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `❓ *Частые вопросы*\n\n` +
        `1️⃣ *Нужен опыт?* Нет, практики для любого уровня.\n` +
        `2️⃣ *Что взять?* Удобную одежду, купальник.\n` +
        `3️⃣ *Телефоны?* Сдаются на входе — полное погружение.\n` +
        `4️⃣ *Оплата?* Предоплата 100 BYN.\n\n` +
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

// 🎴 Тест (упрощённая версия)
let testUsers = {};

bot.onText(/🎴 Пройти тест/, (msg) => {
    const chatId = msg.chat.id;
    testUsers[chatId] = { step: 0, answers: [] };
    askTestQuestion(chatId, 0);
});

function askTestQuestion(chatId, questionIndex) {
    const questions = [
        "Когда возникает проблема, ты обычно действуешь или наблюдаешь?",
        "Как восстанавливаешь силы — в движении или тишине?",
        "Какое состояние ближе — контроль или поток?"
    ];
    const options = [
        ["⚡ Действую", "🌙 Наблюдаю"],
        ["🏃‍♀️ В движении", "🛋️ В тишине"],
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
                    `✨ *Результат:* ${result}\n\n🎁 Нажми "🎁 Получить подарок"!`,
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
        `✨ Отлично!\n\n📞 Свяжись с нами: @${ORGANIZER_TG} или ${ORGANIZER_PHONE}\n🌐 Или заполни форму на сайте: ${SITE_URL}`,
        { parse_mode: 'Markdown' }
    );
});

// Health check
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
});
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => console.log(`✅ Health check on port ${PORT}`));

console.log('✅ Бот запущен! Диалоговый режим активен.');