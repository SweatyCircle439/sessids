const fs = require('node:fs');

const config = {
    lifetime: 86400,
    sessfile: "sessions.json"
};

const loadedsessions = [];

class session {
    constructor(data = {}, lifetime = config.lifetime, id = "") {
        this.lifetime = lifetime;
        this.storeddata = data;
        this.id = id;
        this.update = () => {
            const write = {
                id: this.id,
                data: this.storeddata,
                lifetime: this.lifetime
            }
            const sessids = fs.readFileSync(config.sessfile);
            const sessions = JSON.parse(sessids).sessions;
            function set() {
                for (const index in sessions) {
                    const session = sessions[index];
                    if (session.id == write.id) {
                        sessions[index] = write;
                        return fs.writeFileSync(config.sessfile, JSON.stringify({sessions: sessions}, null, 4));
                    }
                }
                return fs.writeFileSync(
                    config.sessfile,
                    JSON.stringify(
                        {
                            sessions: sessions
                                .concat(
                                    write
                                )
                        },
                        null,
                        4
                    )
                );
            }
            set();
        };
        this.genid = () =>{
            if (this.id == "") {
                let asciiString = "";
                for (let i = 65; i <= 90; i++) {
                    asciiString += String.fromCharCode(i);
                }
                for (let i = 97; i <= 122; i++) {
                    asciiString += String.fromCharCode(i);
                }
                for (let i = 48; i <= 57; i++) {
                    asciiString += String.fromCharCode(i);
                }
                asciiString += "!";
                this.id = Array.from(asciiString);
                for (let i = this.id.length - 1; i > 0; i--) {
                    let j = Math.floor(Math.random() * (i + 1));
                    [this.id[i], this.id[j]] = [this.id[j], this.id[i]];
                }
                const backid = Array.from(asciiString);
                for (let i = backid.length - 1; i > 0; i--) {
                    let j = Math.floor(Math.random() * (i + 1));
                    [backid[i], backid[j]] = [backid[j], backid[i]];
                }
                this.id = this.id.join("");
                this.id += backid.join("");
                const sessids = fs.readFileSync(config.sessfile);
                for (const session of JSON.parse(sessids).sessions) {
                    if (session.id == this.id) {
                        return this.genid();
                    }
                }
            }
            this.update();
        }
        this.genid();
        this.genid = () => {
            const error = new Error("this session already has a id");
            error.name = "ESET";
            throw error;
        }
        this.destroy = () => {
            fs.writeFileSync(config.sessfile, JSON.stringify({sessions: JSON.parse(fs.readFileSync(config.sessfile)).sessions.filter(session => session.id !== this.id)}, null, 4));
            for (const key in this) {
                if (Object.hasOwnProperty.call(this, key)) {
                    this[key] = undefined;
                }
            }
        }
        this.data = {
            set: (scope, value) => {
                this.storeddata[scope] = value;
                this.update();
            },
            get: (scope) => {
                return this.storeddata[scope];
            },
            remove: (scope) => {
                this.storeddata[scope] = undefined;
                this.update();
            }
        }
        this.waiting = async() => {
            while (this.lifetime > 0) {
                await new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve();
                    }, 1000);
                });
                this.lifetime--;
                this.update();
            }
            this.destroy();
        }
        this.waiting();
        loadedsessions.push(this);
    }
}

function findsession(
    /** @type {{id?: String, data?: {any: any}}} */
    search
) {
    const results = loadedsessions;
    return results.filter((session) => {
        if (search.data) {
            for (const key in search.data) {
                if (session.storeddata) {
                    if (!session.storeddata[key] == search.data[key]) {
                        return false;
                    }
                }else {
                    return false;
                }
            }
            if (search.id) {
                if (session.id == search.id) {
                    return true;
                }
            }else {
                return true;
            }
        }else if (session.id == search.id) {
            return true;
        }
        return false;
    });
}

function sessions(req, res, next) {
    let sessionid;
    if (req.headers.cookie) {
        const cookieArray = req.headers.cookie.split(';');
        cookieArray.forEach(cookie => {
            const [key, value] = cookie.trim().split('=');
            if (key == "sessid") {
                sessionid = value;
            }
        });
    } else {
        sessionid = undefined;
    }
    function checksession(sessionid) {
        if (sessionid == undefined) {
            const sess = new session();
            res.cookie("sessid", sess.id);
            return sess;
        }else {
            existent:if (true) {
                const results = findsession({id: sessionid});
                return results.length >= 1 ? results[0] : checksession(undefined);
            }
        }
    }
    /** @type {session} */
    const sess = checksession(sessionid);
    req.session = Object.freeze(
        {
            set: sess.data.set,
            get: sess.data.get,
            getAllProperties: () => {
                const result = {};
                for (const key in sess.storeddata) {
                    result[key] = sess.storeddata[key];
                }
                return Object.freeze(result);
            },
            delete: sess.data.remove,
            destroy: sess.destroy,
            id: sess.id,
            lifetime: sess.lifetime,
        }
    );
    return next();
}

function configure(scope, value){
    if (typeof config[scope] == typeof value) {
        config[scope] = value;
    }else {
        throw new Error(`${value} is not a valid value for ${scope}`);
    }
}

module.exports = (sessfile = config.sessfile) => {
    if (!fs.existsSync(sessfile)) {
        fs.writeFileSync(
            sessfile,
            JSON.stringify(
                {
                    sessions: []
                },
                null,
                4
            )
        );
    }
    configure("sessfile", sessfile);
    try {
        for (const sess of JSON.parse(fs.readFileSync(config.sessfile)).sessions) {
            new session(sess.data, sess.lifetime, sess.id);
        }
    } catch {
        fs.writeFileSync(
            sessfile,
            JSON.stringify(
                {
                    sessions: []
                },
                null,
                4
            )
        );
    }
    return {
        sessions: sessions,
        session: session,
        configure: configure,
        find: findsession
    }
};