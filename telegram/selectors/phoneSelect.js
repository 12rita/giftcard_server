export const phoneSelect = (bot, {isPhoneInWhitelist, addUserIfWhitelisted}) => {
    const handlePhoneInput = async ({msg, userStates, chatId, showCountrySelection}) => {
        const state = userStates.get(chatId) || {};

        // Check if contact was shared (msg.contact) or phone number in text
        let phoneNumber = null;

        if (msg.contact) {
            // User shared contact via button
            phoneNumber = msg.contact.phone_number;
        } else if (msg.text) {
            // User typed phone number manually
            // Validate it looks like a phone number
            const text = msg.text.trim();
            if (/^[\d\s\+\-\(\)]+$/.test(text) && text.replace(/\D/g, '').length >= 7) {
                phoneNumber = text;
            } else {
                await bot.sendMessage(chatId, 'Пожалуйста, отправьте корректный номер телефона или используйте кнопку "Поделиться номером телефона".');
                return;
            }
        }

        if (!phoneNumber) {
            await bot.sendMessage(chatId, 'Пожалуйста, нажмите кнопку "Поделиться номером телефона" или отправьте номер вручную.');
            return;
        }
        // Normalize phone number (remove +, spaces, etc.)
        const normalizedPhone = phoneNumber.replace(/[+\s-()]/g, '');

        // Check if phone number is in whitelist
        try {
            const inWhitelist = await isPhoneInWhitelist(normalizedPhone);
            if (!inWhitelist) {
                await bot.sendMessage(chatId, '❌ Ваш номер телефона не найден в списке разрешённых. Обратитесь к администратору для получения доступа.');
                return;
            }

            // Add user to users table if whitelisted (creates user if doesn't exist)
            await addUserIfWhitelisted(normalizedPhone);
        } catch (error) {
            console.error('Error checking phone whitelist or adding user:', error);
            await bot.sendMessage(chatId, '❌ Ошибка при проверке номера телефона. Попробуйте позже или обратитесь к администратору.');
            return;
        }

        // Phone number and telegram_chat_id are now saved in users table via addUserIfWhitelisted

        // Store phone number in state
        state.phoneNumber = normalizedPhone;
        state.step = 'country_selection';
        userStates.set(chatId, state);
        // Remove the keyboard
        await bot.sendMessage(chatId, `✅ Номер телефона подтверждён: ${normalizedPhone}\n\nТеперь выберите страну:`, {
            reply_markup: {
                remove_keyboard: true
            }
        });

        // Move to country selection
        await showCountrySelection(chatId);
    };

    const showPhoneRequest = async (chatId) => {
        const phoneKeyboard = {
            reply_markup: {
                keyboard: [[
                    {
                        text: '📱 Поделиться номером телефона',
                        request_contact: true
                    }
                ]],
                one_time_keyboard: true,
                resize_keyboard: true
            }
        };

        await bot.sendMessage(
            chatId,
            `📱 *Для начала работы необходимо предоставить номер телефона*\n\nНажмите кнопку ниже, чтобы поделиться номером телефона, или отправьте номер вручную.`,
            {
                parse_mode: 'Markdown',
                reply_markup: phoneKeyboard.reply_markup
            }
        );
    };

    return {
        handlePhoneInput,
        showPhoneRequest
    };
};

