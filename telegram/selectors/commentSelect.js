import {createPeopleKeyboard} from "../keyboardsCreators/index.js";
import {mentionOptions} from "../../static/consts/people.js";

export const commentSelect = (bot)=>{
    const getAllPeople = () => {
        return mentionOptions.map(person => person.label);
    }

    const handleCommentSelect = async ({msg, userStates, state, chatId, handleFinalSubmission})=>{
        // Handle comment input
        if (msg.text) {
            state.comment = msg.text;
            state.step = 'people_selection';
            userStates.set(chatId, state);

            // Move to people selection
            try {
                const people = getAllPeople();
                if (people.length === 0) {
                    await bot.sendMessage(chatId, 'Комментарий сохранён. Список людей пуст, завершаем.');
                    await handleFinalSubmission(chatId, null, msg);
                } else {
                    const keyboard = createPeopleKeyboard(people, state.selectedPeople || [], 0);
                    await bot.sendMessage(chatId, `✅ Комментарий сохранён!\n\n👥 *Выберите людей на фото*\n\nВыберите людей, которые есть на фотографиях. Можно выбрать несколько.`, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard.reply_markup
                    });
                }
            } catch (error) {
                console.error('Error getting people:', error);
                await bot.sendMessage(chatId, 'Комментарий сохранён. Ошибка при загрузке списка людей, завершаем.');
                await handleFinalSubmission(chatId, null, msg);
            }
        }
    }

    const handleCommentSkip = async ({userStates, chatId, query, handleFinalSubmission })=>{
        // Skip comment and move to people selection
        const state = userStates.get(chatId) || {};
        state.step = 'people_selection';
        userStates.set(chatId, state);

        await bot.answerCallbackQuery(query.id, {
            text: 'Комментарий пропущен',
            show_alert: false
        });

        // Show people selection
        try {
            const people = getAllPeople();
            if (people.length === 0) {
                // No people in database, skip to final submission
                await handleFinalSubmission(chatId, query);
            } else {
                const keyboard = createPeopleKeyboard(people, state.selectedPeople || [], 0);
                const responseText = `👥 *Выберите людей на фото*\n\nВыберите людей, которые есть на фотографиях. Можно выбрать несколько.`;

                const msg = query.msg || query.message;
                if (msg && msg.chat && msg.message_id) {
                    try {
                        await bot.editMessageText(responseText, {
                            chat_id: msg.chat.id,
                            message_id: msg.message_id,
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
            }
        } catch (error) {
            console.error('Error getting people:', error);
            await bot.sendMessage(chatId, 'Ошибка при загрузке списка людей. Пропускаем этот шаг.');
            await handleFinalSubmission(chatId, query);
        }
    }

    return {handleCommentSelect, handleCommentSkip}
}
