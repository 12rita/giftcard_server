// Bot handlers setup
export function setupBotHandlers(bot, pool, countrySelection) {

    // Matches "/echo [whatever]"
    bot.onText(/\/echo (.+)/, (msg, match) => {
        // 'msg' is the received Message from Telegram
        // 'match' is the result of executing the regexp above on the text content
        // of the message
        // console.log({msg})

        const chatId = msg.chat.id;
        const resp = match[1]; // the captured "whatever"

        // send back the matched "whatever" to the chat
        bot.sendMessage(chatId, resp);
    });

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

    // Listen for any kind of message. There are different kinds of
    // messages.
    bot.on('message', (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;
        // console.log(msg)
        // send a message to the chat acknowledging receipt of their message
        // bot.sendMessage(chatId, 'Received your message');
    });
   
}
