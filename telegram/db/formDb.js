import format from "pg-format";
import {isPhoneInWhitelist as checkPhoneInWhitelist} from "../../static/db/whitelistHelpers.js";

export const createFormDb = (pool) => {
    const saveFiles = async ({id, pictures, onSuccess, onError}) => {
        const savedFiles = pictures.map(item => ([item.name, item.base64, id]));
        const insertFiles = `insert into photos("fileName", base64, messageId) values %L`;
        pool.query(format(insertFiles, savedFiles), (err) => {
            if (!err) {
                onSuccess();
            } else {
                onError();
                console.error({error: err.message})
            }
        })
    };

    const saveForm = async (state, onError, onSuccess) => {
        const {dateTime, country, description, mentions, files: pictures, owner_id} = state;

        if (!owner_id) {
            onError();
            return;
        }

        // Check if message already exists for this user, country, and date
        const query = `Select * from "messages"  where  country = $1 AND date = $2 AND owner_id = $3 AND "isDeleted" != true`;
        
        pool.query(query, [country, dateTime, owner_id], (err, result) => {
            if (err) {
                console.error('Error checking existing message:', err);
                onError();
                return;
            }

            if (result.rows.length) {
                // Update existing message
                const messageId = result.rows[0].id;
                const updateQuery = `UPDATE messages SET "description"=$1, "mentions"=$2 WHERE id = $3`;
                
                pool.query(updateQuery, [description, mentions, messageId], (updateErr) => {
                    if (updateErr) {
                        console.error('Error updating message:', updateErr);
                        onError();
                        return;
                    }

                    // Delete old photos and insert new ones
                    pool.query(`DELETE FROM photos WHERE "messageId" = $1`, [messageId], (deleteErr) => {
                        if (deleteErr) {
                            console.error('Error deleting old photos:', deleteErr);
                        }

                        if (pictures && pictures.length > 0) {
                            saveFiles({id: messageId, pictures, onSuccess, onError});
                        } else {
                            onSuccess();
                        }
                    });
                });
            } else {
                // Insert new message
                const insertQuery = `insert into messages(date, country, description, owner_id, mentions) 
                   values($1, $2, $3, $4, $5) RETURNING id`;

                pool.query(insertQuery, [dateTime, country, description, owner_id, mentions], (err, result) => {
                    if (err) {
                        console.error('Error inserting message:', err);
                        onError();
                        return;
                    }

                    if (pictures && pictures.length > 0) {
                        saveFiles({id: result.rows[0].id, pictures, onSuccess, onError});
                    } else {
                        onSuccess();
                    }
                });
            }
        });
    };

    // Helper function to get user ID from Telegram phone number
    // All users in the users table are considered whitelisted
    const getUserIdFromPhone = async (phoneNumber) => {
        return new Promise((resolve, reject) => {
            if (!phoneNumber) {
                reject(new Error('Phone number not provided'));
                return;
            }

            // Normalize phone number (remove +, spaces, etc.)
            const normalizedPhone = phoneNumber.replace(/[+\s-()]/g, '');
            
            // Get user from database by phone number (if they exist, they're whitelisted)
            const query = `SELECT id FROM users WHERE phone_number = $1`;
            pool.query(query, [normalizedPhone], (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (result.rows.length === 0) {
                    reject(new Error(`Phone number ${phoneNumber} not found in database`));
                    return;
                }
                
                resolve(result.rows[0].id);
            });
        });
    };

    // Check if phone number is in whitelist (uses cached whitelist)
    const isPhoneInWhitelist = checkPhoneInWhitelist;

    // Add user to users table if they're in whitelist (used when phone is verified)
    const addUserIfWhitelisted = async (phoneNumber) => {
        return new Promise((resolve, reject) => {
            if (!phoneNumber) {
                reject(new Error('Phone number not provided'));
                return;
            }

            // Normalize phone number
            const normalizedPhone = phoneNumber.replace(/[+\s-()]/g, '');

            // First, get email from whitelist table
            const whitelistQuery = `SELECT email FROM whitelist WHERE phone_number = $1`;
            pool.query(whitelistQuery, [normalizedPhone], (err, whitelistResult) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (whitelistResult.rows.length === 0) {
                    reject(new Error(`Phone number ${phoneNumber} not in whitelist`));
                    return;
                }

                const email = whitelistResult.rows[0].email;

                // Check if user already exists
                const checkQuery = `SELECT id, phone_number FROM users WHERE email = $1 OR phone_number = $2`;
                pool.query(checkQuery, [email, normalizedPhone], (err, userResult) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (userResult.rows.length > 0) {
                        // User exists, update phone number if needed
                        const user = userResult.rows[0];
                        if (!user.phone_number) {
                            const updateQuery = `UPDATE users SET phone_number = $1 WHERE id = $2 RETURNING id`;
                            pool.query(updateQuery, [normalizedPhone, user.id], (updateErr) => {
                                if (updateErr) {
                                    reject(updateErr);
                                    return;
                                }
                                resolve(user.id);
                            });
                        } else {
                            resolve(user.id);
                        }
                    } else {
                        // User doesn't exist, create new user (only if in whitelist)
                        const insertQuery = `INSERT INTO users (email, phone_number) VALUES ($1, $2) RETURNING id`;
                        pool.query(insertQuery, [email, normalizedPhone], (insertErr, insertResult) => {
                            if (insertErr) {
                                reject(insertErr);
                                return;
                            }
                            resolve(insertResult.rows[0].id);
                        });
                    }
                });
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
                
                // If user exists in table, they're whitelisted
                resolve(result.rows.length > 0);
            });
        });
    };

    // Get phone number for a Telegram chatId from users table
    const getPhoneNumber = async (chatId) => {
        return new Promise((resolve, reject) => {
            if (!chatId) {
                reject(new Error('chatId is required'));
                return;
            }

            const query = `SELECT phone_number FROM users WHERE telegram_chat_id = $1`;

            pool.query(query, [chatId], (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (result.rows.length === 0) {
                    resolve(null); // No phone number found
                    return;
                }
                
                resolve(result.rows[0].phone_number);
            });
        });
    };

    return {
        saveFiles,
        saveForm,
        getUserIdFromPhone,
        getPhoneNumber,
        isPhoneInWhitelist,
        addUserIfWhitelisted
    };
};


