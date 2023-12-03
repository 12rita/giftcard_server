import express from "express";
import cors from "cors";
import session from "express-session";
import ConnectPg from "connect-pg-simple";
import {pool} from "./connection.js";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";

const app = express(); //Строка 2

app.use(
    cors({
        origin: ["http://localhost:8080"],
        methods: "GET,POST,PUT,DELETE,OPTIONS",
    })
);
// express session
app.use(session({
    store: new (ConnectPg(session))({
        pool: pool,
        createTableIfMissing: true,
    }),
    saveUninitialized: false,
    secret: 'process.env.FOO_COOKIE_SECRET',
    resave: true,
    cookie: {maxAge: 30 * 24 * 60 * 60 * 1000}
}));

const port = process.env.PORT || 3000;


app.use(bodyParser.json({limit: '500mb'}));
app.use(cookieParser());

export {app, port};