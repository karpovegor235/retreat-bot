const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// ===== НАСТРОЙКИ (ИЗМЕНЯЙТЕ ЗДЕСЬ) =====
const TOKEN = '8376903942:AAHm2T5QaAFQbrhu_ivhf7-11-ZH9S-D_zQ';
const SITE_URL = 'https://retreat.idealab.by/';
const ORGANIZER_TG = 'egor_provedet';
const ORGANIZER_PHONE = '+375291936694';
const ADMIN_ID = 'egor_provedet'; // Telegram username для уведомлений

// ССЫЛКИ НА ПОДАРКИ (замените на ваши)
const YIN_PRACTICE_LINK = 'https://drive.google.com/drive/folders/1m8db4gEiLLwD1caYvEsGybIs9cm_EzEg';
const YANG_PRACTICE_LINK = 'https://drive.google.com/drive/folders/1m8db4gEiLLwD1caYvEsGybIs9cm_EzEg';
// =====================================

const bot = new TelegramBot(TOKEN, { polling: true });

// Главное меню (кнопки)
const mainMenu = {
    reply_markup: {
        keyboard: [
            [{ text: '🎴 Пройти тест' }, { text: '🎁 Получить подарок' }],
            [{ text: '🌿 О ретрите' }, { text: '❓ FAQ' }, { text: '📞 Контакты' }],
            [{ text: '🌐 Перейти на сайт' }]
        ],
        resize_keyboard: true
    }
};

// ===== ОБРАБОТЧИКИ КОМАНД =====

// Команда /start
bot.onText(/\/start/, (msg) => {
    const name = msg.from.first_name;
    bot.sendMessage(msg.chat.id,
        `✨ Привет, ${name}! ✨\n\n` +
        `Я бот женского ретрита «Инь·Янь. Баланс».\n\n` +
        `🌸 Что я могу для тебя сделать:\n` +
        `• 🎴 Пройти тест «Свой цвет» — узнай свою энергию\n` +
        `• 🎁 Получить подарок — 2 практики на восстановление\n` +
        `• 🌿 Узнать о ретрите 29-31 мая\n` +
        `• 🌐 Перейти на сайт с программой\n\n` +
        `👇 Выбери действие в меню:`,
        mainMenu
    );
});

// О ретрите
bot.onText(/🌿 О ретрите/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `🌿 *Женский ретрит «Инь·Янь. Баланс»*\n\n` +
        `📅 *Даты:* 29–31 мая 2026\n` +
        `📍 *Место:* Могилёвская область, загородный коттедж\n` +
        `👭 *Формат:* камерная группа до 12 человек\n\n` +
        `*Программа:*\n` +
        `• 🧘‍♀️ Инь и Янь йога\n` +
        `• 💃 Сакральный танец\n` +
        `• 🌳 Работа с родовыми сценариями\n` +
        `• 🧘 Гвоздестояние\n` +
        `• 🔥 Банные ритуалы\n` +
        `• ☯️ Мандала выбора цвета\n\n` +
        `💰 *Стоимость:* 450 BYN (всё включено)\n\n` +
        `📞 По вопросам: ${ORGANIZER_PHONE}\n` +
        `✍️ *Запись:* напишите "Хочу на ретрит" или нажмите 📞 Контакты`,
        { parse_mode: 'Markdown' }
    );
});

// FAQ
bot.onText(/❓ FAQ/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `❓ *Частые вопросы*\n\n` +
        `*1. Нужен ли опыт йоги?*\nНет, практики адаптированы для любого уровня.\n\n` +
        `*2. Что взять с собой?*\nУдобную одежду, купальник, тапки, личные средства гигиены.\n\n` +
        `*3. Будет ли связь с миром?*\nТелефоны сдаются на входе — полное погружение в тишину.\n\n` +
        `*4. Можно с подругой?*\nДа, можно поселиться в одной комнате.\n\n` +
        `*5. Как оплатить?*\nПредоплата 200 BYN для бронирования места.\n\n` +
        `*6. Есть ли трансфер?*\nДа, организованный трансфер из Минска туда и обратно.\n\n` +
        `📞 Остались вопросы? Звоните: ${ORGANIZER_PHONE}`,
        { parse_mode: 'Markdown' }
    );
});

// Контакты
bot.onText(/📞 Контакты/, (msg) => {
    const contactKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📱 Написать организатору', url: `https://t.me/${ORGANIZER_TG}` }],
                [{ text: '📞 Позвонить', callback_data: 'show_phone' }],
                [{ text: '🌐 Перейти на сайт', url: SITE_URL }]
            ]
        }
    };
    bot.sendMessage(msg.chat.id,
        `📞 *Свяжитесь с нами:*\n\n` +
        `📱 Telegram: @${ORGANIZER_TG}\n` +
        `📞 Телефон: ${ORGANIZER_PHONE}\n` +
        `📧 Email: retreat@idealab.by\n\n` +
        `Или нажмите на кнопку ниже 👇`,
        { parse_mode: 'Markdown', ...contactKeyboard }
    );
});

// Показать телефон
bot.on('callback_query', (query) => {
    if (query.data === 'show_phone') {
        bot.sendMessage(query.message.chat.id,
            `📞 *Наши контакты:*\n\n` +
            `Телефон: ${ORGANIZER_PHONE}\n` +
            `Telegram: @${ORGANIZER_TG}\n\n` +
            `Можно позвонить или написать в WhatsApp/Telegram 📱`,
            { parse_mode: 'Markdown' }
        );
        bot.answerCallbackQuery(query.id);
    }
});

// Переход на сайт
bot.onText(/🌐 Перейти на сайт/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `🌐 *Сайт ретрита*\n\n` +
        `Подробная программа, фото пространства, отзывы участниц и форма записи:\n\n` +
        `${SITE_URL}\n\n` +
        `Или нажмите на кнопку ниже 👇`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🌐 Открыть сайт', url: SITE_URL }]
                ]
            }
        }
    );
});

// Подарок (сбор контакта)
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
        `🎁 *Подарок: 2 практики на восстановление баланса*\n\n` +
        `🌙 *Инь-практика* — расслабление, мягкость, принятие\n` +
        `☀️ *Янь-практика* — энергия, сила, действие\n\n` +
        `Чтобы получить подарок, нажмите кнопку ниже и отправьте ваш контакт 👇\n\n` +
        `📞 Или свяжитесь с нами: ${ORGANIZER_PHONE}\n\n` +
        `*Никакого спама, только забота и практики!*`,
        { parse_mode: 'Markdown', ...contactKeyboard }
    );
});

// Обработка контакта (когда пользователь отправляет номер)
bot.on('contact', (msg) => {
    const contact = msg.contact;
    const name = contact.first_name;
    const phone = contact.phone_number;
    const username = msg.from.username || 'нет username';
    
    const giftText = `
🎁 *Вот ваш подарок!*

🌙 *Инь-практика (расслабление)*
👉 [Скачать практику](${YIN_PRACTICE_LINK})

☀️ *Янь-практика (энергия)*
👉 [Скачать практику](${YANG_PRACTICE_LINK})

🌸 Сохраните ссылки — они навсегда ваши!

*А если хотите глубже — приходите на ретрит 29-31 мая.*

🌿 Напишите "Хочу на ретрит" или нажмите на кнопку ниже 👇
    `;
    
    bot.sendMessage(msg.chat.id, giftText, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🌿 Узнать о ретрите', callback_data: 'about_retreat' }],
                [{ text: '🌐 Перейти на сайт', url: SITE_URL }]
            ]
        }
    });
    
    // Отправка уведомления админу
    bot.sendMessage(`@${ADMIN_ID}`, 
        `📋 *Новый контакт для подарка!*\n\n` +
        `👤 Имя: ${name}\n` +
        `📞 Телефон: ${phone}\n` +
        `🆔 Username: @${username}\n` +
        `🕐 Время: ${new Date().toLocaleString()}\n\n` +
        `🌐 Сайт: ${SITE_URL}\n` +
        `📱 Связаться: ${ORGANIZER_PHONE}`,
        { parse_mode: 'Markdown' }
    ).catch(err => console.log('Не удалось отправить уведомление админу:', err.message));
});

// Обработка callback для кнопки "Узнать о ретрите"
bot.on('callback_query', (query) => {
    if (query.data === 'about_retreat') {
        bot.sendMessage(query.message.chat.id,
            `🌿 *Женский ретрит «Инь·Янь. Баланс»*\n\n` +
            `📅 *Даты:* 29–31 мая 2026\n` +
            `📍 *Место:* Могилёвская область\n\n` +
            `💰 *Стоимость:* 600 BYN (всё включено)\n\n` +
            `📞 По вопросам: ${ORGANIZER_PHONE}\n` +
            `✍️ *Запись:* напишите "Хочу на ретрит" или перейдите на сайт:\n` +
            `${SITE_URL}`,
            { parse_mode: 'Markdown' }
        );
        bot.answerCallbackQuery(query.id);
    }
});

// ===== ТЕСТ (4 вопроса) =====
let testUsers = {};

bot.onText(/🎴 Пройти тест/, (msg) => {
    const chatId = msg.chat.id;
    testUsers[chatId] = { step: 0, answers: [] };
    bot.sendMessage(chatId,
        `🌓 *Тест «Свой цвет»*\n\n` +
        `Узнай, какая энергия ведёт тебя сейчас: Инь (принятие) или Янь (действие).\n\n` +
        `*Вопрос 1/4*\n\nКогда возникает неожиданная проблема, ты обычно:`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "⚡ Сразу действую", callback_data: 'test_yan' }],
                    [{ text: "🌙 Останавливаюсь и дышу", callback_data: 'test_yin' }]
                ]
            }
        }
    );
});

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const user = testUsers[chatId];

    if (data && (data === 'test_yan' || data === 'test_yin')) {
        if (!user) {
            bot.answerCallbackQuery(query.id, { text: 'Начните тест заново: /start' });
            return;
        }
        
        user.answers.push(data === 'test_yan' ? 'yan' : 'yin');
        user.step++;

        const questions = [
            "Как ты чаще всего восстанавливаешь силы?",
            "Твоё привычное состояние в конце дня:",
            "Что ближе твоему внутреннему состоянию сейчас?"
        ];
        const opts = [
            ["🏃‍♀️ В движении, спорте", "🛋️ В тишине, покое"],
            ["💪 Есть силы что-то сделать", "😴 Хочется просто лечь"],
            ["📋 «Я всё контролирую»", "🌊 «Позволяю жизни течь»"]
        ];

        if (user.step < 4) {
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
            
            if (yin > yan) {
                result = {
                    symbol: '🌙',
                    title: 'Инь · Принятие и поток',
                    desc: 'В тебе больше мягкости, глубины и принятия. Ретрит поможет добавить немного действия и силы.',
                    suggestion: 'Попробуйте Янь-практику из подарка, чтобы активировать энергию!'
                };
            } else if (yan > yin) {
                result = {
                    symbol: '☀️',
                    title: 'Янь · Сила и действие',
                    desc: 'В тебе много активности и контроля. Ретрит поможет замедлиться и вернуть женскую мягкость.',
                    suggestion: 'Попробуйте Инь-практику из подарка, чтобы расслабиться!'
                };
            } else {
                result = {
                    symbol: '☯️',
                    title: 'Инь-Янь · Гармония',
                    desc: 'У тебя прекрасный баланс! Ретрит станет местом для восстановления и углубления.',
                    suggestion: 'Обе практики из подарка помогут поддержать твой баланс.'
                };
            }

            bot.sendMessage(chatId,
                `✨ *Результат теста* ✨\n\n` +
                `${result.symbol} *${result.title}*\n\n` +
                `${result.desc}\n\n` +
                `💡 ${result.suggestion}\n\n` +
                `🎁 Хотите получить подарок — 2 практики на восстановление?\n` +
                `Нажмите "🎁 Получить подарок" в меню.\n\n` +
                `📞 Или свяжитесь с нами: ${ORGANIZER_PHONE}\n` +
                `🌐 Или перейдите на сайт: ${SITE_URL}`,
                { parse_mode: 'Markdown' }
            );
            delete testUsers[chatId];
        }
    }
    bot.answerCallbackQuery(query.id);
});

// ===== ДОПОЛНИТЕЛЬНЫЕ КОМАНДЫ =====

// Назад в меню
bot.onText(/◀️ Назад в меню/, (msg) => {
    bot.sendMessage(msg.chat.id, `Главное меню:`, mainMenu);
});

// Обработка текста "Хочу на ретрит"
bot.onText(/Хочу на ретрит/i, (msg) => {
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
        `✨ Отлично! ✨\n\n` +
        `Для записи на ретрит отправьте, пожалуйста, ваш контакт.\n` +
        `Мы свяжемся с вами в ближайшее время для подтверждения бронирования.\n\n` +
        `🌟 *Осталось всего 12 мест!*\n\n` +
        `📞 Или свяжитесь с нами: ${ORGANIZER_PHONE}\n` +
        `🌐 Или заполните заявку на сайте: ${SITE_URL}`,
        { parse_mode: 'Markdown', ...contactKeyboard }
    );
});

// Команда /help
bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `❓ *Помощь*\n\n` +
        `Доступные команды:\n` +
        `/start — начать работу\n` +
        `/test — пройти тест\n` +
        `/site — перейти на сайт\n\n` +
        `📞 По всем вопросам: ${ORGANIZER_PHONE}\n` +
        `📱 Telegram: @${ORGANIZER_TG}\n\n` +
        `Или используйте кнопки в меню 👇`,
        { parse_mode: 'Markdown' }
    );
});

// Команда /test
bot.onText(/\/test/, (msg) => {
    const chatId = msg.chat.id;
    testUsers[chatId] = { step: 0, answers: [] };
    bot.sendMessage(chatId,
        `🌓 *Тест «Свой цвет»*\n\n` +
        `Узнай, какая энергия ведёт тебя сейчас: Инь (принятие) или Янь (действие).\n\n` +
        `*Вопрос 1/4*\n\nКогда возникает неожиданная проблема, ты обычно:`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "⚡ Сразу действую", callback_data: 'test_yan' }],
                    [{ text: "🌙 Останавливаюсь и дышу", callback_data: 'test_yin' }]
                ]
            }
        }
    );
});

// Команда /site
bot.onText(/\/site/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `🌐 Сайт ретрита: ${SITE_URL}`,
        { reply_markup: { inline_keyboard: [[{ text: 'Открыть сайт', url: SITE_URL }]] } }
    );
});

// ===== HEALTH CHECK СЕРВЕР ДЛЯ RENDER/RAILWAY =====
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Health check server running on port ${PORT}`);
});

// ===== ЗАПУСК =====
console.log('✅ Бот запущен и готов к работе!');
console.log(`🌐 Сайт: ${SITE_URL}`);
console.log(`📱 Организатор: @${ORGANIZER_TG}`);
console.log(`📞 Телефон: ${ORGANIZER_PHONE}`);