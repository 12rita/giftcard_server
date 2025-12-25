// Bot handlers setup
export function setupBotHandlers(bot, pool, countrySelection) {

    // Upload command - show country selection
    bot.onText(/\/upload/, (msg) => {
        const chatId = msg.chat.id;
        if (countrySelection) {
            countrySelection.showCountrySelection(chatId);
        } else {
            bot.sendMessage(chatId, 'Выберите страну');
        }
    });

    // Command to check selected country
    bot.onText(/\/mycountry/, (msg) => {
        const chatId = msg.chat.id;
        if (countrySelection) {
            const selected = countrySelection.getSelectedCountry(chatId);
            if (selected) {
                bot.sendMessage(chatId, `Выбранная страна: *${selected}*`, { parse_mode: 'Markdown' });
            } else {
                bot.sendMessage(chatId, 'Страна не выбрана. Используйте /upload для выбора.');
            }
        }
    });

   
}
