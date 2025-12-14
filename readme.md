## changelog
update 2.0.2
solved a issue where sessids.find would not work when any of the sessions expired.

## functions

### main
```ts
require("sessids")(sessfile:string)
```

returns all functions below

### sessions

```js
require("sessids")().sessions
```

sessions is a express middleware that will allow you to use sessions.
it sets req.session to a object that will look something like this:
| name  | description |
|:------|------------:|
| set(property, value) | sets a value on the session |
| get(property) | gets a value from the session |
| delete(property) | deletes a value from the session |
| getAllProperties() | gets all properties with thier values and puts it into a object |
| destroy() | destroys a session instantly |
| id | id of the session |
| lifetime | lifetime of the session(will not refresh) |

**example**

```js
const express = require('express');
const app = express();

const sessids = require('sessids')();

app.use(sessids.sessions);

app.get('/get', (req, res) => {
    res.json(req.session.getAllProperties());
});

app.get('/set', (req, res) => {
    for (const key in req.query) {
        req.session.set(key, req.query[key]);
    }
    res.json(req.session.getAllProperties());
});

app.listen(3000, () => {
    console.log('Example app listening on port 3000!');
});
```

### configue

```ts
require("sessids")().configue(scope: string, value: any);
```

configure sets `scope` in the configuration to `value`

**scopes**

| scope        | default value | description | notes |
|:-------------|:-------------:|------------:|:-----:|
| lifetime     | 86400         | the lifetime of all sessions created after setting this value ||
| sessfile     |"sessions.json"| the file used for storing sessions, will automatically be changed when calling const sessids = require('sessids')("`value`");|**do not change yourself**|

### session
```ts
(require("sessids")().session: class constructor(data?: object, lifetime?: number, id?: string) {}:{
    lifetime: number,
    storeddata: object,
    id: string,
    update: function() updates this session in the file,
    destory: function() destroys this session,
    data: {
        set: function(scope:string, value:any) updates value in this session,
        get: function(scope:string) gets value in this session,
        remove: function(scope:string) removes value in this session
    }
})
```

### find
```ts
require("sessids")().find(search: {
    id?: string | undefined;
    data?: {
        value: any;
    } | undefined;
});
return:session[]
```

searches for the session meeting the requirements
| name | usage |
|:-----|------:|
| id   | search for a session with that session id |
| data | a object any value in there will be required to also be the value in the object |

## full examples
### login screen example
1. create a new directory

bash/ps
```bash
mkdir loginexample
```
2. cd into the directory

bash/ps/cmd
```bash
cd loginexample
```
3. initialize the directory

bash/ps/cmd
```bash
npm init -y
```
4. install sessids and express

bash/ps/cmd
```bash
npm i sessids express 
```

5. require sessids and express

index.js
```js
const express = require('express');
const app = express();

const sessids = require('sessids')();
```
6. initialize server

index.js
```js
const express = require('express');
const app = express();

const sessids = require('sessids')();

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
```
7. creating statics

index.js
```js
const express = require('express');
const app = express();

const sessids = require('sessids')();

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

app.use(express.static("public"));
```
8. create the public directory

bash/ps
```bash
mkdir public
cd public
```
9. create a new file in public: login.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>example login page</title>
</head>
<body>
    <form action="submitlogin" method="post">
        <label for="username">username: </label><input name="username" id="username">
        <label for="password">password: </label><input name="password" id="password" type="password">
        <input type="submit">
    </form>
</body>
</html>
```
10. setting up login callback

bash/ps/cmd
```bash
cd ../
npm i body-parser
```

index.js
```js
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
});

app.use(express.static("public"));

app.listen(3000, () => {
    console.log("example login system up and running!");
});
```
11. try it out

bash/ps/cmd
```bash
node index.js
```

[go to localhost:3000's login page](http://localhost:3000/login.html)

you will see a new file in root directory called sessions.json,
after you have logged in, you will see it looks something like this:
```json
{
    "sessions": [
        {
            "id": "w20nYhiPZ93fIyaUCbp7DETLquvjeMX!Q5l8ONKt46VAoGgBxkRsdFrJzHScW1mGMuWovgsfdymZ78Y3Tjea1EU2xC6SpKhcA0IVlqJHNP594k!rnFbQDwBiXLzOtR",
            "data": {
                "username": "test",
                "password": "test"
            },
            "lifetime": 86300
        }
    ]
}
```

12. improve user experience

index.js
```js
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
```