// Create people selection keyboard
export const createPeopleKeyboard = (people, selectedPeople = [], page = 0, itemsPerPage = 10) => {
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const pagePeople = people.slice(start, end);
    const totalPages = Math.ceil(people.length / itemsPerPage);

    const keyboard = [];

    // Add people buttons (2 per row) with checkmarks for selected
    for (let i = 0; i < pagePeople.length; i += 2) {
        const row = [];
        const person1 = pagePeople[i];
        const isSelected1 = selectedPeople.includes(person1);
        row.push({
            text: `${isSelected1 ? '✅ ' : ''}${person1}`,
            callback_data: `person_toggle_${person1.replace(/[|\\]/g, '\\$&')}`
        });
        if (pagePeople[i + 1]) {
            const person2 = pagePeople[i + 1];
            const isSelected2 = selectedPeople.includes(person2);
            row.push({
                text: `${isSelected2 ? '✅ ' : ''}${person2}`,
                callback_data: `person_toggle_${person2.replace(/[|\\]/g, '\\$&')}`
            });
        }
        keyboard.push(row);
    }

    // Add navigation buttons
    const navRow = [];
    if (page > 0) {
        navRow.push({
            text: '◀️ Назад',
            callback_data: `people_page_${page - 1}`
        });
    }
    if (page < totalPages - 1) {
        navRow.push({
            text: 'Вперёд ▶️',
            callback_data: `people_page_${page + 1}`
        });
    }
    if (navRow.length > 0) {
        keyboard.push(navRow);
    }

    // Add finish button if people are selected
    if (selectedPeople.length > 0) {
        keyboard.push([{
            text: `✅ Завершить выбор (${selectedPeople.length})`,
            callback_data: 'people_finish'
        }]);
    }

    // Add skip button
    keyboard.push([{
        text: '⏭️ Пропустить',
        callback_data: 'people_skip'
    }]);

    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
};
