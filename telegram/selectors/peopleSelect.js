import {createPeopleKeyboard} from "../keyboardsCreators/index.js";
import {mentionOptions} from "../../static/consts/people.js";

export const peopleSelect = (bot) => {
    const handlePeopleSelect = async ({data, userStates, chatId, query}) => {
        // Toggle person selection
        const person = data.replace('person_toggle_', '').replace(/\\(.)/g, '$1');
        const state = userStates.get(chatId) || {};
        if (!state.selectedPeople) {
            state.selectedPeople = [];
        }

        const index = state.selectedPeople.indexOf(person);
        if (index > -1) {
            state.selectedPeople.splice(index, 1);
        } else {
            state.selectedPeople.push(person);
        }
        userStates.set(chatId, state);

        // Refresh people keyboard
        try {
            // Use mentionOptions directly (with value and label), not just labels
            const keyboard = createPeopleKeyboard(mentionOptions, state.selectedPeople, 0);
            const responseText = `👥 *Выберите людей на фото*\n\nВыбрано: ${state.selectedPeople.length}`;

            const msg = query.msg || query.message;
            if (msg && msg.chat && msg.message_id) {
                try {
                    await bot.editMessageReplyMarkup(keyboard.reply_markup, {
                        chat_id: msg.chat.id,
                        message_id: msg.message_id
                    });
                } catch (error) {
                    await bot.editMessageText(responseText, {
                        chat_id: msg.chat.id,
                        message_id: msg.message_id,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard.reply_markup
                    });
                }
            }
            await bot.answerCallbackQuery(query.id);
        } catch (error) {
            console.error('Error refreshing people keyboard:', error);
            await bot.answerCallbackQuery(query.id);
        }
    }

    const handlePeoplePagination = async ({data, userStates, chatId, query}) => {
        // Handle people pagination
        const page = parseInt(data.replace('people_page_', ''));
        const state = userStates.get(chatId) || {};

        try {
            // Use mentionOptions directly (with value and label), not just labels
            const keyboard = createPeopleKeyboard(mentionOptions, state.selectedPeople || [], page);

            const msg = query.msg || query.message;
            if (msg && msg.chat && msg.message_id) {
                await bot.editMessageReplyMarkup(keyboard.reply_markup, {
                    chat_id: msg.chat.id,
                    message_id: msg.message_id
                });
            }
            await bot.answerCallbackQuery(query.id);
        } catch (error) {
            console.error('Error paginating people:', error);
            await bot.answerCallbackQuery(query.id);
        }
    }

    return {handlePeopleSelect, handlePeoplePagination}
}
