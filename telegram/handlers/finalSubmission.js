export const createFinalSubmissionHandler = (bot, userStates, {saveForm, getUserIdFromPhone}, {downloadPhotoAsBase64}) => {
    // Helper function to handle final submission
    const handleFinalSubmission = async (chatId, query = null, msg = null) => {
        const state = userStates.get(chatId) || {};

        // Format date from year and month
        const dateStr = `${state.selectedYear}-${state.selectedMonth.padStart(2, '0')}-01`;
        const mentions = state.selectedPeople?.join(',') || '';

        const monthNames = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        const monthName = monthNames[parseInt(state.selectedMonth) - 1];

        let responseText = `✅ *Данные сохранены:*\n\n`;
        responseText += `🌍 Страна: *${state.selectedCountry}*\n`;
        responseText += `📆 Год: *${state.selectedYear}*\n`;
        responseText += `📅 Месяц: *${monthName}*\n`;
        responseText += `📸 Фото: *${state.photos?.length || 0}*\n`;
        if (state.comment) {
            responseText += `📝 Комментарий: *${state.comment}*\n`;
        }
        if (mentions) {
            responseText += `👥 Люди: *${mentions}*\n`;
        }

        const onError = async (errorMessage) => {
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
                        await bot.sendMessage(chatId, errorText, { parse_mode: 'Markdown' });
                    }
                } else if (msgObj && msgObj.chat && msgObj.message_id) {
                    try {
                        await bot.editMessageText(errorText, {
                            chat_id: msgObj.chat.id,
                            message_id: msgObj.message_id,
                            parse_mode: 'Markdown'
                        });
                    } catch (error) {
                        await bot.sendMessage(chatId, errorText, { parse_mode: 'Markdown' });
                    }
                } else {
                    await bot.sendMessage(chatId, errorText, { parse_mode: 'Markdown' });
                }
            } else {
                await bot.sendMessage(chatId, errorText, { parse_mode: 'Markdown' });
            }
        };

        const onSuccess = async () => {
            if (query) {
                const msgObj = query.msg || query.message;
                const isInline = !!query.inline_message_id;

                if (isInline) {
                    try {
                        await bot.editMessageText(responseText, {
                            inline_message_id: query.inline_message_id,
                            parse_mode: 'Markdown'
                        });
                    } catch (error) {
                        await bot.sendMessage(chatId, responseText, { parse_mode: 'Markdown' });
                    }
                } else if (msgObj && msgObj.chat && msgObj.message_id) {
                    try {
                        await bot.editMessageText(responseText, {
                            chat_id: msgObj.chat.id,
                            message_id: msgObj.message_id,
                            parse_mode: 'Markdown'
                        });
                    } catch (error) {
                        await bot.sendMessage(chatId, responseText, { parse_mode: 'Markdown' });
                    }
                } else {
                    await bot.sendMessage(chatId, responseText, { parse_mode: 'Markdown' });
                }
            } else {
                await bot.sendMessage(chatId, responseText, { parse_mode: 'Markdown' });
            }
        };

        try {
            // Get phone number from query or message
            const phoneNumber = query?.from?.phone_number || msg?.from?.phone_number;
            if (!phoneNumber) {
                await onError('Номер телефона не найден. Убедитесь, что номер телефона доступен в Telegram.');
                userStates.delete(chatId);
                return;
            }

            // Get user ID from phone number
            const userId = await getUserIdFromPhone(phoneNumber);

            // Download all photos and convert to base64
            const pictures = [];
            if (state.photos && state.photos.length > 0) {
                for (const fileId of state.photos) {
                    try {
                        const photoData = await downloadPhotoAsBase64(fileId);
                        pictures.push(photoData);
                    } catch (error) {
                        console.error(`Error downloading photo ${fileId}:`, error);
                        // Continue with other photos
                    }
                }
            }

            // Prepare form data
            const formData = {
                dateTime: dateStr,
                country: state.selectedCountry,
                description: state.comment || '',
                mentions: mentions,
                files: pictures,
                owner_id: userId
            };

            // Save to database
            await saveForm(formData, () => onError(), () => onSuccess());

        } catch (error) {
            console.error('Error in handleFinalSubmission:', error);
            await onError(error.message);
        } finally {
            // Clear state after submission
            userStates.delete(chatId);
        }
    };

    return {
        handleFinalSubmission
    };
};

