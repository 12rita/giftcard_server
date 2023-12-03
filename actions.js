import format from "pg-format";


export const actions = ({pool}) => {
    const saveFiles = ({id, pictures, res}) => {
        const savedFiles = pictures.map(item => ([item.name, item.base64, id]));
        const insertFiles = `insert into photos("fileName", base64, messageId) values %L`;
        pool.query(format(insertFiles, savedFiles), (err, result) => {
            if (!err) {
                res.send(result.rows);
            } else {
                res.status(400).send({error: err.message}
                );
                console.log({error: err.message})
            }

        })
    }



    const saveMessage = ({message, res, req}) => {
        const {dateTime, country, description, files: pictures} = message;


        const query = `Select * from "messages"  where  country = '${country}' AND date = '${dateTime}' AND owner_id = '${req.session.user.id}'`;

        pool.query(query, (err, result) => {
            if (!err) {
                if (result.rows.length) {
                    const updateQuery = `UPDATE messages SET description='${description}' where id = '${result.rows[0].id}'`;
                    pool.query(updateQuery, () => {
                        if (!err) {

                            saveFiles({id: result.rows[0].id, pictures, res})
                        } else {
                            res.status(400).send({
                                message: err.message
                            });

                        }
                    })

                } else {
                    const insertQuery = `insert into messages(date, country, description, owner_id) 
                       values('${dateTime}', '${country}', '${description}', '${req.session.user.id}') RETURNING id`;

                    pool.query(insertQuery, (err, result) => {
                        if (!err) {

                            saveFiles({id: result.rows[0].id, pictures, res})
                        } else {
                            res.status(400).send({
                                message: err.message
                            });
                        }
                    })
                }

            } else {
                res.status(400).send({
                    message: err.message
                });
            }
        })


        pool.end
    }


    const getDetails = ({country, res, userId}) => {
        void pool.query(`Select * from details WHERE country='${country}'`).then((result) => {
            const messagesGroupByOwnerAndDate = {};
            result.rows.forEach(row => {
                const {
                    id,
                    date,
                    country,
                    description,
                    owner_id,
                    name,
                    email,
                    base64,
                    fileName,
                    picture
                } = row;


                if (!messagesGroupByOwnerAndDate[`${owner_id}_${date}`]) {
                    messagesGroupByOwnerAndDate[`${owner_id}_${date}`] = {
                        date,
                        country,
                        description,
                        name,
                        email,
                        picture,
                        id,
                        isDeletable: owner_id === userId,
                        files: [{name: fileName, base64}]
                    };
                } else {
                    messagesGroupByOwnerAndDate[`${owner_id}_${date}`].files.push({name: fileName, base64});
                }
            })

            return Object.values(messagesGroupByOwnerAndDate).sort((a, b) => {
                return new Date(a.date) - new Date(b.date);
            })

        }).then(messages => {

            Promise.all(messages.map(message => {
                const reactionsQuery = `Select * from reactions WHERE message_id='${message.id}'`;
                return pool.query(reactionsQuery)
            })).then(results => {
                messages.forEach((message, idx)=>{
                    const likes = results[idx].rows.filter((item) => item.reaction === 1).length;
                    const liked = !!results[idx].rows.find((item) => item.reaction === 1 && item.user_id === userId);
                    const disliked = !!results[idx].rows.find((item) => item.reaction === -1 && item.user_id === userId);
                    const dislikes = results[idx].rows.filter(item => item.reaction === -1).length;
                    message.likes = likes;
                    message.dislikes = dislikes;
                    message.isLiked = liked;
                    message.isDisliked = disliked;
                })
                res.send(messages)
            })


        }).catch(err => res.status(400).send({
            message: err.message
        }));
        pool.end
    }

    const saveReaction = ({message_id, user_id, reaction, res}) => {
        const insertQuery = `insert into reactions(message_id, user_id, reaction) 
                       values('${message_id}', '${user_id}', '${reaction}')  ON CONFLICT (message_id, user_id) DO UPDATE SET reaction = '${reaction}'`;

        pool.query(insertQuery, (err) => {
            if (!err) {

                res.status(200).send({
                    message: "Reaction saved"
                });
            } else {
                res.status(400).send({
                    message: err.message
                });
            }
        })
    }

    const deleteMessage = ({messageId, res}) =>{
        const deleteQuery = `UPDATE messages SET "isDeleted" = true where id = '${messageId}'`;
        pool.query(deleteQuery, (err) => {
            if (!err) {
                res.status(200).send({
                    message: "Message deleted"
                });
            } else {
                res.status(400).send({
                    message: err.message
                });
            }
        })
    }

    return {saveFiles, saveMessage, getDetails, saveReaction, deleteMessage}
}