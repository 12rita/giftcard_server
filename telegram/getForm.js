import {countrySearch, yearSelect, monthSelect, photosSelect, commentSelect, peopleSelect, phoneSelect} from "./selectors/index.js";
import {createFormDb} from "./db/formDb.js";
import {createPhotoUtils} from "./utils/photoUtils.js";
import {createFinalSubmissionHandler} from "./handlers/finalSubmission.js";
import {createMessageHandlers} from "./handlers/messageHandlers.js";

export function setupGetForm(bot, pool) {
    // In-memory store for user states (country selection)
    const userStates = new Map();

    // Initialize selectors
    const {handlePhoneInput, showPhoneRequest} = phoneSelect(bot);
    const {handleCountrySelect, handleCountryPage, showCountrySelection} = countrySearch(bot);
    const {handleYearSelect} = yearSelect(bot);
    const {handleMonthSelect} = monthSelect(bot);
    const {handlePhotosSelect, handlePhotosUpload} = photosSelect(bot);
    const {handleCommentSkip, handleCommentSelect} = commentSelect(bot);
    const {handlePeoplePagination, handlePeopleSelect} = peopleSelect(bot);

    // Initialize database operations
    const {saveForm, getUserIdFromPhone} = createFormDb(pool);

    // Initialize photo utilities
    const {downloadPhotoAsBase64} = createPhotoUtils(bot);

    // Initialize final submission handler
    const {handleFinalSubmission} = createFinalSubmissionHandler(
        bot,
        userStates,
        {saveForm, getUserIdFromPhone},
        {downloadPhotoAsBase64}
    );

    // Setup message handlers
    const {setupMessageHandler, setupCallbackHandler} = createMessageHandlers(
        bot,
        userStates,
        {handlePhotosUpload, handleCommentSelect, handleFinalSubmission, handlePhoneInput, showCountrySelection}
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

    // Override showCountrySelection to first ask for phone
    const originalShowCountrySelection = showCountrySelection;
    const showCountrySelectionWithPhone = async (chatId) => {
        const state = userStates.get(chatId);
        // If phone is already set, show country selection directly
        if (state?.phoneNumber) {
            await originalShowCountrySelection(chatId);
        } else {
            // Otherwise, ask for phone first
            state.step = 'phone_input';
            userStates.set(chatId, state);
            await showPhoneRequest(chatId);
        }
    };


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

