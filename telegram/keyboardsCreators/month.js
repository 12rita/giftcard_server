// Create month selection keyboard
export const createMonthKeyboard = () => {
    const months = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    const keyboard = [];
    // 3 months per row
    for (let i = 0; i < months.length; i += 3) {
        const row = [];
        for (let j = 0; j < 3 && i + j < months.length; j++) {
            const monthNum = (i + j + 1).toString().padStart(2, '0');
            row.push({
                text: months[i + j],
                callback_data: `month_select_${monthNum}`
            });
        }
        keyboard.push(row);
    }

    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
};
