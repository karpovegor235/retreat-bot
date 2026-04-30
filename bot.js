const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8376903942:AAHm2T5QaAFQbrhu_ivhf7-11-ZH9S-D_zQ';
const bot = new TelegramBot(TOKEN, { polling: true });

// Главное меню (кнопки)
const mainMenu = {
    reply_markup: {
        keyboard: [
            [{ text: '🎴 Пройти тест' }, { text: '🎁 Получить подарок' }],
            [{ text: '🌿 О ретрите' }, { text: '❓ FAQ' }, { text: '📞 Контакты' }]
        ],
        resize_keyboard: true
    }
};

bot.onText(/\/start/, (msg) => {
    const name = msg.from.first_name;
    bot.sendMessage(msg.chat.id,
        `✨ Привет, ${name}! ✨\n\n` +
        `Я бот женского ретрита «Инь·Янь. Баланс».\n\n` +
        `🌸 Что я могу для тебя сделать:\n` +
        `• 🎴 Пройти тест «Свой цвет»\n` +
        `• 🎁 Получить подарок (2 практики)\n` +
        `• 🌿 Узнать о ретрите 29-31 мая\n\n` +
        `👇 Выбери действие в меню:`,
        mainMenu
    );
});

bot.onText(/🌿 О ретрите/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `🌿 *Женский ретрит «Инь·Янь. Баланс»*\n\n` +
        `📅 *Даты:* 29–31 мая 2026\n` +
        `📍 *Место:* Могилёвская область\n\n` +
        `💰 *Стоимость:* 450 BYN (всё включено)`,
        { parse_mode: 'Markdown' }
    );
});

bot.onText(/❓ FAQ/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `❓ *Частые вопросы*\n\n` +
        `*1. Нужен ли опыт йоги?*\nНет, практики для любого уровня.\n\n` +
        `*2. Что взять с собой?*\nУдобную одежду, купальник.`,
        { parse_mode: 'Markdown' }
    );
});

bot.onText(/📞 Контакты/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `📞 *Контакты*\n\n` +
        `📱 Telegram: @egorkarpov_provodnik`,
        { parse_mode: 'Markdown' }
    );
});

bot.onText(/🎁 Получить подарок/, (msg) => {
    const contactKeyboard = {
        reply_markup: {
            keyboard: [
                [{ text: "📱 Отправить контакт", request_contact: true }],
                [{ text: "◀️ Назад в меню" }]
            ],
            resize_keyboard: true
        }
    };
    bot.sendMessage(msg.chat.id,
        `🎁 *Подарок: 2 практики*\n\n` +
        `Нажмите кнопку ниже, чтобы получить подарок 👇`,
        { parse_mode: 'Markdown', ...contactKeyboard }
    );
});

bot.on('contact', (msg) => {
    const contact = msg.contact;
    const name = contact.first_name;
    
    bot.sendMessage(msg.chat.id,
        `✨ Спасибо, ${name}! ✨\n\n` +
        `🎁 *Вот ваш подарок:*\n\n` +
        `🌙 Инь-практика: https://example.com/yin\n` +
        `☀️ Янь-практика: https://example.com/yang`,
        { parse_mode: 'Markdown' }
    );
});

let testUsers = {};

bot.onText(/🎴 Пройти тест/, (msg) => {
    const chatId = msg.chat.id;
    testUsers[chatId] = { step: 0, answers: [] };
    bot.sendMessage(chatId,
        `🌓 *Вопрос 1/4*\n\nКогда возникает проблема, ты:`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Действую сразу", callback_data: 'test_yan' }],
                    [{ text: "Останавливаюсь и дышу", callback_data: 'test_yin' }]
                ]
            }
        }
    );
});

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const user = testUsers[chatId];

    if (data === 'test_yan' || data === 'test_yin') {
        user.answers.push(data === 'test_yan' ? 'yan' : 'yin');
        user.step++;

        if (user.step < 4) {
            const questions = [
                "Как ты восстанавливаешь силы?",
                "Твоё состояние в конце дня:",
                "Что ближе тебе сейчас?"
            ];
            const opts = [
                ["В движении", "В тишине"],
                ["Есть силы", "Хочется лечь"],
                ["Контроль", "Поток"]
            ];
            const idx = user.step - 1;
            bot.sendMessage(chatId,
                `🌓 *Вопрос ${user.step + 1}/4*\n\n${questions[idx]}`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: opts[idx][0], callback_data: 'test_yan' }],
                            [{ text: opts[idx][1], callback_data: 'test_yin' }]
                        ]
                    }
                }
            );
        } else {
            const yin = user.answers.filter(a => a === 'yin').length;
            const yan = user.answers.filter(a => a === 'yan').length;
            let result;
            if (yin > yan) result = '🌙 Инь · Принятие и поток';
            else if (yan > yin) result = '☀️ Янь · Сила и действие';
            else result = '☯️ Инь-Янь · Гармония';

            bot.sendMessage(chatId,
                `✨ *Результат теста* ✨\n\n${result}`,
                { parse_mode: 'Markdown' }
            );
            delete testUsers[chatId];
        }
    }
    bot.answerCallbackQuery(query.id);
});

bot.onText(/◀️ Назад в меню/, (msg) => {
    bot.sendMessage(msg.chat.id, `Главное меню:`, mainMenu);
});

console.log('✅ Бот запущен');