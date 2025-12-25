// Inline query handler - for search functionality

import {COUNTRIES_WITH_CODES} from "../../static/consts/countries.js";
import {createCountryKeyboard, createYearKeyboard} from "../keyboardsCreators/index.js";

export const countrySearch = (bot) => {
    // Use static list of all countries with codes
    const allCountries = COUNTRIES_WITH_CODES;

    // Get all countries (no database needed)
    function getAllCountries() {
        return allCountries;
    }


    // Search countries by query (supports both Russian and English)
    const searchCountries = (countries, query) => {
        if (!query) return countries.slice(0, 50); // Limit to 50 for inline results

        const lowerQuery = query.toLowerCase().trim();
        const results = [];
        const seen = new Set();

        // Search in Russian names
        countries.forEach(country => {
            if (country.toLowerCase().includes(lowerQuery) && !seen.has(country)) {
                results.push(country);
                seen.add(country);
            }
        });


        return results.slice(0, 50);
    }

    const handleCountrySelect = async ({data, userStates, chatId, query, isInline}) => {
        // Get country code from callback data
        const countryCode = data.replace(/^country_select_/, '');
        
        // Find country name by code
        const country = allCountries.find(c => c.code === countryCode);
        const countryName = country?.name || countryCode;
        
        const state = userStates.get(chatId) || {};
        state.selectedCountry = countryCode; // Store country code
        state.selectedCountryName = countryName; // Store name for display
        userStates.set(chatId, state);

        await bot.answerCallbackQuery(query.id, {
            text: `Выбрана страна: ${countryName}`,
            show_alert: false
        });

        // Prepare the response message - show year selection first
        const responseText = `✅ Вы выбрали страну: *${countryName}*\n\n📆 Выберите год:`;
        const yearKeyboard = createYearKeyboard();

        // For inline messages, use inline_message_id
        if (isInline) {
            try {
                await bot.editMessageText(responseText, {
                    inline_message_id: query.inline_message_id,
                    parse_mode: 'Markdown',
                    reply_markup: yearKeyboard.reply_markup
                });
            } catch (error) {
                console.error('Error editing inline message:', error);
                // Fallback: send new message
                await bot.sendMessage(chatId, responseText, {
                    parse_mode: 'Markdown',
                    reply_markup: yearKeyboard.reply_markup
                });
            }
        } else {
            // For regular messages, try to find message info
            // Check various possible property names
            const msg = query.msg || query.message;

            if (msg && msg.chat && msg.message_id) {
                try {
                    await bot.editMessageText(responseText, {
                        chat_id: msg.chat.id,
                        message_id: msg.message_id,
                        parse_mode: 'Markdown',
                        reply_markup: yearKeyboard.reply_markup
                    });
                } catch (error) {
                    console.error('Error editing message:', error);
                    // Fallback: send new message
                    await bot.sendMessage(chatId, responseText, {
                        parse_mode: 'Markdown',
                        reply_markup: yearKeyboard.reply_markup
                    });
                }
            } else {
                // No message info available, send a new message
                await bot.sendMessage(chatId, responseText, {
                    parse_mode: 'Markdown',
                    reply_markup: yearKeyboard.reply_markup
                });
            }
        }
    }

    const handleCountryPage = async ({data, isInline, query}) => {
        const page = parseInt(data.replace('country_page_', ''));
        const allCountries = getAllCountries();
        const keyboard = createCountryKeyboard(allCountries, page);

        if (isInline) {
            await bot.editMessageReplyMarkup(keyboard.reply_markup, {
                inline_message_id: query.inline_message_id
            });
        } else {
            const msg = query.msg || query.message;
            if (msg && msg.chat && msg.message_id) {
                await bot.editMessageReplyMarkup(keyboard.reply_markup, {
                    chat_id: msg.chat.id,
                    message_id: msg.message_id
                });
            }
        }

        await bot.answerCallbackQuery(query.id);
    }

    // Function to show country selection menu
    async function showCountrySelection(chatId) {
        try {
            const countries = getAllCountries();

            if (countries.length === 0) {
                await bot.sendMessage(chatId, 'Список стран пуст.');
                return;
            }

            const keyboard = createCountryKeyboard(countries, 0);

            // Get bot username for inline query hint
            const botInfo = await bot.getMe();
            const botUsername = botInfo.username || 'your_bot';

            await bot.sendMessage(
                chatId,
                `🌍 Выберите страну (всего: ${countries.length})\n\n` +
                `💡 *Совет*: Для быстрого поиска начните вводить @${botUsername} в поле ввода сообщения`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard.reply_markup
                }
            );
        } catch (error) {
            console.error('Error showing country selection:');
            await bot.sendMessage(chatId, 'Произошла ошибка при загрузке списка стран.');
        }
    }

    bot.on('inline_query', async (inlineQuery) => {
        const searchQuery = inlineQuery.query || '';

        try {
            const countries = getAllCountries();
            // For search, use country names
            const countryNames = countries.map(c => typeof c === 'string' ? c : c.name);
            const matchedCountries = searchCountries(countryNames, searchQuery);
            
            // Convert back to country objects for results
            const matchedCountryObjects = matchedCountries.map(name => {
                const country = countries.find(c => (typeof c === 'string' ? c : c.name) === name);
                return country || name;
            });

            if (matchedCountries.length === 0 && searchQuery) {
                // If no results, show a helpful message
                await bot.answerInlineQuery(inlineQuery.id, [{
                    type: 'article',
                    id: 'no_results',
                    title: 'Страны не найдены',
                    description: `Попробуйте другой запрос`,
                    message_text: 'Страны не найдены. Попробуйте другой запрос.'
                }], {
                    cache_time: 1
                });
                return;
            }

            const results = matchedCountryObjects.map((country, index) => {
                // Handle both object format {code, name} and string format
                const countryName = typeof country === 'string' ? country : country.name;
                const countryCode = typeof country === 'string' ? null : country.code;
                
                // If we have a code, use it; otherwise use name (for backward compatibility)
                const callbackData = countryCode || countryName;

                return {
                    type: 'article',
                    id: `country_${index}_${Date.now()}_${Math.random()}`,
                    title: countryName,
                    description: `Выбрать ${countryName}`,
                    input_message_content: {
                        message_text: `🌍 Выбрана страна: ${countryName}`
                    },
                    reply_markup: {
                        inline_keyboard: [[
                            {
                                text: `✅ Подтвердить`,
                                callback_data: `country_select_${callbackData}`
                            }
                        ]]
                    }
                };
            });

            await bot.answerInlineQuery(inlineQuery.id, results, {
                cache_time: 300,
                is_personal: false
            });
        } catch (error) {
            console.error('Error in inline query:', error);
            try {
                await bot.answerInlineQuery(inlineQuery.id, [], {
                    cache_time: 1
                });
            } catch (e) {
                console.error('Error answering inline query:');
            }
        }
    });

    return {handleCountrySelect, handleCountryPage, showCountrySelection}
}
