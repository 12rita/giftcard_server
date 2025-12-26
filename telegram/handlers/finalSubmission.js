export const createFinalSubmissionHandler = (bot, userStates, {
    saveForm,
    getUserIdFromPhone,
    showCountrySelection,
    getPhoneNumber
}) => {
    const onError = async ({errorMessage, responseText, query, chatId,}) => {
        const errorText = errorMessage
            ? `❌ *Ошибка:* ${errorMessage}\n\n${responseText}`
            : `❌ *Ошибка при сохранении*\n\n${responseText}`;

        if (query) {
            const msgObj = query.msg || query.message;
            const isInline = !!query.inline_message_id;

            if (isInline) {
                try {
                    await bot.editMessageText(errorText, {
                        inline_message_id: query.inline_message_id,
                        parse_mode: 'Markdown'
                    });
                } catch (error) {
                    await bot.sendMessage(chatId, errorText, {parse_mode: 'Markdown'});
                }
            } else if (msgObj && msgObj.chat && msgObj.message_id) {
                try {
                    await bot.editMessageText(errorText, {
                        chat_id: msgObj.chat.id,
                        message_id: msgObj.message_id,
                        parse_mode: 'Markdown'
                    });
                } catch (error) {
                    await bot.sendMessage(chatId, errorText, {parse_mode: 'Markdown'});
                }
            } else {
                await bot.sendMessage(chatId, errorText, {parse_mode: 'Markdown'});
            }
        } else {
            await bot.sendMessage(chatId, errorText, {parse_mode: 'Markdown'});
        }
    };

    const onSuccess = async ({query, responseText, chatId}) => {
        // Add "Add another" button
        const keyboard = {
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: '➕ Добавить ещё',
                        callback_data: 'add_another'
                    }
                ]]
            }
        };

        if (query) {
            const msgObj = query.msg || query.message;
            const isInline = !!query.inline_message_id;

            if (isInline) {
                try {
                    await bot.editMessageText(responseText, {
                        inline_message_id: query.inline_message_id,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard.reply_markup
                    });
                } catch (error) {
                    await bot.sendMessage(chatId, responseText, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard.reply_markup
                    });
                }
            } else if (msgObj && msgObj.chat && msgObj.message_id) {
                try {
                    await bot.editMessageText(responseText, {
                        chat_id: msgObj.chat.id,
                        message_id: msgObj.message_id,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard.reply_markup
                    });
                } catch (error) {
                    await bot.sendMessage(chatId, responseText, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard.reply_markup
                    });
                }
            } else {
                await bot.sendMessage(chatId, responseText, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard.reply_markup
                });
            }
        } else {
            await bot.sendMessage(chatId, responseText, {
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });
        }
    };

    // Helper function to handle final submission
    const handleFinalSubmission = async (chatId, query = null, msg = null) => {
        const state = userStates.get(chatId) || {};
        // Format date as m-yyyy (0-indexed, e.g., "2-2024" for March 2024, "11-2024" for December)
        // Subtract 1 from month to make it 0-indexed (January = 0, December = 11)
        const monthZeroIndexed = parseInt(state.selectedMonth) - 1;
        const dateStr = `${monthZeroIndexed}-${state.selectedYear}`;
        
        // Store values from mentionOptions (e.g., 'anayan', 'velichko')
        const mentions = state.selectedPeople?.join(',') || '';

        const monthNames = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        const monthName = monthNames[parseInt(state.selectedMonth) - 1];

        const countryName = state.selectedCountryName || state.selectedCountry;
        let responseText = `✅ *Данные сохранены:*\n\n`;
        responseText += `🌍 Страна: *${countryName}*\n`;
        responseText += `📆 Год: *${state.selectedYear}*\n`;
        responseText += `📅 Месяц: *${monthName}*\n`;
        responseText += `📸 Фото: *${state.photos?.length || 0}*\n`;
        if (state.comment) {
            responseText += `📝 Комментарий: *${state.comment}*\n`;
        }
        if (mentions) {
            responseText += `👥 Люди: *${mentions}*\n`;
        }


        try {
            // Get phone number from state (stored during phone input) or from query/message
            const phoneNumber = state.phoneNumber || query?.from?.phone_number || msg?.from?.phone_number;

            if (!phoneNumber) {
                await onError({
                    errorMessage: 'Номер телефона не найден. Убедитесь, что номер телефона доступен в Telegram.',
                    chatId,
                    query,
                    responseText
                });
                userStates.delete(chatId);
                return;
            }

            // Get user ID from phone number
            const userId = await getUserIdFromPhone(phoneNumber);

            
            // Photos are already downloaded and stored as base64 in state.photos
            // Just use them directly (no need to download again)
            const pictures = state.photos || [];

            // Prepare form data - use country code for database
            const formData = {
                dateTime: dateStr,
                country: state.selectedCountry, // This is now the country code
                description: state.comment || '',
                mentions: mentions,
                files: pictures,
                owner_id: userId
            };

            // Save to database
            await saveForm(formData, () => onError({
                responseText,
                chatId,
                query,
                errorMessage: ''
            }), () => onSuccess({query, chatId, responseText}));

        } catch (error) {
            console.error('Error in handleFinalSubmission:', error);
            await onError({errorMessage: error.message, responseText, chatId, query});
            // Clear state on error
            userStates.delete(chatId);
        } finally {
            // Save phone number before clearing state for "add another" functionality
            const currentState = userStates.get(chatId) || {};
            // const phoneNumber = currentState.phoneNumber || state.phoneNumber;
            
            // Clear state after successful submission
            // Phone number will be retrieved from database if user clicks "add another"
            userStates.delete(chatId);
        }
    };

    // Handle "add another" - reset state but keep phone number
    const handleAddAnother = async (chatId) => {
        // Get phone number from current state or database
        let phoneNumber = null;
        const currentState = userStates.get(chatId);
        if (currentState?.phoneNumber) {
            phoneNumber = currentState.phoneNumber;
        } else {
            try {
                phoneNumber = await getPhoneNumber(chatId);
            } catch (error) {
                console.error('Error getting phone number for add another:', error);
            }
        }

        // Clear all state except phone number
        userStates.set(chatId, phoneNumber ? { phoneNumber } : {});

        // Show country selection again
        await showCountrySelection(chatId);
    };

    return {
        handleFinalSubmission,
        handleAddAnother
    };
};

