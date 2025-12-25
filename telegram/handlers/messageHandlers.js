export const createMessageHandlers = (bot, userStates, {handlePhotosUpload, handleCommentSelect, handleFinalSubmission, handlePhoneInput, showCountrySelection}) => {
    // Message handler for photos and comments
    const setupMessageHandler = () => {
        bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const state = userStates.get(chatId);

            if (!state || !state.step) {
                return; // Not in our flow
            }

            try {
                if (state.step === 'phone_input') {
                    await handlePhoneInput({msg, userStates, chatId, showCountrySelection});
                } else if (state.step === 'photo_upload') {
                    await handlePhotosUpload({state, msg, chatId, userStates});
                } else if (state.step === 'comment') {
                    await handleCommentSelect({userStates, state, msg, chatId, handleFinalSubmission})
                }
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });
    };

    // Callback query handler - for button clicks
    const setupCallbackHandler = (handlers) => {
        const {
            handleCountrySelect,
            handleCountryPage,
            handleYearSelect,
            handleMonthSelect,
            handlePhotosSelect,
            handleCommentSkip,
            handlePeopleSelect,
            handlePeoplePagination
        } = handlers;

        bot.on('callback_query', async (query) => {
            const data = query.data;

            // Get chat ID - use query.from.id (works for both inline and regular)
            const chatId = query.from.id;
            const isInline = !!query.inline_message_id;

            try {
                if (data.startsWith('country_select_')) {
                    await handleCountrySelect({data, isInline, query, chatId, userStates});
                } else if (data.startsWith('country_page_')) {
                    await handleCountryPage({data, query, isInline});
                } else if (data.startsWith('year_select_')) {
                    await handleYearSelect({data, isInline, query, chatId, userStates});
                } else if (data.startsWith('month_select_')) {
                    await handleMonthSelect({data, isInline, query, chatId, userStates});
                } else if (data === 'photos_done') {
                    await handlePhotosSelect({userStates, chatId, data, query});
                } else if (data === 'comment_skip') {
                    await handleCommentSkip({userStates, handleFinalSubmission, chatId, query});
                } else if (data.startsWith('person_toggle_')) {
                    await handlePeopleSelect({userStates, data, chatId, query});
                } else if (data.startsWith('people_page_')) {
                    await handlePeoplePagination({data, query, chatId, userStates});
                } else if (data === 'people_finish' || data === 'people_skip') {
                    // Finish people selection and submit
                    await bot.answerCallbackQuery(query.id, {
                        text: data === 'people_skip' ? 'Люди не выбраны' : 'Люди выбраны',
                        show_alert: false
                    });
                    await handleFinalSubmission(chatId, query);
                }
            } catch (error) {
                console.error('Error handling callback query:', error);
                await bot.answerCallbackQuery(query.id, {
                    text: 'Произошла ошибка',
                    show_alert: true
                });
            }
        });
    };

    return {
        setupMessageHandler,
        setupCallbackHandler
    };
};

