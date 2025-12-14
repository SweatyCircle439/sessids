const express = require('express');
const app = express();

const bodyParser = require('body-parser');

const sessids = require('sessids')();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(sessids.sessions);

app.get('/', (req, res) => {
    res.json(req.session.getAllProperties());
});

app.get('/set', (req, res) => {
    for (const key in req.query) {
        req.session.set(key, req.query[key]);
    }
    res.json(req.session.getAllProperties());
});

app.post('/submitlogin', (req, res) => {
    req.session.set("username", req.body.username);
    req.session.set("password", req.body.password);
    res.redirect('/');
});

app.get('/submitlogin', (req, res) => {
    res.redirect('/');
});

app.use(express.static("public"));

app.listen(3000, () => {
    console.log("example login system up and running!");
});