import {pool} from "./static/connection.js";
import {ROUTES} from "./static/routes.js";
import 'dotenv/config'
import {authRouter} from "./authRouter.js";
import {app, port} from "./static/appConfig.js";
import {actions} from "./actions.js";
import {emailsWhitelist} from "./static/emailsWhitelist.js";

authRouter({app, pool});
const helpers = actions({pool});

app.get(ROUTES.GEOGRAPHY, (req, res) => {

    pool.query(`Select "mentions", "country", "owner_id" from "details"`, (err, result) => {
        if (!err) {
            const countries = {}
            result.rows.forEach((row) => {
                const {mentions, country, owner_id} = row;
                if (!countries[country]) {
                    countries[country] = {mentions: [owner_id]}
                }
                mentions?.split(',')?.forEach((mention) => {
                    if (!countries[country].mentions.includes(mention)) {
                        countries[country].mentions.push(mention)
                    }
                })

            })

            const resultCountries = Object.keys(countries).map((country) => {
                return {
                    country,
                    total: countries[country].mentions.length
                }
            })
            res.send(resultCountries);
        }
    });
    pool.end;


})

app.get(ROUTES.DETAILS, (req, res) => {
    if (!req.session.user || !emailsWhitelist.includes(req.session.user.email)) return res.status(401).send({message: 'Не признаю вас в гриме'});
    const country = req.query.country;
    if (!country) {
        res.status(400).send({
            message: 'Please provide country name!'
        });
    } else {
        helpers.getDetails({country, res, userId: req.session.user?.id})
    }


})


app.post(ROUTES.MESSAGE_SAVE, (req, res) => {
    if (!req.session.user || !emailsWhitelist.includes(req.session.user.email)) return res.status(401).send({message: 'Не признаю вас в гриме'});
    const {dateTime, country, description, files: pictures, mentions} = req.body;

    helpers.saveMessage({message: {dateTime, country, description, mentions, files: pictures}, res, req})


})

app.post(ROUTES.REACTION, (req, res) => {
    if (!req.session.user || !emailsWhitelist.includes(req.session.user.email)) return res.status(401).send({message: 'Не признаю вас в гриме'});
    const {reactions} = req.body;
    helpers.saveReaction({reactions, user_id: req.session.user.id, res})

})

app.post(ROUTES.MESSAGE_DELETE, (req, res) => {
    if (!req.session.user || !emailsWhitelist.includes(req.session.user.email)) return res.status(401).send({message: 'Не признаю вас в гриме'});
    const {messageId} = req.body;
    helpers.checkExist({messageId, res, req, callback: helpers.deleteMessage})


    // helpers.deleteMessage({messageId, res})

})

app.post(ROUTES.DESCRIPTION_EDIT, (req, res) => {
    if (!req.session.user || !emailsWhitelist.includes(req.session.user.email)) return res.status(401).send({message: 'Не признаю вас в гриме'});
    const {messageId, description} = req.body;
    helpers.checkExist({messageId, res, req, callback: helpers.editDescription, description})


});


app.post(ROUTES.MENTIONS_EDIT, (req, res) => {
    if (!req.session.user || !emailsWhitelist.includes(req.session.user.email)) return res.status(401).send({message: 'Не признаю вас в гриме'});
    const {messageId, mentions} = req.body;
    helpers.checkExist({messageId, res, req,callback: helpers.editMentions, mentions})


})

void pool.connect()

app.listen(port, 'localhost', () => console.log(`Listening on port ${port}`));