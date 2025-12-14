import { readFileSync, writeFileSync, existsSync, write } from 'fs';
import type {Request, Response} from "express";

const config = {
    lifetime: 86400,
    /**
     * @intentional using a non-absolute path because otherwise it would live inside of node_modules/sessids
     */
    sessfile: "sessions.json"
};

const loadedsessions:Session[] = [];

function readSessions() {
    try {
        return readFileSync(config.sessfile, { encoding: 'utf-8' });
    } catch {
        const sessions = JSON.stringify({
            sessions: []
        });
        writeFileSync(config.sessfile, sessions);
        return sessions;
    }
}

export class Session {
    /**
     * how long the session is still alive for
     */
    lifetime:number;
    /**
     * the data stored in the object. should not be accessed except for reading purposes or for inpermanent changes
     * as this is not saved
     */
    storeddata: {
        [key: string]: any
    };
    /**
     * the id of the session
     */
    id: string;
    /**
     * updates the session
     */
    private update: () => void;
    /**
     * regenerates the session id
     */
    private genid: () => void;
    /**
     * destroys the session. this 
     * - fully deletes all data in the session
     * - removes it from the sessions file
     * 
     * **do not call any function on this session after this as that will recreate the session**
     * @example session.destroy() // delete the session
     */
    destroy: () => void;
    data: {
        /**
         * sets a value on the session
         * @example session.data.set("username", "SweatyCircle439")
         * @param scope the property you would like to change
         * @param value the value you want to set the property to
         */
        set: (scope: string, value: any) => void;
        /**
         * gets a value on the session
         * @example session.data.get("username") // returns "SweatyCircle439"
         * @param scope the property you would like to read
         * @returns the value of that property on the session
         */
        get: (scope: string) => any;
        /**
         * deletes a value from the session
         * @example session.data.remove("username") // logs the user out without destroying the session
         * @param scope the property on the session you want to remove
         */
        remove: (scope: string) => void;
    }
    /**
     * ticks the clock on the session
     */
    private wait: () => Promise<void>

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
            const sessids = readSessions();
            const sessions = JSON.parse(sessids).sessions;
            function set() {
                for (const index in sessions) {
                    const session = sessions[index];
                    if (session.id == write.id) {
                        sessions[index] = write;
                        return writeFileSync(config.sessfile, JSON.stringify({sessions: sessions}, null, 4));
                    }
                }
                return writeFileSync(
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
                const id = Array.from(asciiString);
                for (let i = id.length - 1; i > 0; i--) {
                    let j = Math.floor(Math.random() * (i + 1));
                    //@ts-ignore where did you even get string | undefined from all of these are strings
                    [id[i], id[j]] = [id[j], id[i]];
                }
                const backid = Array.from(asciiString);
                for (let i = backid.length - 1; i > 0; i--) {
                    let j = Math.floor(Math.random() * (i + 1));
                    //@ts-ignore where did you even get string | undefined from all of these are strings
                    [backid[i], backid[j]] = [backid[j], backid[i]];
                }
                this.id = id.join("");
                this.id += backid.join("");
                const sessids = readSessions();
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
            writeFileSync(config.sessfile, JSON.stringify({sessions: JSON.parse(readSessions()).sessions.filter((session:any) => session.id !== this.id)}, null, 4));
            for (const key in this.storeddata) {
                if (Object.hasOwnProperty.call(this.storeddata, key)) {
                    this.storeddata[key] = undefined;
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
                delete this.storeddata[scope];
                this.update();
            }
        }
        this.wait = async() => {
            while (this.lifetime > 0) {
                await new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve(undefined);
                    }, 1000);
                });
                this.lifetime--;
                this.update();
            }
            this.destroy();
        }
        this.wait();
        loadedsessions.push(this);
    }
}

function findsession(
    search: { id?: string; data?: {[key: string]: string}; }
) {
    const results = loadedsessions;
    return results.filter((session) => {
        if (search.data) {
            for (const key in search.data) {
                if (session.storeddata) {
                    if (session.storeddata[key] !== search.data[key]) {
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

function sessions(req:Request, res:Response, next:any) {
    let sessionid:string|undefined;
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
    function checksession(sessionid:string|undefined):Session {
        if (sessionid == undefined) {
            const sess = new Session();
            res.cookie("sessid", sess.id);
            return sess;
        }else {
            const results = findsession({id: sessionid});
            return results[0] ? results[0] : checksession(undefined);
        }
    }
    const sess: Session = checksession(sessionid);
    req.session = Object.freeze(
        {
            set: sess.data.set,
            get: sess.data.get,
            getAllProperties: () => {
                const result = {} as {
                    [key: string]: any
                };
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

function configure(scope:"sessfile"|"lifetime", value:any){
    if (typeof config[scope] == typeof value) {
        //@ts-ignore any error here is user error
        config[scope] = value;
    }else {
        throw new Error(`${value} is not a valid value for ${scope}`);
    }
}

export default (sessfile = config.sessfile) => {
    if (!existsSync(sessfile)) {
        writeFileSync(
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
        for (const sess of JSON.parse(readFileSync(config.sessfile, "utf-8")).sessions) {
            new Session(sess.data, sess.lifetime, sess.id);
        }
    } catch {
        writeFileSync(
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
        Session: Session,
        configure: configure,
        find: findsession
    }
};