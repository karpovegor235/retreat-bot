const TelegramBot = require('node-telegram-bot-api');
const http = require('http');
const fs = require('fs');

// ===== НАСТРОЙКИ =====
const TOKEN = process.env.TOKEN || '8643652432:AAHhMbm6Soms9JNsZ6pGUavj2jb4sXBqClU';
const ORGANIZER_TG = 'egor_provedet';
const ORGANIZER_PHONE = '+375291936694';
const ADMIN_ID = '490337942';
const GIFT_LINK = 'https://drive.google.com/file/d/1nMu9dMwHbS5ml1smwHRwmUQR-Lk0605J/view';
const RETREAT_DATE = new Date(2026, 4, 29);
const SITE_URL = 'http://retreat.idealab.by/';

// Фото места (ID из Google Drive)
const PHOTOS = [
    '1wpEVj6NYG0wNnOA5S2pWRvEePzwUUO2f',
    '1vhqk3pXuh5hPbc8YLNWpTiC5VwUu9Bwf',
    '1GwcICQaqLs0-tJDLFdW1UYUFJTJC7yRc'
];

// ===== БЕЗОПАСНАЯ ОТПРАВКА С ПОВТОРАМИ =====
async function safeSend(chatId, content, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            if (typeof content === 'string') {
                return await bot.sendMessage(chatId, content, options);
            }
        } catch (error) {
            console.log(`⚠️ Ошибка отправки (попытка ${i + 1}/${retries}):`, error.message);
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

// ===== СОЗДАНИЕ БОТА =====
const bot = new TelegramBot(TOKEN, { 
    polling: {
        interval: 3000,
        autoStart: true,
        params: {
            timeout: 60,
            allowed_updates: ['message', 'callback_query']
        }
    },
    request: {
        timeout: 60000
    }
});

// ===== ОБРАБОТКА ОШИБОК =====
process.on('uncaughtException', (error) => {
    console.log('❌ Необработанная ошибка:', error.message);
});

process.on('unhandledRejection', (error) => {
    console.log('❌ Необработанный rejection:', error);
});

bot.on('polling_error', (error) => {
    console.log('❌ Ошибка polling:', error.code, error.message);
    if (error.code === 'EFATAL' || error.message?.includes('ESOCKETTIMEDOUT')) {
        console.log('⏳ Проблема с сетью, продолжаем работу...');
    }
});

bot.on('error', (error) => {
    console.log('❌ Ошибка бота:', error);
});

console.log('✅ Бот создан и подключён');

const userDialogs = {};
const testAnswers = {};

// ===== СТАТИСТИКА =====
let userStats = { total: 0, started: 0, completedTest: 0, leftPhone: 0 };
function loadStats() {
    try { userStats = JSON.parse(fs.readFileSync('stats.json')); } catch(e) {}
}
function saveStats() { fs.writeFileSync('stats.json', JSON.stringify(userStats)); }
function updateStats(type) {
    if (type === 'start') { userStats.total++; userStats.started++; }
    if (type === 'test') userStats.completedTest++;
    if (type === 'phone') userStats.leftPhone++;
    saveStats();
}
loadStats();

// ===== РАБОТА С ПОЛЬЗОВАТЕЛЯМИ =====
function saveUser(chatId, data) {
    let users = {};
    try { users = JSON.parse(fs.readFileSync('users.json')); } catch(e) {}
    users[chatId] = { ...users[chatId], ...data, updated: new Date().toISOString() };
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
}
function getUser(chatId) {
    try { return JSON.parse(fs.readFileSync('users.json'))[chatId] || {}; } catch(e) { return {}; }
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
async function sendPhotos(chatId) {
    for (const id of PHOTOS) {
        try {
            await bot.sendPhoto(chatId, `https://drive.google.com/uc?export=view&id=${id}`, { caption: '🌿 Здесь будет наш ретрит' });
            await new Promise(r => setTimeout(r, 1500));
        } catch(e) {
            console.log('Ошибка отправки фото:', e.message);
        }
    }
}

function getGift(type, name) {
    return `🎁 ${name}, ваш подарок:\n${GIFT_LINK}`;
}

async function sendPersonalizedAdvice(chatId, type, name) {
    let message = '';
    
    if (type === 'yin') {
        message = `🌙 ${name}, спасибо, что прошла тест!

Твой тип — ИНЬ (принятие, покой, тишина)

Тебе сейчас не хватает:
• Права на отдых без чувства вины
• Тишины вокруг и внутри
• Разрешения ничего не делать

✨ Что можно сделать уже сегодня:
• Выдели 10 минут тишины без телефона
• Сделай глубокий вдох и выдох 5 раз
• Разреши себе ничего не делать хотя бы 5 минут

🌸 На ретрите тебе будет особенно близко:
• Вечерние практики тишины
• Мягкая Инь-йога
• Банные ритуалы (очищение)
• Круг поддержки

Ты имеешь право на отдых. Твоя сила — в принятии себя 🤍`;
    } 
    else if (type === 'yang') {
        message = `⚡️ ${name}, спасибо, что прошла тест!

Твой тип — ЯНЬ (действие, энергия, движение)

Тебе сейчас не хватает:
• Энергии и драйва
• Маленьких побед каждый день
• Движения без "надо"

✨ Что можно сделать уже сегодня:
• 5 минут активных движений (танец, зарядка)
• Составь список 3 маленьких побед на сегодня
• Сделай контрастный душ

🔥 На ретрите тебе будет особенно ценно:
• Утренние энергичные практики (Янь-йога)
• "Лицом к страху" — практика трансформации
• Гвоздестояние (по желанию)
• Круг поддержки и признаний

Твоя сила — в действии. Но даже воину нужен отдых. На ретрите ты найдёшь баланс ⚡️`;
    } 
    else {
        message = `⚖️ ${name}, спасибо, что прошла тест!

Твой тип — ГАРМОНИЯ (баланс Инь и Янь)

У тебя удивительный дар — ты умеешь и действовать, и замедляться.

✨ Что можно сделать уже сегодня:
• Начни день с активности, закончи тишиной
• Побалуй себя чем-то приятным
• Напиши 3 вещи, за которые ты благодарна

🌸 На ретрите ты сможешь:
• Углубить обе стороны
• Найти новый уровень себя
• Восстановить ресурс
• Обрести точку опоры внутри

Ты на правильном пути. Гармония — не статика, а танец. Приглашаю потанцевать 🤍`;
    }
    
    await safeSend(chatId, message);
}

// ===== ПОЯСНЕНИЕ ПЕРЕД ТЕСТОМ =====
async function showTestExplanation(chatId) {
    await bot.sendMessage(chatId, 
        `🌓 *ЧТО ТЕБЕ ДАСТ ТЕСТ «ИНЬ·ЯНЬ»*

Этот тест поможет:
• Увидеть твой текущий баланс энергии
• Понять, чего тебе не хватает прямо сейчас
• Получить персональные рекомендации
• Получить 2 практики в подарок (расслабление + энергия)

📋 *3 простых вопроса* — честные ответы

Начать?`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🌓 НАЧАТЬ ТЕСТ', callback_data: 'start_test_real' }],
                    [{ text: '🔙 Назад в меню', callback_data: 'show_main_menu' }]
                ]
            }
        }
    );
}

// ===== ГЛАВНОЕ МЕНЮ (3 кнопки) =====
async function showMainMenu(chatId) {
    await bot.sendMessage(chatId, '🤍 *Что дальше?*\n\nТы можешь пройти тест, получить подарок или узнать о ретрите', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🌓 ПРОЙТИ ТЕСТ', callback_data: 'start_test' }],
                [{ text: '🎁 ПОЛУЧИТЬ ПОДАРОК', callback_data: 'get_gift' }],
                [{ text: '🌿 О РЕТРИТЕ', callback_data: 'show_retreat_menu' }]
            ]
        }
    });
}

// ===== МЕНЮ РЕТРИТА =====
async function showRetreatMenu(chatId) {
    await bot.sendMessage(chatId, '🌿 *Что тебе рассказать о ретрите?*', {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '📸 Фото места', callback_data: 'menu_photos' }],
                [{ text: '🗓️ Программа', callback_data: 'menu_program' }],
                [{ text: '💰 Стоимость', callback_data: 'menu_price' }],
                [{ text: '🧘‍♀️ Практики', callback_data: 'menu_practices' }],
                [{ text: '❓ FAQ', callback_data: 'menu_faq' }],
                [{ text: '👭 Пригласить подругу', callback_data: 'invite_friend_menu' }],
                [{ text: '💚 ЗАБРОНИРОВАТЬ', callback_data: 'booking' }],
                [{ text: '🔙 Главное меню', callback_data: 'show_main_menu' }]
            ]
        }
    });
}

async function showProgram(chatId) {
    await bot.sendMessage(chatId,
        `🌙 ПРОГРАММА РЕТРИТА «ИНЬ·ЯНЬ. БАЛАНС»

🌙 ПЯТНИЦА, 29 МАЯ — ВСТРЕЧА И ВЫБОР ЦВЕТА
14:00 — Заезд, расселение, обед
16:00 — «Первая тишина» — знакомство с артефактом
17:00 — «Зеркало круга» — глубинное знакомство
18:00 — «Выбор цвета» — мандала (чёрный или белый шнур)
19:00 — Сакральный танец
20:00 — Ужин
21:00 — Вечерняя тишина

☀️ СУББОТА, 30 МАЯ — ПОГРУЖЕНИЕ
08:00 — Инь-йога
09:30 — Завтрак
11:00 — «Река течёт» — образ своих застоев
13:00 — Обед
15:00 — «Узел рода» — развязываем наследственное
17:00 — «Лицом к страху» — встреча со страхом
19:00 — Ужин
20:00 — Баня

🌸 ВОСКРЕСЕНЬЕ, 31 МАЯ — ИНТЕГРАЦИЯ
08:00 — Янь-йога
09:30 — Завтрак
11:00 — «Переворот» — от страха к силе
13:00 — «Второй цвет» — символ баланса
14:00 — Круг закрытия
15:00 — Обед и отъезд

«Перемены не случаются в голове. Они проживаются через тело, действие и тишину».
Все практики авторские. Никакого насилия над собой. Только забота 🤍

🌐 ${SITE_URL}`,
        { disable_web_page_preview: true });
    await showRetreatMenu(chatId);
}

async function showPrice(chatId) {
    await bot.sendMessage(chatId,
        `💰 СТОИМОСТЬ УЧАСТИЯ — 600 BYN

Включено в стоимость:
• Проживание 2 ночи в коттедже (2-3 человека в комнате, все удобства)
• Питание 3 раза в день (домашняя кухня) + перекусы
• Трансфер из Минска (туда и обратно)
• Баня на дровах + полноразмерный бассейн
• Все авторские практики (Инь/Янь йога, сакральный танец, гвоздестояние, расстановки, работа с родом, ритуалы)
• Рабочая тетрадь участницы
• Подарки от организаторов

💳 УСЛОВИЯ ОПЛАТЫ
Предоплата 200 BYN — бронирует место.
Остаток 400 BYN — при заезде.

❓ Рассрочка возможна — уточните у организатора.

Что вы забираете с собой:
• Внутреннюю точку опоры
• Освобождение от страхов (через встречу с ними)
• Родовую развязку (выход из чужих сценариев)
• Свободу в теле
• Возвращение к себе — цельной и настоящей

🌐 ${SITE_URL}

❗ Всего 12 мест. Группа камерная — важно успеть`,
        { disable_web_page_preview: true });
    await showRetreatMenu(chatId);
}

async function showPractices(chatId) {
    await bot.sendMessage(chatId,
        `🧘‍♀️ ЧТО МЫ БУДЕМ ДЕЛАТЬ НА РЕТРИТЕ

• Инь-йога — глубокое расслабление, отпускание напряжения
• Янь-йога — энергия, движение, активация
• Сакральный танец — танец освобождения без оценок
• Гвоздестояние — практика доверия и расслабления (по желанию)
• "Лицом к страху" — встреча со страхом без борьбы
• "Узел рода" — развязывание наследственных сценариев
• "Река течёт" — работа с застоями через образы
• Расстановки — выход из чужих ролей
• Мандала выбора цвета — символ вашего баланса
• Банные ритуалы + бассейн — очищение тела

"Ретрит — это не про отдых. Это про возвращение к себе".

🚗 ТРАНСФЕР ИЗ МИНСКА
Выезд: 29 мая (место посадки сообщим после бронирования)
Возвращение: 31 мая после обеда, около 17:00

Трансфер включён в стоимость.

🌐 ${SITE_URL}

📞 По всем вопросам: @${ORGANIZER_TG}`,
        { disable_web_page_preview: true });
    await showRetreatMenu(chatId);
}

async function showFAQ(chatId) {
    await bot.sendMessage(chatId,
        `❓ ЧАСТЫЕ ВОПРОСЫ (FAQ)

1️⃣ Нужен ли опыт йоги или практик?
Нет. Все практики адаптированы под новичков. Ведущие подстраиваются под группу.

2️⃣ Что взять с собой?
Удобную одежду для практик, купальник, тёплые носки, сменную обувь.

3️⃣ Телефоны и связь?
Телефоны сдаются на входе. Полное погружение в себя. В экстренном случае — телефон организатора.

4️⃣ Можно приехать с подругой?
Да. Вы сможете жить в одной комнате — укажите это при бронировании.

5️⃣ Как оплатить?
Предоплата 200 BYN — место ваше. Остаток при заезде. Перевод на карту или наличные.

6️⃣ Условия возврата предоплаты?
При отмене за 2 недели — возврат 100%. За 3 дня — возврат 50%. За 1 день — без возврата.

7️⃣ Питание: что готовят?
Домашняя кухня. Вкусно, сытно, с любовью. При аллергиях — предупредите.

8️⃣ Можно ли приехать одной?
Да, это опыт, который часто глубже проживается в одиночестве. Вы не будете одиноки — круг поддержит.

9️⃣ Что даёт мандала выбора цвета?
Вы выбираете чёрный (Янь/сила) или белый (Инь/принятие) шнур. А на третий день добавляете второй — это становится вашим личным символом баланса.

🔟 Ретрит — это про религию?
Нет. Это про женскую силу, тело, тишину и осознанность. Без привязки к конфессиям.

🌐 ${SITE_URL}

Есть другие вопросы? Напишите @${ORGANIZER_TG}`,
        { disable_web_page_preview: true });
    await showRetreatMenu(chatId);
}

async function askForPhone(chatId) {
    await bot.sendMessage(chatId, `📞 Отправьте номер телефона (кнопка ниже) или напишите вручную: +375XXXXXXXXX`, {
        reply_markup: {
            keyboard: [[{ text: '📱 Отправить номер', request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    });
}

// ===== ШУТКИ ПРИ ИГНОРЕ =====
const funnyReminders = [
    "😏 Я вижу, ты меня игнорируешь... Но подарок всё ещё ждёт!",
    "🦥 Привет! Я без напряга, просто напоминаю о себе 🌿",
    "🎈 Тук-тук! Не забыла про практику?"
];

async function sendFunnyReminder(chatId) {
    const randomIndex = Math.floor(Math.random() * funnyReminders.length);
    await bot.sendMessage(chatId, funnyReminders[randomIndex] + '\n\nХочешь получать заботливые напоминания?', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '👍 Да, продолжай', callback_data: 'continue_reminders' }],
                [{ text: '🔕 Отстань', callback_data: 'stop_reminders' }]
            ]
        }
    });
}

// ===== НАПОМИНАНИЯ =====
function getReminderMessage(day, type, name) {
    const map = {
        yin: { 1: `🤍 ${name}, привет... Как ты?`, 3: `🌙 ${name}, места ещё есть.`, 7: `🌸 ${name}, береги себя.` },
        yang: { 1: `⚡️ ${name}, практика ждёт!`, 3: `📊 ${name}, осталось 8 мест.`, 7: `💪 ${name}, даже сильным нужен отдых.` },
        balance: { 1: `${name}, привет 🤍`, 3: `${name}, места есть.`, 7: `${name}, баланс — это танец.` }
    };
    return map[type]?.[day] || map.balance[day];
}

function checkReminders() {
    try {
        const users = JSON.parse(fs.readFileSync('users.json', 'utf8') || '{}');
        const now = new Date();
        const hour = now.getHours();
        if (hour >= 23 || hour < 9) return;
        for (const [chatId, user] of Object.entries(users)) {
            if (user.noReminders) continue;
            if (!user.testCompleted && !user.dialogCompletedAt) continue;
            const lastActivity = new Date(user.testCompleted || user.dialogCompletedAt || user.updated);
            const daysDiff = Math.floor((now - lastActivity) / (1000 * 3600 * 24));
            const type = user.testType || 'balance';
            const name = user.name || 'друг';
            [1, 3, 7].forEach(day => {
                const flag = `reminder_${day}_sent`;
                if (daysDiff >= day && daysDiff < day + 1 && !user[flag]) {
                    bot.sendMessage(chatId, getReminderMessage(day, type, name));
                    saveUser(chatId, { [flag]: true });
                    let noResponseCount = (user.noResponseCount || 0) + 1;
                    if (noResponseCount >= 2) {
                        setTimeout(() => sendFunnyReminder(chatId), 60000);
                        saveUser(chatId, { noResponseCount: 0 });
                    } else {
                        saveUser(chatId, { noResponseCount });
                    }
                }
            });
            const retreatDiff = Math.ceil((RETREAT_DATE - now) / (1000 * 3600 * 24));
            if (retreatDiff === 3 && !user.retreatReminderSent) {
                bot.sendMessage(chatId, `🎉 ${name}, через 3 ДНЯ РЕТРИТ! Очень жду встречи 🤍`);
                saveUser(chatId, { retreatReminderSent: true });
            }
        }
    } catch(e) {}
}
setInterval(checkReminders, 1000 * 60 * 60 * 6);

// ===== /start =====
bot.onText(/\/start(?: ref_(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const referrerId = match[1];
    
    // Если диалог уже начат - не сбиваем его
    if (userDialogs[chatId] && userDialogs[chatId].step) {
        bot.sendMessage(chatId, '🤍 Мы уже знакомимся! Пожалуйста, ответь на вопрос или выбери вариант из меню.');
        return;
    }
    
    updateStats('start');
    saveUser(chatId, { name: msg.from.first_name });
    
    if (referrerId) {
        saveUser(chatId, { referredBy: referrerId });
        bot.sendMessage(chatId, 
            `🌸 *Привет!* Тебя пригласила подруга!\n\nУ тебя есть скидка 10% на ретрит.\n\nДавай познакомимся? Как тебя зовут?`,
            { parse_mode: 'Markdown' }
        );
        userDialogs[chatId] = { step: 'name', data: { referrerId } };
    } else {
        userDialogs[chatId] = { step: 'name', data: {} };
        bot.sendMessage(chatId, `✨ Привет! Я — *твой помощник* 🤍

Меня зовут Ци. Я Энергия, которая течёт между покоем и действием. На ретрите «Инь·Янь. Баланс» я буду твоим проводником.

🌿 *Что я могу тебе дать:*

• Помогу понять, чего тебе не хватает прямо сейчас
• Проведу короткий тест «Инь / Янь» — увидишь свой баланс
• Подарю 2 практики (расслабление + энергия) — сразу, без условий
• Расскажу про ретрит, если будет интересно
• И никакого спама — только забота и поддержка

💬 *Как тебя зовут?* (просто напиши имя)`,
             { parse_mode: 'Markdown' }
         );
    }   
});

// ===== ДИАЛОГ =====
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const d = userDialogs[chatId];
    if (!d) return;

    if (d.step === 'name') {
        d.data.name = msg.text;
        d.step = 'feeling';
        bot.sendMessage(chatId, `Приятно познакомиться, ${msg.text}! 🤍\n\nКак себя чувствуешь?`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🌿 Устала', callback_data: 'feel_tired' }],
                    [{ text: '🌙 Выгорела', callback_data: 'feel_burned' }],
                    [{ text: '⚡ Полна энергии', callback_data: 'feel_energy' }],
                    [{ text: '😔 Потеряла себя', callback_data: 'feel_lost' }]
                ]
            }
        });
    }
    else if (d.step === 'feeling') {
        d.data.feeling = msg.text;
        d.step = 'need';
        bot.sendMessage(chatId, `Чего тебе не хватает?`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '☾ Тишины', callback_data: 'need_silence' }],
                    [{ text: '☾ Энергии', callback_data: 'need_energy' }],
                    [{ text: '☾ Себя', callback_data: 'need_myself' }]
                ]
            }
        });
    }
    else if (d.step === 'need') {
        d.data.need = msg.text;
        d.step = 'experience';
        bot.sendMessage(chatId, `Был ли опыт на ретритах?`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✨ Никогда', callback_data: 'exp_never' }],
                    [{ text: '🌱 1-2 раза', callback_data: 'exp_few' }],
                    [{ text: '🌸 Регулярно', callback_data: 'exp_many' }]
                ]
            }
        });
    }
    else if (d.step === 'experience') {
        d.data.exp = msg.text;
        d.step = 'fears';
        bot.sendMessage(chatId, `✨ *Готова к переменам?*`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🌙 Да, но боюсь', callback_data: 'fears_afraid' }],
                    [{ text: '⚡ Да, с нетерпением', callback_data: 'fears_eager' }],
                    [{ text: '🤍 Пока не знаю', callback_data: 'fears_unsure' }]
                ]
            }
        });
    }
    else if (d.step === 'fears') {
        d.data.fears = msg.text;
        const name = d.data.name;
        const feeling = d.data.feeling;
        const need = d.data.need;
        const exp = d.data.exp;
        const ready = msg.text;
        
        saveUser(chatId, d.data);
        delete userDialogs[chatId];
        
        let readinessText = '';
        if (ready === 'Да, но боюсь') readinessText = 'Ты готова к переменам, но чувствуешь лёгкое сопротивление — это нормально!';
        else if (ready === 'Да, с нетерпением') readinessText = 'Ты готова к переменам и ждёшь их с нетерпением — это прекрасная энергия!';
        else readinessText = 'Ты пока не уверена — это нормально. Давай просто посмотрим, что я могу тебе предложить';
        
        let analysisMessage = `🤍 *Спасибо за твои ответы, ${name}!*

Я сохранила их для себя, чтобы лучше понять, что тебе сейчас важно.

💡 *Вот что я заметила:*
• Тебе не хватает ${need.toLowerCase()}
• Сейчас ты чувствуешь ${feeling.toLowerCase()}
• ${exp === 'Никогда' ? 'Ретриты для тебя новое пространство — это прекрасно!' : (exp === '1-2 раза' ? 'У тебя уже есть небольшой опыт ретритов — ты знаешь, что это даёт' : 'Ты опытная участница — тебе знакомо глубинное погружение')}
• ${readinessText}

🎁 *У меня для тебя есть несколько предложений:*

1. Пройти короткий тест «Инь/Янь» — чтобы увидеть свой баланс
2. Получить 2 практики в подарок (расслабление + энергия)
3. Узнать подробнее о ретрите «Инь·Янь. Баланс»

Что выберешь?`;
        
        bot.sendMessage(chatId, analysisMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🌓 ПРОЙТИ ТЕСТ', callback_data: 'start_test' }],
                    [{ text: '🎁 ПОЛУЧИТЬ ПОДАРОК', callback_data: 'get_gift' }],
                    [{ text: '🌿 О РЕТРИТЕ', callback_data: 'show_retreat_menu' }]
                ]
            }
        });
    }
});

// ===== ОБРАБОТЧИК КНОПОК (ГЛАВНЫЙ) =====
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const msgId = query.message.message_id;
    const d = userDialogs[chatId];

    console.log(`🔔 ${data} от ${chatId}`);

    if (data === 'booking') {
        await askForPhone(chatId);
        await bot.answerCallbackQuery(query.id);
        return;
    }

    if (data === 'show_main_menu') {
        await showMainMenu(chatId);
        await bot.answerCallbackQuery(query.id);
        return;
    }

    if (data === 'show_retreat_menu') {
        await showRetreatMenu(chatId);
        await bot.answerCallbackQuery(query.id);
        return;
    }
    
    if (data === 'invite_friend_menu') {
        userDialogs[chatId] = { step: 'invite_friend', data: {} };
        await bot.sendMessage(chatId,
            `👭 *Пригласи подругу и получите скидку 10%*

🔗 *Как зовут твою подругу?*
Напиши её Telegram username (например: @anna)

💡 *Важно:* У каждой подруги будет ПЕРСОНАЛЬНАЯ ссылка.
Если она забронирует ретрит, ВЫ ОБЕ получите скидку 10% на следующий ретрит 🤍

Просто отправь мне её username:`,
            { parse_mode: 'Markdown' }
        );
        await bot.answerCallbackQuery(query.id);
        return;
    }
    
    if (data === 'menu_photos') {
        await sendPhotos(chatId);
        await showRetreatMenu(chatId);
        await bot.answerCallbackQuery(query.id);
        return;
    }
    if (data === 'menu_program') {
        await showProgram(chatId);
        await bot.answerCallbackQuery(query.id);
        return;
    }
    if (data === 'menu_price') {
        await showPrice(chatId);
        await bot.answerCallbackQuery(query.id);
        return;
    }
    if (data === 'menu_practices') {
        await showPractices(chatId);
        await bot.answerCallbackQuery(query.id);
        return;
    }
    if (data === 'menu_faq') {
        await showFAQ(chatId);
        await bot.answerCallbackQuery(query.id);
        return;
    }
    if (data === 'get_gift') {
        const user = getUser(chatId);
        await bot.sendMessage(chatId, getGift(user.testType || 'balance', user.name || 'гостья'));
        await bot.answerCallbackQuery(query.id);
        return;
    }
    if (data === 'stop_reminders') {
        saveUser(chatId, { noReminders: true });
        await bot.editMessageText('🤍 Поняла, больше не буду напоминать.', { chat_id: chatId, message_id: msgId });
        await bot.answerCallbackQuery(query.id);
        return;
    }
    if (data === 'continue_reminders') {
        saveUser(chatId, { noResponseCount: 0 });
        await bot.editMessageText('🌿 Хорошо, продолжу заботливо напоминать.', { chat_id: chatId, message_id: msgId });
        await bot.answerCallbackQuery(query.id);
        return;
    }

    if (data === 'feel_tired' || data === 'feel_burned' || data === 'feel_energy' || data === 'feel_lost') {
        const map = { feel_tired: 'Устала', feel_burned: 'Выгорела', feel_energy: 'Полна энергии', feel_lost: 'Потеряла себя' };
        if (d && d.step === 'feeling') {
            d.data.feeling = map[data];
            d.step = 'need';
            await bot.editMessageText('Чего тебе не хватает?', {
                chat_id: chatId, message_id: msgId,
                reply_markup: { inline_keyboard: [[{ text: '☾ Тишины', callback_data: 'need_silence' }], [{ text: '☾ Энергии', callback_data: 'need_energy' }], [{ text: '☾ Себя', callback_data: 'need_myself' }]] }
            });
        }
        await bot.answerCallbackQuery(query.id);
        return;
    }
    if (data === 'need_silence' || data === 'need_energy' || data === 'need_myself') {
        const map = { need_silence: 'Тишины', need_energy: 'Энергии', need_myself: 'Себя' };
        if (d && d.step === 'need') {
            d.data.need = map[data];
            d.step = 'experience';
            await bot.editMessageText('Был ли опыт на ретритах?', {
                chat_id: chatId, message_id: msgId,
                reply_markup: { inline_keyboard: [[{ text: '✨ Никогда', callback_data: 'exp_never' }], [{ text: '🌱 1-2 раза', callback_data: 'exp_few' }], [{ text: '🌸 Регулярно', callback_data: 'exp_many' }]] }
            });
        }
        await bot.answerCallbackQuery(query.id);
        return;
    }
    if (data === 'exp_never' || data === 'exp_few' || data === 'exp_many') {
        const map = { exp_never: 'Никогда', exp_few: '1-2 раза', exp_many: 'Регулярно' };
        if (d && d.step === 'experience') {
            d.data.exp = map[data];
            d.step = 'fears';
            await bot.editMessageText('✨ *Готова к переменам?*', {
                chat_id: chatId, message_id: msgId,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [[{ text: '🌙 Да, но боюсь', callback_data: 'fears_afraid' }], [{ text: '⚡ Да, с нетерпением', callback_data: 'fears_eager' }], [{ text: '🤍 Пока не знаю', callback_data: 'fears_unsure' }]] }
            });
        }
        await bot.answerCallbackQuery(query.id);
        return;
    }
    
    // НОВЫЕ ОБРАБОТЧИКИ ДЛЯ ВОПРОСА "Готова к переменам?"
    if (data === 'fears_afraid') {
        if (d && d.step === 'fears') {
            d.data.fears = 'Да, но боюсь';
            const name = d.data.name;
            const feeling = d.data.feeling;
            const need = d.data.need;
            const exp = d.data.exp;
            
            saveUser(chatId, d.data);
            delete userDialogs[chatId];
            
            let analysisMessage = `🤍 *Спасибо за твои ответы, ${name}!*

Я сохранила их для себя, чтобы лучше понять, что тебе сейчас важно.

💡 *Вот что я заметила:*
• Тебе не хватает ${need.toLowerCase()}
• Сейчас ты чувствуешь ${feeling.toLowerCase()}
• ${exp === 'Никогда' ? 'Ретриты для тебя новое пространство — это прекрасно!' : (exp === '1-2 раза' ? 'У тебя уже есть небольшой опыт ретритов — ты знаешь, что это даёт' : 'Ты опытная участница — тебе знакомо глубинное погружение')}
• Ты готова к переменам, но чувствуешь лёгкое сопротивление — это нормально!

🎁 *У меня для тебя есть несколько предложений:*

1. Пройти короткий тест «Инь/Янь» — чтобы увидеть свой баланс
2. Получить 2 практики в подарок (расслабление + энергия)
3. Узнать подробнее о ретрите «Инь·Янь. Баланс»

Что выберешь?`;
            
            await bot.editMessageText(analysisMessage, {
                chat_id: chatId, message_id: msgId,
                parse_mode: 'Markdown',
                reply_markup: { 
                    inline_keyboard: [
                        [{ text: '🌓 ПРОЙТИ ТЕСТ', callback_data: 'start_test' }],
                        [{ text: '🎁 ПОЛУЧИТЬ ПОДАРОК', callback_data: 'get_gift' }], 
                        [{ text: '🌿 О РЕТРИТЕ', callback_data: 'show_retreat_menu' }]
                    ] 
                }
            });
        }
        await bot.answerCallbackQuery(query.id);
        return;
    }
    
    if (data === 'fears_eager') {
        if (d && d.step === 'fears') {
            d.data.fears = 'Да, с нетерпением';
            const name = d.data.name;
            const feeling = d.data.feeling;
            const need = d.data.need;
            const exp = d.data.exp;
            
            saveUser(chatId, d.data);
            delete userDialogs[chatId];
            
            let analysisMessage = `🤍 *Спасибо за твои ответы, ${name}!*

Я сохранила их для себя, чтобы лучше понять, что тебе сейчас важно.

💡 *Вот что я заметила:*
• Тебе не хватает ${need.toLowerCase()}
• Сейчас ты чувствуешь ${feeling.toLowerCase()}
• ${exp === 'Никогда' ? 'Ретриты для тебя новое пространство — это прекрасно!' : (exp === '1-2 раза' ? 'У тебя уже есть небольшой опыт ретритов — ты знаешь, что это даёт' : 'Ты опытная участница — тебе знакомо глубинное погружение')}
• Ты готова к переменам и ждёшь их с нетерпением — это прекрасная энергия!

🎁 *У меня для тебя есть несколько предложений:*

1. Пройти короткий тест «Инь/Янь» — чтобы увидеть свой баланс
2. Получить 2 практики в подарок (расслабление + энергия)
3. Узнать подробнее о ретрите «Инь·Янь. Баланс»

Что выберешь?`;
            
            await bot.editMessageText(analysisMessage, {
                chat_id: chatId, message_id: msgId,
                parse_mode: 'Markdown',
                reply_markup: { 
                    inline_keyboard: [
                        [{ text: '🌓 ПРОЙТИ ТЕСТ', callback_data: 'start_test' }],
                        [{ text: '🎁 ПОЛУЧИТЬ ПОДАРОК', callback_data: 'get_gift' }], 
                        [{ text: '🌿 О РЕТРИТЕ', callback_data: 'show_retreat_menu' }]
                    ] 
                }
            });
        }
        await bot.answerCallbackQuery(query.id);
        return;
    }
    
    if (data === 'fears_unsure') {
        if (d && d.step === 'fears') {
            d.data.fears = 'Пока не знаю';
            const name = d.data.name;
            const feeling = d.data.feeling;
            const need = d.data.need;
            const exp = d.data.exp;
            
            saveUser(chatId, d.data);
            delete userDialogs[chatId];
            
            let analysisMessage = `🤍 *Спасибо за твои ответы, ${name}!*

Я сохранила их для себя, чтобы лучше понять, что тебе сейчас важно.

💡 *Вот что я заметила:*
• Тебе не хватает ${need.toLowerCase()}
• Сейчас ты чувствуешь ${feeling.toLowerCase()}
• ${exp === 'Никогда' ? 'Ретриты для тебя новое пространство — это прекрасно!' : (exp === '1-2 раза' ? 'У тебя уже есть небольшой опыт ретритов — ты знаешь, что это даёт' : 'Ты опытная участница — тебе знакомо глубинное погружение')}
• Ты пока не уверена — это нормально. Давай просто посмотрим, что я могу тебе предложить

🎁 *У меня для тебя есть несколько предложений:*

1. Пройти короткий тест «Инь/Янь» — чтобы увидеть свой баланс
2. Получить 2 практики в подарок (расслабление + энергия)
3. Узнать подробнее о ретрите «Инь·Янь. Баланс»

Что выберешь?`;
            
            await bot.editMessageText(analysisMessage, {
                chat_id: chatId, message_id: msgId,
                parse_mode: 'Markdown',
                reply_markup: { 
                    inline_keyboard: [
                        [{ text: '🌓 ПРОЙТИ ТЕСТ', callback_data: 'start_test' }],
                        [{ text: '🎁 ПОЛУЧИТЬ ПОДАРОК', callback_data: 'get_gift' }], 
                        [{ text: '🌿 О РЕТРИТЕ', callback_data: 'show_retreat_menu' }]
                    ] 
                }
            });
        }
        await bot.answerCallbackQuery(query.id);
        return;
    }

    if (data === 'start_test') {
        await showTestExplanation(chatId);
        await bot.answerCallbackQuery(query.id);
        return;
    }
    
    if (data === 'start_test_real') {
        testAnswers[chatId] = [];
        await bot.editMessageText('🌓 Вопрос 1/3\n\nКогда проблема — действуешь или наблюдаешь?', {
            chat_id: chatId, 
            message_id: msgId,
            reply_markup: { 
                inline_keyboard: [
                    [{ text: '⚡ Действую', callback_data: 'test_yang' }], 
                    [{ text: '🌙 Наблюдаю', callback_data: 'test_yin' }]
                ] 
            }
        });
        await bot.answerCallbackQuery(query.id);
        return;
    }

    if (data === 'test_yin' || data === 'test_yang') {
        if (!testAnswers[chatId]) testAnswers[chatId] = [];
        testAnswers[chatId].push(data);
        const step = testAnswers[chatId].length;
        if (step === 1) {
            await bot.editMessageText('🌓 Вопрос 2/3\n\nКак восстанавливаешь силы?', {
                chat_id: chatId, message_id: msgId,
                reply_markup: { inline_keyboard: [[{ text: '🏃‍♀️ Движение', callback_data: 'test_yang' }], [{ text: '🛋️ Покой', callback_data: 'test_yin' }]] }
            });
        } else if (step === 2) {
            await bot.editMessageText('🌓 Вопрос 3/3\n\nЧто ближе: контроль или поток?', {
                chat_id: chatId, message_id: msgId,
                reply_markup: { inline_keyboard: [[{ text: '📋 Контроль', callback_data: 'test_yang' }], [{ text: '🌊 Поток', callback_data: 'test_yin' }]] }
            });
        } else {
            const yin = testAnswers[chatId].filter(a => a === 'test_yin').length;
            const yang = testAnswers[chatId].filter(a => a === 'test_yang').length;
            const yinP = Math.round(yin / 3 * 100);
            const yangP = Math.round(yang / 3 * 100);
            const type = yinP >= 60 ? 'yin' : (yangP >= 60 ? 'yang' : 'balance');
            const result = `🌓 ТВОЙ БАЛАНС\n\nИнь ${yinP}% | Янь ${yangP}%\n\nТвой тип: ${type === 'yin' ? 'ИНЬ (покой)' : type === 'yang' ? 'ЯНЬ (энергия)' : 'БАЛАНС'}`;
            await bot.editMessageText(result, { chat_id: chatId, message_id: msgId });
            saveUser(chatId, { testType: type, testCompleted: new Date().toISOString() });
            updateStats('test');
            const name = d?.data?.name || getUser(chatId).name || 'дорогая';
            setTimeout(async () => {
                await sendPersonalizedAdvice(chatId, type, name);
                setTimeout(async () => {
                    await bot.sendMessage(chatId, getGift(type, name));
                    setTimeout(() => showRetreatMenu(chatId), 2000);
                }, 2000);
            }, 1500);
            delete testAnswers[chatId];
        }
        await bot.answerCallbackQuery(query.id);
        return;
    }

    await bot.answerCallbackQuery(query.id);
});

// ===== ТЕЛЕФОН С ПОДТВЕРЖДЕНИЕМ ПРИГЛАШЕНИЯ И ИМЕНЕМ =====
bot.on('contact', (msg) => {
    const phone = msg.contact.phone_number;
    const chatId = msg.chat.id;
    const username = msg.from.username;
    const userName = msg.from.first_name || msg.from.username || 'Без имени';
    
    saveUser(chatId, { phone, status: 'lead', name: userName });
    updateStats('phone');
    
    // Проверяем приглашение
    let invites = {};
    try { invites = JSON.parse(fs.readFileSync('invites.json')); } catch(e) {}
    
    if (username && invites[username] && invites[username].status === 'pending') {
        invites[username].status = 'confirmed';
        fs.writeFileSync('invites.json', JSON.stringify(invites, null, 2));
        
        // Уведомление пригласившему
        bot.sendMessage(invites[username].invitedBy, 
            `🎁 *Подарок!* Твоя подруга @${username} подтвердила бронирование!

Вы обе получаете скидку 10% на следующий ретрит.

Напиши организатору @${ORGANIZER_TG} и скажи промокод FRIEND10 🤍

🌐 ${SITE_URL}`,
            { parse_mode: 'Markdown' }
        );
        
        // Уведомление подруге
        bot.sendMessage(chatId,
            `🎁 *Поздравляю!* Ты подтвердила бронирование по приглашению.

Вы обе получаете скидку 10% на следующий ретрит.

Напиши организатору @${ORGANIZER_TG} и скажи промокод FRIEND10 🤍

🌐 ${SITE_URL}`,
            { parse_mode: 'Markdown' }
        );
    }
    
    bot.sendMessage(chatId, `✅ Спасибо, ${userName}! @${ORGANIZER_TG} свяжется с вами.`);
    bot.sendMessage(chatId, `🌐 Подробнее о ретрите: ${SITE_URL}`);
    bot.sendMessage(ADMIN_ID, `📞 *НОВЫЙ ЛИД!*\n\n👤 Имя: ${userName}\n📞 Телефон: ${phone}\n🆔 ID: ${chatId}`, { parse_mode: 'Markdown' });
});

// Ручной ввод телефона
bot.on('message', (msg) => {
    const text = msg.text;
    if (text && text.match(/^[\+\d\s\-\(\)]{10,20}$/)) {
        const phone = text.replace(/[\s\-\(\)]/g, '');
        const chatId = msg.chat.id;
        const username = msg.from.username;
        const userName = msg.from.first_name || msg.from.username || 'Без имени';
        
        saveUser(chatId, { phone: phone.startsWith('+') ? phone : '+' + phone, status: 'lead', name: userName });
        updateStats('phone');
        
        // Проверяем приглашение
        let invites = {};
        try { invites = JSON.parse(fs.readFileSync('invites.json')); } catch(e) {}
        
        if (username && invites[username] && invites[username].status === 'pending') {
            invites[username].status = 'confirmed';
            fs.writeFileSync('invites.json', JSON.stringify(invites, null, 2));
            
            bot.sendMessage(invites[username].invitedBy, 
                `🎁 *Подарок!* Твоя подруга @${username} подтвердила бронирование!\n\nВы обе получаете скидку 10% на следующий ретрит.\n\nНапиши организатору @${ORGANIZER_TG} и скажи промокод FRIEND10 🤍\n\n🌐 ${SITE_URL}`,
                { parse_mode: 'Markdown' }
            );
            
            bot.sendMessage(chatId,
                `🎁 *Поздравляю!* Ты подтвердила бронирование по приглашению.\n\nВы обе получаете скидку 10% на следующий ретрит.\n\nНапиши организатору @${ORGANIZER_TG} и скажи промокод FRIEND10 🤍\n\n🌐 ${SITE_URL}`,
                { parse_mode: 'Markdown' }
            );
        }
        
        bot.sendMessage(chatId, `✅ Спасибо, ${userName}! @${ORGANIZER_TG} свяжется с вами.`);
        bot.sendMessage(chatId, `🌐 Подробнее о ретрите: ${SITE_URL}`);
        bot.sendMessage(ADMIN_ID, `📞 *НОВЫЙ ЛИД!*\n\n👤 Имя: ${userName}\n📞 Телефон: ${phone}\n🆔 ID: ${chatId}`, { parse_mode: 'Markdown' });
    }
});

// ===== ПРИГЛАСИТЬ ПОДРУГУ =====
bot.onText(/👭 Пригласить подругу/, async (msg) => {
    const chatId = msg.chat.id;
    userDialogs[chatId] = { step: 'invite_friend', data: {} };
    
    bot.sendMessage(chatId,
        `👭 *Пригласи подругу и получите скидку 10%*

🔗 *Как зовут твою подругу?*
Напиши её Telegram username (например: @anna)

💡 *Важно:* У каждой подруги будет ПЕРСОНАЛЬНАЯ ссылка.
Если она забронирует ретрит, ВЫ ОБЕ получите скидку 10% на следующий ретрит 🤍

Просто отправь мне её username:`,
        { parse_mode: 'Markdown' }
    );
});

const inviteHandler = async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const d = userDialogs[chatId];
    
    if (!d || d.step !== 'invite_friend') return;
    
    let friendUsername = text;
    if (friendUsername.startsWith('@')) {
        friendUsername = friendUsername.substring(1);
    }
    
    if (!friendUsername || friendUsername.length < 3) {
        bot.sendMessage(chatId, '❌ Пожалуйста, напиши корректный username, например: @anna или просто anna');
        delete userDialogs[chatId];
        return;
    }
    
    const inviterName = msg.from.first_name;
    const botUsername = (await bot.getMe()).username;
    const inviteLink = `https://t.me/${botUsername}?start=ref_${chatId}`;
    
    let invites = {};
    try { invites = JSON.parse(fs.readFileSync('invites.json')); } catch(e) {}
    
    invites[friendUsername] = {
        invitedBy: chatId,
        invitedByName: inviterName,
        invitedAt: new Date().toISOString(),
        status: 'pending'
    };
    fs.writeFileSync('invites.json', JSON.stringify(invites, null, 2));
    
    // СООБЩЕНИЕ 1
    await bot.sendMessage(chatId,
        `👭 Персональная ссылка для @${friendUsername}

Отправь ей это сообщение:

🌸 ${inviterName} приглашает тебя на ретрит!`
    );
    
    await new Promise(r => setTimeout(r, 1000));
    
    // СООБЩЕНИЕ 2
    await bot.sendMessage(chatId, `🔗 Твоя персональная ссылка со скидкой:\n${inviteLink}`);
    
    await new Promise(r => setTimeout(r, 1000));
    
    // СООБЩЕНИЕ 3
    await bot.sendMessage(chatId,
        `По этой ссылке у тебя будет скидка 10% на ретрит «Инь·Янь. Баланс»

❕ Важно: ссылка персональная, только для тебя

🌐 ${SITE_URL}

———

✅ Что даёт эта ссылка?
- Скидка 10% на ретрит «Инь·Янь. Баланс»
- Возможность получить скидку 10% на следующий ретрит для вас обеих

✅ Подробная инструкция для подруги:

1️⃣ Перейди по ссылке выше
2️⃣ Напиши боту /start
3️⃣ Заполни небольшой опрос (это займёт 2 минуты)
4️⃣ Отправь свой номер телефона (кнопка "Отправить номер")
5️⃣ Готово! Скидка активируется автоматически

———

🎁 Что получаете ОБЕ:

После отправки номера телефона скидка 10% на следующий ретрит активируется для вас обеих

💚 Статус приглашения можно проверить у организатора @${ORGANIZER_TG}`
    );
    
    delete userDialogs[chatId];
};

bot.on('message', inviteHandler);

// ===== КНОПКИ ГЛАВНОГО МЕНЮ =====
bot.onText(/🧘‍♀️ Начать подбор/, (msg) => {
    userDialogs[msg.chat.id] = { step: 'name', data: {} };
    bot.sendMessage(msg.chat.id, '🌿 Как тебя зовут?');
});

bot.onText(/🎁 Подарок/, (msg) => {
    const user = getUser(msg.chat.id);
    bot.sendMessage(msg.chat.id, getGift(user.testType || 'balance', user.name || 'гостья'));
});

bot.onText(/🌿 О ретрите/, (msg) => showRetreatMenu(msg.chat.id));
bot.onText(/❓ FAQ/, (msg) => showFAQ(msg.chat.id));
bot.onText(/📞 Контакты/, (msg) => bot.sendMessage(msg.chat.id, `📞 @${ORGANIZER_TG}\n📞 ${ORGANIZER_PHONE}\n\n🌐 ${SITE_URL}`));
bot.onText(/🌐 Сайт/, (msg) => bot.sendMessage(msg.chat.id, `🌐 ${SITE_URL}`));

// ===== АДМИНИСТРАТОРСКИЕ КОМАНДЫ =====
bot.onText(/\/stats/, (msg) => {
    if (msg.from.username !== ADMIN_ID && msg.chat.id.toString() !== ADMIN_ID) return bot.sendMessage(msg.chat.id, '⛔ Только для организатора');
    bot.sendMessage(msg.chat.id, `📊 СТАТИСТИКА

👥 Всего пользователей: ${userStats.total}
✅ Начали диалог: ${userStats.started}
🌓 Прошли тест: ${userStats.completedTest}
📞 Оставили телефон: ${userStats.leftPhone}

🌐 ${SITE_URL}`);
});

bot.onText(/\/zayavki/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    
    if (username !== ADMIN_ID && chatId.toString() !== ADMIN_ID) {
        return bot.sendMessage(chatId, '⛔ Только для организатора');
    }
    
    try {
        const users = JSON.parse(fs.readFileSync('users.json', 'utf8') || '{}');
        let text = '📞 НОВЫЕ ЗАЯВКИ\n\n';
        let count = 0;
        
        for (const [id, user] of Object.entries(users)) {
            if (user.phone && user.status === 'lead') {
                count++;
                const name = user.name || 'Без имени';
                const phone = user.phone;
                const date = new Date(user.updated || user.phoneLeftAt).toLocaleString();
                text += `${count}. 👤 ${name}\n   📞 ${phone}\n   🕐 ${date}\n\n`;
            }
        }
        
        if (count === 0) {
            text = '📭 Пока нет новых заявок';
        } else {
            text = `📞 ЗАЯВКИ (${count})\n\n` + text.substring(text.indexOf('\n\n') + 2);
        }
        
        bot.sendMessage(chatId, text);
    } catch(e) {
        bot.sendMessage(chatId, '❌ Ошибка при чтении заявок');
        console.log(e);
    }
});

bot.onText(/\/invites/, (msg) => {
    const username = msg.from.username;
    if (username !== ADMIN_ID && msg.chat.id.toString() !== ADMIN_ID) {
        return bot.sendMessage(msg.chat.id, '⛔ Только для организатора');
    }
    
    try {
        const invites = JSON.parse(fs.readFileSync('invites.json', 'utf8') || '{}');
        let text = '👭 СПИСОК ПРИГЛАШЕНИЙ\n\n';
        let count = 0;
        
        for (const [friend, data] of Object.entries(invites)) {
            count++;
            text += `${count}. 👤 Приглашён: @${friend}\n`;
            text += `   Пригласила: ${data.invitedByName}\n`;
            text += `   Статус: ${data.status === 'pending' ? '⏳ Ожидает' : '✅ Подтверждено'}\n`;
            text += `   🕐 ${new Date(data.invitedAt).toLocaleString()}\n\n`;
        }
        
        if (count === 0) text = '📭 Пока нет приглашений';
        bot.sendMessage(msg.chat.id, text);
    } catch(e) {
        bot.sendMessage(msg.chat.id, '📭 Пока нет приглашений');
    }
});

// ===== СЕРВЕР =====
const server = http.createServer((req, res) => res.end('Bot running'));
server.listen(8080, () => console.log('✅ Сервер на 8080'));
console.log('🚀 БОТ ЗАПУЩЕН! ВСЕ КНОПКИ РАБОТАЮТ!');
console.log('🌐 Сайт ретрита: ' + SITE_URL);