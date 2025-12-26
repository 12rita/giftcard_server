import { countriesData } from './countries_ru.js';

// Extract countries with codes
export const COUNTRIES_WITH_CODES = Object.entries(countriesData.Names).map(([code, name]) => ({
    code,
    name
}));

// Get country code by name
export const getCountryCode = (countryName) => {
    const country = COUNTRIES_WITH_CODES.find(c => c.name === countryName);
    return country?.code || null;
};

// Get country name by code
export const getCountryName = (countryCode) => {
    const country = COUNTRIES_WITH_CODES.find(c => c.code === countryCode);
    return country?.name || null;
};

// Get all country names (for backward compatibility)
export const ALL_COUNTRIES = COUNTRIES_WITH_CODES.map(c => c.name);

// For search - create a map
export const COUNTRY_MAP = new Map();
COUNTRIES_WITH_CODES.forEach(({code, name}) => {
    COUNTRY_MAP.set(name.toLowerCase(), {code, name});
});
