export const phoneSelect = (bot) => {
    const handlePhoneInput = async ({msg, userStates, chatId, showCountrySelection}) => {
        const state = userStates.get(chatId) || {};
        
        // Check if phone number is provided in the message
        const phoneNumber = msg.contact?.phone_number || msg.text;
        
        if (!phoneNumber) {
            await bot.sendMessage(chatId, 'Пожалуйста, отправьте номер телефона или поделитесь контактом.');
            return;
        }

        // Normalize phone number (remove +, spaces, etc.)
        const normalizedPhone = phoneNumber.replace(/[+\s-()]/g, '');
        
        // Store phone number in state
        state.phoneNumber = normalizedPhone;
        state.step = 'country_selection';
        userStates.set(chatId, state);

        await bot.sendMessage(chatId, `✅ Номер телефона сохранён: ${normalizedPhone}\n\nТеперь выберите страну:`);
        
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
            `📱 *Пожалуйста, укажите номер телефона*\n\nВы можете:\n• Нажать кнопку "Поделиться номером телефона"\n• Или отправить номер вручную`,
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

