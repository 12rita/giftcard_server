// Create paginated inline keyboard for countries
export const createCountryKeyboard = (countries, page = 0, itemsPerPage = 10) => {
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const pageCountries = countries.slice(start, end);
    const totalPages = Math.ceil(countries.length / itemsPerPage);

    const keyboard = [];

    // Add country buttons (2 per row)
    for (let i = 0; i < pageCountries.length; i += 2) {
        const row = [];
        // Handle both object format {code, name} and string format
        const country1 = pageCountries[i];
        const country1Name = typeof country1 === 'string' ? country1 : country1.name;
        const country1Code = typeof country1 === 'string' ? country1 : country1.code;
        
        row.push({
            text: country1Name,
            callback_data: `country_select_${country1Code}`
        });
        if (pageCountries[i + 1]) {
            const country2 = pageCountries[i + 1];
            const country2Name = typeof country2 === 'string' ? country2 : country2.name;
            const country2Code = typeof country2 === 'string' ? country2 : country2.code;
            
            row.push({
                text: country2Name,
                callback_data: `country_select_${country2Code}`
            });
        }
        keyboard.push(row);
    }

    // Add navigation buttons
    const navRow = [];
    if (page > 0) {
        navRow.push({
            text: '◀️ Назад',
            callback_data: `country_page_${page - 1}`
        });
    }
    if (page < totalPages - 1) {
        navRow.push({
            text: 'Вперёд ▶️',
            callback_data: `country_page_${page + 1}`
        });
    }
    if (navRow.length > 0) {
        keyboard.push(navRow);
    }

    // Add search button
    keyboard.push([{
        text: '🔍 Поиск (нажмите @botname)',
        switch_inline_query_current_chat: ''
    }]);

    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
}
