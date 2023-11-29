import {pool} from "./static/connection.js";
import format from 'pg-format';
import {ROUTES} from "./static/routes.js";
import 'dotenv/config'
import {authRouter} from "./authRouter.js";
import {app, port} from "./static/appConfig.js";
import {actions} from "./actions.js";

authRouter({app, pool});
const helpers = actions({pool});

app.get(ROUTES.GEOGRAPHY, (req, res) => {

    pool.query(`Select count (distinct id) as total, "country" from "details" GROUP BY "country"`, (err, result) => {
        if (!err) {
            res.send(result.rows);
        }
    });
    pool.end;


})

app.get(ROUTES.DETAILS, (req, res) => {

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
    if (!req.session.user) return res.status(401).send({message: 'Не признаю вас в гриме'});
    const {dateTime, country, description, files: pictures} = req.body;

    helpers.saveMessage({message: {dateTime, country, description, files: pictures}, res, req})


})

app.post(ROUTES.REACTION, (req, res) => {
    if (!req.session.user) return res.status(401).send({message: 'Не признаю вас в гриме'});
    const {messageId, reaction} = req.body;
    helpers.saveReaction({message_id: messageId, user_id: req.session.user.id, reaction, res})

})

app.post(ROUTES.MESSAGE_DELETE, (req, res) => {
    if (!req.session.user) return res.status(401).send({message: 'Не признаю вас в гриме'});
    const {messageId} = req.body;
    helpers.deleteMessage({messageId, res})

})

void pool.connect()

app.listen(port, () => console.log(`Listening on port ${port}`));