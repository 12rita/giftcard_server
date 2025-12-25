export const monthSelect = (bot) => {
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    const handleMonthSelect = async ({data, userStates, chatId, query, isInline}) => {
        // Handle month selection
        const month = data.replace('month_select_', '');
        const state = userStates.get(chatId) || {};
        state.selectedMonth = month;
        userStates.set(chatId, state);


        const monthName = monthNames[parseInt(month) - 1];


        await bot.answerCallbackQuery(query.id, {
            text: `Выбран месяц: ${monthName}`,
            show_alert: false
        });

        state.photos = [];
        state.comment = '';
        state.selectedPeople = [];
        state.step = 'photo_upload'; // Track current step
        userStates.set(chatId, state);

        await bot.answerCallbackQuery(query.id, {
            text: 'Теперь загрузите фотографии',
            show_alert: false
        });

        // Show photo upload prompt (without buttons - buttons will appear in "Отправьте ещё" message)
        const countryName = state.selectedCountryName || state.selectedCountry;
        const responseText = `✅ Страна: *${countryName}*\n📆 Год: *${state.selectedYear}*\n📅 Месяц: *${monthName}*\n\n📸 *Загрузите фотографии*\n\nОтправьте одну или несколько фотографий.`;

        const msgProps = {
            parse_mode: 'Markdown'
        }

        if (isInline) {
            try {
                await bot.editMessageText(responseText, {
                    inline_message_id: query.inline_message_id,
                   ...msgProps
                });
            } catch (error) {
                console.error('Error editing inline message:', error);
                await bot.sendMessage(chatId, responseText, msgProps);
            }
        } else {
            const msg = query.msg || query.message;
            if (msg && msg.chat && msg.message_id) {
                try {
                    await bot.editMessageText(responseText, {
                        chat_id: msg.chat.id,
                        message_id: msg.message_id,
                        ...msgProps
                    });
                } catch (error) {
                    console.error('Error editing message:', error);
                    await bot.sendMessage(chatId, responseText, msgProps);
                }
            } else {
                await bot.sendMessage(chatId, responseText, msgProps);
            }
        }
    }
    return {handleMonthSelect}
}
