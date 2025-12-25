import {createMonthKeyboard} from "../keyboardsCreators/index.js";

export const yearSelect = (bot) => {
    const handleYearSelect = async ({data, userStates, chatId, query, isInline}) => {
        // Handle year selection
        const year = data.replace('year_select_', '');
        const state = userStates.get(chatId) || {};
        state.selectedYear = year;
        userStates.set(chatId, state);

        await bot.answerCallbackQuery(query.id, {
            text: `Выбран год: ${year}`,
            show_alert: false
        });

        // Show month selection
        const responseText = `✅ Страна: *${state.selectedCountry}*\n📆 Год: *${year}*\n\n📅 Выберите месяц:`;
        const monthKeyboard = createMonthKeyboard();

        if (isInline) {
            try {
                await bot.editMessageText(responseText, {
                    inline_message_id: query.inline_message_id,
                    parse_mode: 'Markdown',
                    reply_markup: monthKeyboard.reply_markup
                });
            } catch (error) {
                console.error('Error editing inline message:', error);
                await bot.sendMessage(chatId, responseText, {
                    parse_mode: 'Markdown',
                    reply_markup: monthKeyboard.reply_markup
                });
            }
        } else {
            const msg = query.msg || query.message;
            if (msg && msg.chat && msg.message_id) {
                try {
                    await bot.editMessageText(responseText, {
                        chat_id: msg.chat.id,
                        message_id: msg.message_id,
                        parse_mode: 'Markdown',
                        reply_markup: monthKeyboard.reply_markup
                    });
                } catch (error) {
                    console.error('Error editing message:', error);
                    await bot.sendMessage(chatId, responseText, {
                        parse_mode: 'Markdown',
                        reply_markup: monthKeyboard.reply_markup
                    });
                }
            } else {
                await bot.sendMessage(chatId, responseText, {
                    parse_mode: 'Markdown',
                    reply_markup: monthKeyboard.reply_markup
                });
            }
        }
    }
    return {handleYearSelect}
}
