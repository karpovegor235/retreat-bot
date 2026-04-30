const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8376903942:AAMm2T5QaAFQbRh_uivhf7-11-ZH9S-D_zQ';
const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, '✨ Бот работает! Напиши /help');
});

console.log('Бот запущен');