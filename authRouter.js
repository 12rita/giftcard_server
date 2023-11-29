import {ROUTES} from "./static/routes.js";
import {OAuth2Client} from "google-auth-library";
import {emailsWhitelist} from "./static/emailsWhitelist.js";


export const authRouter = ({app, pool})=> {
    const authClient = new OAuth2Client(process.env.CLIENT_ID, process.env.CLIENT_SECRET,
        'postmessage');

    app.get(ROUTES.LOGOUT, (req, res) => {

        req.session.destroy((err) => {
            if (err) {
                console.log('Error while destroying session:', err);
            } else {

                res.status(200).send({message: 'logout'})
            }
        });
    });


    app.post(ROUTES.LOGIN, async (req, res) => {
        const {token} = req.body;
        const {tokens} = await authClient.getToken(token); // exchange code for tokens

        const ticket = await authClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.CLIENT_ID
        });
        if (ticket) {
            const {name, email, picture} = ticket.getPayload();
            const isWhitelisted = emailsWhitelist.includes(email);
            pool.query(`Select * from "users" where email = '${email}'`, (err, result) => {
                if (!err) {
                    if (result.rows.length) {
                        // const {id, name, email} = result.rows[0];
                        req.session.user = {id: result.rows[0].id, email, name, picture};
                        res.status(200)

                        res.json({name, email, picture, isWhitelisted})
                    } else {
                        let insertQuery = `insert into users(name, email, picture)
                       values('${name}', '${email}', '${picture}') ON CONFLICT (email) DO NOTHING RETURNING id`;

                        pool.query(insertQuery, (err, result) => {

                            if (!err && !req.session.user) {

                                req.session.user = {id: result.rows[0].id, email, name, picture};

                                res.status(201)
                                res.json({name, email, picture, isWhitelisted})
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

            });


            pool.end;
        } else {
            res.status(400)
            res.json({error: 'Ваш токен какая-то хуйня, а не злоумышленник ли вы часом?'})
        }


    })


    app.get(ROUTES.USER, async (req, res) => {
            if (req.session.user) {
                const {name, email, picture} = req.session.user;
                const isWhitelisted = emailsWhitelist.includes(email);

                res.status(200).send({email, name, picture, isWhitelisted}) // User is authenticated, continue to next middleware
            } else {
                res.status(401).send({message: 'Не признаю вас в гриме'}); // User is not authenticated, redirect to login page
            }
        }
    )

}