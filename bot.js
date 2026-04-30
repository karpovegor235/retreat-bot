const TelegramBot = require('node-telegram-bot-api');
const http = require('http');
const fs = require('fs');

// ===== НАСТРОЙКИ =====
const TOKEN = '8703700250:AAFm2vdQiQbwAOyq3gC9piwyO75hv_fAjgI';
const SITE_URL = 'https://retreat.idealab.by/';
const ORGANIZER_TG = 'egor_provedet';
const ORGANIZER_PHONE = '+375291936694';
const ADMIN_ID = 'egor_provedet';
const GIFT_FOLDER_LINK = 'https://drive.google.com/file/d/1nMu9dMwHbS5ml1smwHRwmUQR-Lk0605J/view?usp=sharing';

const bot = new TelegramBot(TOKEN, { polling: true });

// Хранилище диалогов
const userDialogs = {};
let testUsers = {};

// ===== ФУНКЦИИ РАБОТЫ С ДАННЫМИ =====

function loadUsers() {
    try {
        const data = fs.readFileSync('users.json', 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

function saveUsers(users) {
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
}

function saveUserData(chatId, userData) {
    const users = loadUsers();
    users[chatId] = {
        ...users[chatId],
        ...userData,
        lastUpdated: new Date().toISOString()
    };
    saveUsers(users);
}

function getUserData(chatId) {
    const users = loadUsers();
    return users[chatId] || null;
}

function exportToCSV() {
    const users = loadUsers();
    const headers = ['ID', 'Username', 'Имя', 'Телефон', 'Опыт', 'Чего хочет', 'Страхи', 'Ожидания', 'Результат теста', 'Дата заполнения', 'Статус'];
    const rows = [headers];
    
    for (const [id, data] of Object.entries(users)) {
        rows.push([
            id,
            data.username || '-',
            data.name || '-',
            data.phone || '-',
            data.experience || '-',
            (data.want || '-').replace(/,/g, ';'),
            (data.fears || '-').replace(/,/g, ';'),
            (data.expectations || '-').replace(/,/g, ';'),
            data.testResult || '-',
            data.dialogCompletedAt || '-',
            data.status || 'new'
        ]);
    }
    
    const csvContent = rows.map(row => row.join(',')).join('\n');
    fs.writeFileSync('users_export.csv', csvContent, 'utf8');
    return 'users_export.csv';
}

function getStats() {
    const users = loadUsers();
    const total = Object.keys(users).length;
    let completed = 0;
    let testPassed = 0;
    let wantsRetreat = 0;
    let yin = 0;
    let yang = 0;
    let havePhone = 0;
    
    for (const user of Object.values(users)) {
        if (user.dialogCompletedAt) completed++;
        if (user.testResult) {
            testPassed++;
            if (user.testResult.includes('Инь')) yin++;
            else if (user.testResult.includes('Янь')) yang++;
        }
        if (user.want && user.want.toLowerCase().includes('ретрит')) wantsRetreat++;
        if (user.phone && user.phone !== '-') havePhone++;
    }
    
    return { total, completed, testPassed, wantsRetreat, yin, yang, havePhone };
}

// Главное меню
const mainMenu = {
    reply_markup: {
        keyboard: [
            [{ text: '🎴 Пройти тест' }, { text: '🎁 Получить подарок' }],
            [{ text: '🌿 О ретрите' }, { text: '❓ FAQ' }, { text: '📞 Контакты' }],
            [{ text: '🌐 Сайт' }, { text: '📊 Статистика' }]
        ],
        resize_keyboard: true
    }
};

// ===== ФУНКЦИЯ ПОДРОБНО О РЕТРИТЕ =====
function sendDetailedRetreat(chatId) {
    bot.sendMessage(chatId,
        `🌿 ПОДРОБНЕЕ О РЕТРИТЕ «Инь·Янь. Баланс»

📍 Место: Загородный коттедж в Могилёвской области
📅 Даты: 29–31 мая 2026
👭 Формат: до 12 человек

💰 Стоимость: 600 BYN (всё включено)
💳 Предоплата: 200 BYN

ПРОГРАММА:
• Инь и Янь йога
• Сакральный танец
• Гвоздестояние
• Банные ритуалы
• Мандала выбора цвета
• Работа с родом

👇 Программа по дням:`,
        {
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

// ===== КОМАНДА /start =====
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username || 'не указан';
    const firstName = msg.from.first_name || '';
    
    saveUserData(chatId, {
        userId: chatId,
        username: username,
        firstName: firstName,
        status: 'in_dialog',
        chatStarted: new Date().toISOString()
    });
    
    userDialogs[chatId] = { step: 'name', data: {} };
    
    bot.sendMessage(chatId,
        `✨ ПРИВЕТ, ${firstName}! ✨

Я бот ретрита «Инь·Янь. Баланс».

🌿 Давай познакомимся!

Как тебя зовут?`
    );
});

// ===== ДИАЛОГ =====
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const dialog = userDialogs[chatId];
    const text = msg.text;
    
    // Админ-команды
    if (text === '📊 Статистика' && msg.from.username === ORGANIZER_TG) {
        const stats = getStats();
        bot.sendMessage(chatId, 
            `📊 СТАТИСТИКА БОТА

👥 Всего пользователей: ${stats.total}
✅ Заполнили анкету: ${stats.completed}
📞 Оставили телефон: ${stats.havePhone}
🎯 Прошли тест: ${stats.testPassed}
🌙 Инь (Принятие): ${stats.yin}
☀️ Янь (Действие): ${stats.yang}
💚 Хотят на ретрит: ${stats.wantsRetreat}

📅 Актуально на: ${new Date().toLocaleString()}`
        );
        return;
    }
    
    if (text === '📥 Экспорт CSV' && msg.from.username === ORGANIZER_TG) {
        const filePath = exportToCSV();
        bot.sendDocument(chatId, filePath, {
            caption: '📊 Экспорт данных пользователей (включая телефоны)'
        });
        return;
    }
    
    if (text === '👥 Список пользователей' && msg.from.username === ORGANIZER_TG) {
        const users = loadUsers();
        let message = '👥 СПИСОК ПОЛЬЗОВАТЕЛЕЙ:\n\n';
        let count = 0;
        
        for (const [id, data] of Object.entries(users)) {
            count++;
            message += `${count}. ${data.name || 'Без имени'} (@${data.username || 'нет'}) - ${data.phone || 'телефон не указан'}\n`;
            if (count >= 20) {
                message += `\n... и еще ${Object.keys(users).length - 20} пользователей`;
                break;
            }
        }
        
        if (count === 0) message = 'Пока нет пользователей';
        
        bot.sendMessage(chatId, message);
        return;
    }
    
    if (text === '🔙 Назад' && msg.from.username === ORGANIZER_TG) {
        bot.sendMessage(chatId, `Главное меню:`, mainMenu);
        return;
    }
    
    if (!dialog) return;
    
    const menuButtons = ['🎴 Пройти тест', '🎁 Получить подарок', '🌿 О ретрите', '❓ FAQ', '📞 Контакты', '🌐 Сайт', '📊 Статистика', '📥 Экспорт CSV', '👥 Список пользователей', '🔙 Назад'];
    if (menuButtons.includes(text)) {
        delete userDialogs[chatId];
        return;
    }
    
    switch (dialog.step) {
        case 'name':
            dialog.data.name = text;
            dialog.step = 'phone';
            bot.sendMessage(chatId,
                `Приятно познакомиться, ${dialog.data.name}! 🤝

📞 *Оставьте ваш номер телефона* для связи и получения подарка.

Нажмите на кнопку ниже, чтобы поделиться номером телефона:`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        keyboard: [
                            [{ text: '📱 Отправить номер телефона', request_contact: true }]
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                }
            );
            break;
            
        case 'phone':
            // Обработка номера телефона
            if (msg.contact) {
                dialog.data.phone = msg.contact.phone_number;
            } else if (text && text.match(/^[\+\d\s\-\(\)]{10,20}$/)) {
                dialog.data.phone = text;
            } else {
                bot.sendMessage(chatId, `Пожалуйста, отправьте ваш номер телефона, нажав на кнопку "📱 Отправить номер телефона" или введите номер в формате +375XXXXXXXXX`);
                return;
            }
            
            // Сохраняем телефон
            saveUserData(chatId, { phone: dialog.data.phone });
            
            dialog.step = 'experience';
            bot.sendMessage(chatId,
                `Спасибо! Ваш номер сохранен ✅

Теперь вопрос о ретрите:

Был ли у тебя опыт участия в ретритах?`,
                {
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
                `🌿 Что бы ты хотела получить от ретрита?

Напиши своими словами ✍️`,
                { reply_markup: { remove_keyboard: true } }
            );
            break;
            
        case 'want':
            dialog.data.want = text;
            dialog.step = 'fears';
            bot.sendMessage(chatId,
                `💭 Есть ли что-то, что тебя останавливает или пугает?

Если ничего не пугает, напиши "нет" 🙏`
            );
            break;
            
        case 'fears':
            dialog.data.fears = text;
            dialog.step = 'expectations';
            bot.sendMessage(chatId,
                `🌟 Как ты представляешь идеальный отдых для себя?

Что для тебя важно? Тишина? Общение? Природа? Практики?`
            );
            break;
            
        case 'expectations':
            dialog.data.expectations = text;
            
            // Сохраняем все данные пользователя
            saveUserData(chatId, {
                name: dialog.data.name,
                phone: dialog.data.phone,
                experience: dialog.data.experience,
                want: dialog.data.want,
                fears: dialog.data.fears,
                expectations: dialog.data.expectations,
                status: 'dialog_completed',
                dialogCompletedAt: new Date().toISOString()
            });
            
            const summary = `
✨ ${dialog.data.name}, спасибо за откровенный разговор! ✨

🌿 Вот что я поняла о тебе:
• Ты хочешь: ${dialog.data.want.slice(0, 100)}
• ${dialog.data.fears !== 'нет' ? `Тебя немного волнует: ${dialog.data.fears.slice(0, 80)}` : 'Сомнений нет, это прекрасно!'}

🎁 Вот твой подарок — 2 практики на восстановление баланса:
👉 ${GIFT_FOLDER_LINK}

🌿 Хочешь узнать подробнее о ретрите?
Нажми на кнопку ниже 👇
            `;
            
            bot.sendMessage(chatId, summary, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🌿 Расскажи подробнее о ретрите', callback_data: 'detailed_retreat' }],
                        [{ text: '📞 Связаться с организатором', url: `https://t.me/${ORGANIZER_TG}` }]
                    ]
                }
            });
            
            // Уведомление админу с ПОЛНЫМИ данными (включая телефон)
            const adminMessage = `
📋 НОВАЯ АНКЕТА! 📋

👤 Имя: ${dialog.data.name}
📞 Телефон: ${dialog.data.phone}
📱 Username: @${msg.from.username || 'не указан'}
🆔 ID: ${chatId}

🌿 Опыт: ${dialog.data.experience}
🎯 Хочет: ${dialog.data.want}
💭 Страхи: ${dialog.data.fears}
🌟 Ожидания: ${dialog.data.expectations}

🕐 Время: ${new Date().toLocaleString()}

📊 Всего анкет: ${getStats().completed + 1}
            `;
            
            bot.sendMessage(`@${ADMIN_ID}`, adminMessage).catch(() => {});
            
            // Возвращаем обычную клавиатуру
            bot.sendMessage(chatId, `Главное меню:`, mainMenu);
            
            delete userDialogs[chatId];
            break;
    }
});

// ===== ТЕСТ (остается без изменений) =====
function startTest(chatId) {
    testUsers[chatId] = { step: 0, answers: [] };
    askTestQuestion(chatId, 0);
}

function askTestQuestion(chatId, idx) {
    const questions = [
        "Когда проблема — действуешь или наблюдаешь?",
        "Восстанавливаешь силы в движении или тишине?",
        "Что ближе — контроль или поток?"
    ];
    const opts = [
        ["⚡ Действую", "🌙 Наблюдаю"],
        ["🏃‍♀️ Движение", "🛋️ Тишина"],
        ["📋 Контроль", "🌊 Поток"]
    ];
    
    bot.sendMessage(chatId, `🌓 Вопрос ${idx+1}/3\n\n${questions[idx]}`, {
        reply_markup: { 
            inline_keyboard: [
                [{ text: opts[idx][0], callback_data: 'test_yan' }],
                [{ text: opts[idx][1], callback_data: 'test_yin' }]
            ] 
        }
    });
}

// ===== ОБРАБОТКА КНОПОК =====
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const messageId = query.message.message_id;
    const user = testUsers[chatId];
    
    console.log('Кнопка нажата:', data);
    
    // ГЛАВНАЯ КНОПКА - РАССКАЖИ ПОДРОБНЕЕ
    if (data === 'detailed_retreat') {
        if (userDialogs[chatId]) delete userDialogs[chatId];
        sendDetailedRetreat(chatId);
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    // Закрываем диалог при других действиях
    if (!['exp_never', 'exp_few', 'exp_many'].includes(data) && userDialogs[chatId]) {
        delete userDialogs[chatId];
    }
    
    // Выбор опыта
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
            bot.editMessageText(`🌿 Что бы ты хотела получить от ретрита?\n\nНапиши своими словами ✍️`, {
                chat_id: chatId,
                message_id: messageId
            });
        }
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    // Дни программы
    if (data === 'day1') {
        bot.sendMessage(chatId, `🌙 ДЕНЬ 1 — 29 мая\n\n14:00 — Заезд, расселение\n15:00 — Обед\n16:00 — "Первая тишина"\n17:00 — "Зеркало круга"\n18:00 — "Выбор цвета" — мандала\n19:00 — Сакральный танец\n20:00 — Ужин\n21:00 — Вечерняя тишина`);
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    if (data === 'day2') {
        bot.sendMessage(chatId, `☀️ ДЕНЬ 2 — 30 мая\n\n08:00 — Инь-йога\n09:30 — Завтрак\n11:00 — "Река течёт"\n13:00 — Обед\n15:00 — "Узел рода"\n17:00 — "Лицом к страху"\n19:00 — Ужин\n20:00 — Баня`);
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    if (data === 'day3') {
        bot.sendMessage(chatId, `🌸 ДЕНЬ 3 — 31 мая\n\n08:00 — Янь-йога\n09:30 — Завтрак\n11:00 — "Переворот"\n13:00 — "Второй цвет" — символ баланса\n14:00 — Круг закрытия\n15:00 — Обед и отъезд`);
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    // Запись
    if (data === 'register') {
        const userData = getUserData(chatId);
        if (userData) {
            saveUserData(chatId, { ...userData, status: 'interested', interestedAt: new Date().toISOString() });
        }
        
        bot.sendMessage(chatId, `✨ ЗАПИСЬ НА РЕТРИТ\n\n💰 600 BYN (предоплата 200 BYN)\n\n📞 Свяжитесь с организатором: @${ORGANIZER_TG}\n📞 Или позвоните: ${ORGANIZER_PHONE}\n🌐 Или на сайте: ${SITE_URL}\n\n🌸 Осталось 12 мест!`);
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    // Главное меню
    if (data === 'main_menu') {
        bot.sendMessage(chatId, `Главное меню:`, mainMenu);
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    // Тест
    if ((data === 'test_yan' || data === 'test_yin') && user && user.step < 3) {
        user.answers.push(data);
        user.step++;
        if (user.step < 3) {
            askTestQuestion(chatId, user.step);
        } else {
            const yinCount = user.answers.filter(a => a === 'test_yin').length;
            const result = yinCount >= 2 ? '🌙 Инь · Принятие' : '☀️ Янь · Действие';
            
            const userData = getUserData(chatId);
            if (userData) {
                saveUserData(chatId, { ...userData, testResult: result, status: 'test_passed' });
            }
            
            bot.sendMessage(chatId, `✨ Твой баланс: ${result}\n\n🎁 Нажми "🎁 Получить подарок"!`, mainMenu);
            delete testUsers[chatId];
        }
        bot.answerCallbackQuery(query.id);
        return;
    }
    
    bot.answerCallbackQuery(query.id);
});

// ===== КНОПКИ ГЛАВНОГО МЕНЮ =====
bot.onText(/🎴 Пройти тест/, (msg) => startTest(msg.chat.id));

bot.onText(/🎁 Получить подарок/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `🎁 ${msg.from.first_name}, вот твой подарок!\n\n👉 Скачать 2 практики:\n${GIFT_FOLDER_LINK}\n\n🌙 Инь-практика — расслабление\n☀️ Янь-практика — энергия`
    );
});

bot.onText(/🌿 О ретрите/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `🌿 РЕТРИТ «ИНЬ·ЯНЬ. БАЛАНС»\n\n📅 29–31 мая 2026\n📍 Могилёвская область\n💰 Стоимость: 600 BYN (всё включено)\n💳 Предоплата: 200 BYN для бронирования\n\n📞 ${ORGANIZER_PHONE}`
    );
});

bot.onText(/❓ FAQ/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `❓ ЧАСТЫЕ ВОПРОСЫ\n\n1️⃣ Нужен опыт? — Нет, практики для любого уровня.\n2️⃣ Что взять? — Удобную одежду, купальник, тапки.\n3️⃣ Телефоны? — Сдаются на входе — полное погружение.\n4️⃣ Можно с подругой? — Да, можно в одной комнате.\n5️⃣ Как оплатить? — Предоплата 200 BYN для бронирования. Остаток 400 BYN при заезде.\n6️⃣ Трансфер? — Да, из Минска туда и обратно.\n\n📞 ${ORGANIZER_PHONE}`
    );
});

bot.onText(/📞 Контакты/, (msg) => {
    bot.sendMessage(msg.chat.id,
        `📞 КОНТАКТЫ\n\n📱 @${ORGANIZER_TG}\n📞 ${ORGANIZER_PHONE}\n🌐 ${SITE_URL}`
    );
});

bot.onText(/🌐 Сайт/, (msg) => {
    bot.sendMessage(msg.chat.id, `🌐 ${SITE_URL}`, {
        reply_markup: { inline_keyboard: [[{ text: 'Открыть сайт', url: SITE_URL }]] }
    });
});

// ===== СЕРВЕР =====
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
});
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => console.log(`✅ Health check на порту ${PORT}`));

console.log('✅ БОТ УСПЕШНО ЗАПУЩЕН!');
console.log('📁 Данные сохраняются в users.json');
console.log('📞 Теперь собираются номера телефонов!');