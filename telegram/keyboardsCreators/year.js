// Create year selection keyboard
export const createYearKeyboard = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    // Show only previous years (last 10 years up to current year)
    for (let i = currentYear - 10; i <= currentYear; i++) {
        years.push(i);
    }

    const keyboard = [];
    // 3 years per row
    for (let i = 0; i < years.length; i += 3) {
        const row = [];
        for (let j = 0; j < 3 && i + j < years.length; j++) {
            row.push({
                text: years[i + j].toString(),
                callback_data: `year_select_${years[i + j]}`
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
