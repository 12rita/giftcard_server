export const photosSelect = (bot, {downloadPhotoAsBase64}) =>{
    const handlePhotosUpload = async ({state, userStates, chatId, msg}) =>{
        // Handle photo upload
        if (msg.photo && msg.photo.length > 0) {
            // Get the largest photo
            const photo = msg.photo[msg.photo.length - 1];
            const fileId = photo.file_id;

            // Download photo immediately to avoid file_id expiration
            try {
                const photoData = await downloadPhotoAsBase64(fileId);
                
                if (!state.photos) {
                    state.photos = [];
                }
                // Store the downloaded photo data (base64) instead of file_id
                state.photos.push(photoData);
                userStates.set(chatId, state);
            } catch (error) {
                console.error(`Error downloading photo immediately:`, error);
                await bot.sendMessage(chatId, '❌ Ошибка при загрузке фото. Попробуйте отправить фото снова.');
                return;
            }

            // Clear previous timeout if exists
            if (state.photoTimeout) {
                clearTimeout(state.photoTimeout);
            }

            // Use shorter timeout for media groups (photos sent together)
            // Longer timeout for single photos (to batch multiple single photos)
            const timeoutDelay = msg.media_group_id ? 300 : 1000;

            // Set timeout to send message after delay
            state.photoTimeout = setTimeout(async () => {
                const currentState = userStates.get(chatId);
                if (currentState && currentState.step === 'photo_upload') {
                    const photoCount = currentState.photos?.length || 0;
                    const photoKeyboard = {
                        reply_markup: {
                            inline_keyboard: [[
                                {
                                    text: '✅ Завершить загрузку фото',
                                    callback_data: 'photos_done'
                                }
                            ]]
                        }
                    };
                    await bot.sendMessage(chatId, `✅ Добавлено фото: ${photoCount}\n\nОтправьте ещё фото или нажмите кнопку ниже:`, {
                        reply_markup: photoKeyboard.reply_markup
                    });
                    // Clear timeout reference
                    if (currentState.photoTimeout) {
                        delete currentState.photoTimeout;
                    }
                }
            }, timeoutDelay);

            userStates.set(chatId, state);
        } else {
            // Not a photo
            await bot.sendMessage(chatId, 'Пожалуйста, отправьте фотографию.');
        }
    }

    const handlePhotosSelect = async ({userStates, query, chatId})=>{
        // Handle photo upload completion
        const state = userStates.get(chatId) || {};
        const photoCount = state.photos?.length || 0;

        // Validate that at least one photo is uploaded
        if (photoCount === 0) {
            await bot.answerCallbackQuery(query.id, {
                text: 'Пожалуйста, загрузите хотя бы одно фото',
                show_alert: true
            });
            return;
        }

        // Clear any pending photo timeout
        if (state.photoTimeout) {
            clearTimeout(state.photoTimeout);
            delete state.photoTimeout;
        }

        await bot.answerCallbackQuery(query.id, {
            text: `Загружено фото: ${photoCount}`,
            show_alert: false
        });

        // Move to comment step
        state.step = 'comment';
        userStates.set(chatId, state);

        const responseText = `📝 *Добавьте комментарий (необязательно)*\n\nОтправьте текстовое сообщение с комментарием или нажмите "Пропустить".`;
        const commentKeyboard = {
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: '⏭️ Пропустить комментарий',
                        callback_data: 'comment_skip'
                    }
                ]]
            }
        };

        const msg = query.msg || query.message;
        if (msg && msg.chat && msg.message_id) {
            try {
                await bot.editMessageText(responseText, {
                    chat_id: msg.chat.id,
                    message_id: msg.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: commentKeyboard.reply_markup
                });
            } catch (error) {
                await bot.sendMessage(chatId, responseText, {
                    parse_mode: 'Markdown',
                    reply_markup: commentKeyboard.reply_markup
                });
            }
        } else {
            await bot.sendMessage(chatId, responseText, {
                parse_mode: 'Markdown',
                reply_markup: commentKeyboard.reply_markup
            });
        }
    }

    return {handlePhotosSelect, handlePhotosUpload}
}
