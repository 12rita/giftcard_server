import format from "pg-format";
import {phoneToEmailMap} from "../../static/consts/phoneToEmail.js";
import {emailsWhitelist} from "../../static/consts/emailsWhitelist.js";

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
    const getUserIdFromPhone = async (phoneNumber) => {
        return new Promise((resolve, reject) => {
            if (!phoneNumber) {
                reject(new Error('Phone number not provided'));
                return;
            }

            // Normalize phone number (remove +, spaces, etc.)
            const normalizedPhone = phoneNumber.replace(/[+\s-()]/g, '');
            
            // Get email from phone mapping
            const email = phoneToEmailMap[normalizedPhone] || phoneToEmailMap[phoneNumber];
            
            if (!email) {
                reject(new Error(`Phone number ${phoneNumber} not found in mapping`));
                return;
            }

            // Check if email is whitelisted
            if (!emailsWhitelist.includes(email)) {
                reject(new Error(`Email ${email} is not whitelisted`));
                return;
            }

            // Get user ID from database
            pool.query(`SELECT id FROM users WHERE email = $1`, [email], (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (result.rows.length === 0) {
                    reject(new Error(`User with email ${email} not found in database`));
                    return;
                }
                
                resolve(result.rows[0].id);
            });
        });
    };

    return {
        saveFiles,
        saveForm,
        getUserIdFromPhone
    };
};

