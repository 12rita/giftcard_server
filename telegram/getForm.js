import {countrySearch, yearSelect, monthSelect, photosSelect, commentSelect, peopleSelect, phoneSelect} from "./selectors/index.js";
import {createFormDb} from "./db/formDb.js";
import {createPhotoUtils} from "./utils/photoUtils.js";
import {createFinalSubmissionHandler} from "./handlers/finalSubmission.js";
import {createMessageHandlers} from "./handlers/messageHandlers.js";

export function setupGetForm(bot, pool) {
    // In-memory store for user states (country selection)
    const userStates = new Map();

    // Initialize database operations first (needed by phoneSelect)
    const {saveForm, getUserIdFromPhone, getPhoneNumber, isPhoneInWhitelist, addUserIfWhitelisted} = createFormDb(pool);

    // Initialize selectors
    const {handlePhoneInput, showPhoneRequest} = phoneSelect(bot, {isPhoneInWhitelist, addUserIfWhitelisted});
    const {handleCountrySelect, handleCountryPage, showCountrySelection} = countrySearch(bot);
    const {handleYearSelect} = yearSelect(bot);
    const {handleMonthSelect} = monthSelect(bot);
    
    
    // Initialize photo utilities (needed by photosSelect)
    const {downloadPhotoAsBase64} = createPhotoUtils(bot);
    
    const {handlePhotosSelect, handlePhotosUpload} = photosSelect(bot, {downloadPhotoAsBase64});
    const {handleCommentSkip, handleCommentSelect} = commentSelect(bot);
    const {handlePeoplePagination, handlePeopleSelect} = peopleSelect(bot);

    // Override showCountrySelection to first ask for phone
    const originalShowCountrySelection = showCountrySelection;
    const showCountrySelectionWithPhone = async (chatId) => {
        const state = userStates.get(chatId) || {};
        
        // Check if phone is in current state
        if (state.phoneNumber) {
            await originalShowCountrySelection(chatId);
            return;
        }

        // Try to get phone number from database
        try {
            const savedPhoneNumber = await getPhoneNumber(chatId);
            if (savedPhoneNumber) {
                // Phone number found in database, use it
                state.phoneNumber = savedPhoneNumber;
                userStates.set(chatId, state);
                await originalShowCountrySelection(chatId);
            } else {
                // No phone number found, ask for it
                state.step = 'phone_input';
                userStates.set(chatId, state);
                await showPhoneRequest(chatId);
            }
        } catch (error) {
            console.error('Error getting phone number from database:', error);
            // On error, ask for phone number
            state.step = 'phone_input';
            userStates.set(chatId, state);
            await showPhoneRequest(chatId);
        }
    };

    // Initialize final submission handler (after showCountrySelectionWithPhone is defined)
    const {handleFinalSubmission, handleAddAnother} = createFinalSubmissionHandler(
        bot,
        userStates,
        {saveForm, getUserIdFromPhone, showCountrySelection: showCountrySelectionWithPhone, getPhoneNumber}
    );

    // Setup message handlers
    const {setupMessageHandler, setupCallbackHandler} = createMessageHandlers(
        bot,
        userStates,
        {handlePhotosUpload, handleCommentSelect, handleFinalSubmission, handlePhoneInput, showCountrySelection: showCountrySelectionWithPhone, handleAddAnother}
    );

    setupMessageHandler();
    setupCallbackHandler({
        handleCountrySelect,
        handleCountryPage,
        handleYearSelect,
        handleMonthSelect,
        handlePhotosSelect,
        handleCommentSkip,
        handlePeopleSelect,
        handlePeoplePagination
    });

    // Function to get selected country for a user
    function getSelectedCountry(chatId) {
        const state = userStates.get(chatId);
        return state?.selectedCountry || null;
    }

    // Function to get full selection (country, month, year)
    function getFullSelection(chatId) {
        const state = userStates.get(chatId);
        if (!state) return null;
        return {
            country: state.selectedCountry || null,
            month: state.selectedMonth || null,
            year: state.selectedYear || null,
            photos: state.photos || []
        };
    }

    // Function to clear user state
    function clearUserState(chatId) {
        userStates.delete(chatId);
    }

    return {
        showCountrySelection: showCountrySelectionWithPhone,
        getSelectedCountry,
        getFullSelection,
        clearUserState
    };
}

