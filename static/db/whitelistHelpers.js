// In-memory cache for whitelist (shared singleton)
let whitelistCache = {
    emails: new Set(),
    phones: new Set(),
    loaded: false
};

// Helper functions for checking whitelist status from database
// Uses in-memory cache for performance
export const createWhitelistHelpers = (pool) => {

    // Load whitelist from database into memory
    const loadWhitelistCache = async () => {
        return new Promise((resolve, reject) => {
            const query = `SELECT email, phone_number FROM whitelist`;
            pool.query(query, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }

                const emails = new Set();
                const phones = new Set();

                result.rows.forEach(row => {
                    if (row.email) {
                        emails.add(row.email.toLowerCase());
                    }
                    if (row.phone_number) {
                        // Normalize phone number
                        const normalized = row.phone_number.replace(/[+\s-()]/g, '');
                        phones.add(normalized);
                    }
                });

                whitelistCache = {
                    emails,
                    phones,
                    loaded: true
                };

                console.log(`Loaded whitelist cache: ${emails.size} emails, ${phones.size} phone numbers`);
                resolve(whitelistCache);
            });
        });
    };

    // Initialize cache on startup
    loadWhitelistCache().catch(err => {
        console.error('Error loading whitelist cache:', err);
    });

    // Check if email is in whitelist (uses cache, falls back to DB if cache not loaded)
    const isEmailInWhitelist = async (email) => {
        if (!email) {
            return false;
        }

        const emailLower = email.toLowerCase();

        // Use cache if loaded
        if (whitelistCache.loaded) {
            return whitelistCache.emails.has(emailLower);
        }

        // Fallback to database if cache not loaded yet
        return new Promise((resolve, reject) => {
            const query = `SELECT email FROM whitelist WHERE LOWER(email) = $1`;
            pool.query(query, [emailLower], (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result.rows.length > 0);
            });
        });
    };

    // Check if phone number is in whitelist (uses cache, falls back to DB if cache not loaded)
    const isPhoneInWhitelist = async (phoneNumber) => {
        if (!phoneNumber) {
            return false;
        }

        // Normalize phone number
        const normalizedPhone = phoneNumber.replace(/[+\s-()]/g, '');

        // Use cache if loaded
        if (whitelistCache.loaded) {
            return whitelistCache.phones.has(normalizedPhone);
        }

        // Fallback to database if cache not loaded yet
        return new Promise((resolve, reject) => {
            const query = `SELECT phone_number FROM whitelist WHERE phone_number = $1`;
            pool.query(query, [normalizedPhone], (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result.rows.length > 0);
            });
        });
    };

    // Check if email exists in users table (all users in table are whitelisted)
    const isEmailWhitelisted = async (email) => {
        return new Promise((resolve, reject) => {
            if (!email) {
                resolve(false);
                return;
            }

            const query = `SELECT id FROM users WHERE email = $1`;
            pool.query(query, [email], (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                resolve(result.rows.length > 0); // If user exists in table, they're whitelisted
            });
        });
    };

    return {
        isEmailWhitelisted,
        isEmailInWhitelist,
        isPhoneInWhitelist,
        loadWhitelistCache, // Expose refresh function
        getWhitelistCache: () => whitelistCache // Expose cache for debugging
    };
};

// Export standalone function for phone whitelist check (uses shared cache)
export const isPhoneInWhitelist = async (phoneNumber) => {
    if (!phoneNumber) {
        return false;
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/[+\s-()]/g, '');

    // Use cache if loaded
    if (whitelistCache.loaded) {
        return whitelistCache.phones.has(normalizedPhone);
    }

    // Fallback: return false if cache not loaded (shouldn't happen normally)
    console.warn('Whitelist cache not loaded for phone check');
    return false;
};

