import {existsSync, readFileSync, writeFileSync} from 'fs';
import type {Request, Response} from "express";
import './express';

type Config = {
    lifetime: number,
    sessfile: string
};

function readSessions(config: Config) {
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

function mkSessionClass<T extends Record<string, any>>(defaultData:Partial<T>, loadedSessions: any[], config: Config) {
    return class Session {
        /**
         * how long the session is still alive for
         */
        lifetime:number;
        /**
         * the data stored in the object. should not be accessed except for reading purposes or for inpermanent changes
         * as this is not saved
         */
        storeddata: Partial<T>;
        /**
         * the id of the session
         */
        id: string;
        /**
         * updates the session
         */
        readonly update: () => void;
        /**
         * regenerates the session id
         */
        readonly genid: () => void;
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
            set: <S extends keyof Partial<T>>(scope: S, value: Partial<T>[S]) => void;
            /**
             * gets a value on the session
             * @example session.data.get("username") // returns "SweatyCircle439"
             * @param scope the property you would like to read
             * @returns the value of that property on the session
             */
            get: <S extends keyof Partial<T>>(scope: S) => Readonly<Partial<T>[S]>;
            /**
             * deletes a value from the session
             * @example session.data.remove("username") // logs the user out without destroying the session
             * @param scope the property on the session you want to remove
             */
            remove: <S extends keyof Partial<T>>(scope: S) => void;
        }
        /**
         * ticks the clock on the session
         */
        readonly wait: () => Promise<void>

        constructor(data:Partial<T> = defaultData, lifetime = config.lifetime, id = "") {
            this.lifetime = lifetime;
            this.storeddata = data;
            this.id = id;
            this.update = () => {
                const write = {
                    id: this.id,
                    data: this.storeddata,
                    lifetime: this.lifetime
                }
                const sessids = readSessions(config);
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
                    const sessids = readSessions(config);
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
                writeFileSync(config.sessfile, JSON.stringify(
                    {
                        sessions:
                            JSON.parse(readSessions(config))
                                .sessions
                                .filter((session:any) => session.id !== this.id)
                    },
                    null,
                    4
                ));
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
                    return Object.freeze(this.storeddata[scope]);
                },
                remove: (scope) => {
                    delete this.storeddata[scope];
                    this.update();
                }
            }
            this.wait = async() => {
                while (this.lifetime > 0) {
                    await new Promise((resolve) => {
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
            loadedSessions.push(this);
        }
    }
}

function mkFindSession <T extends Record<string, any>> (
    loadedSessions: InstanceType<ReturnType<typeof mkSessionClass<T>>>[]
) {
    return function findSession(
        search: { id?: string; data?: Partial<T>; }
    ) {
        return (loadedSessions).filter((session) => {
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
}

function mkMiddleWare<T extends Record<string, any>>(
    Session: ReturnType<typeof mkSessionClass<T>>,
    findSession: ReturnType<typeof mkFindSession<T>>
) {
    return function sessions(req:Request, res:Response, next:any) {
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
        function checksession(sessionid:string|undefined): InstanceType<typeof Session> {
            if (sessionid == undefined) {
                const sess = new Session();
                res.cookie("sessid", sess.id);
                return sess;
            }else {
                const results = findSession({id: sessionid});
                return results[0] ? results[0] : checksession(undefined);
            }
        }
        const sess: InstanceType<typeof Session> = checksession(sessionid);
        req.session = Object.freeze(
            {
                set: sess.data.set,
                get: sess.data.get,
                getAllProperties: ():Readonly<Partial<T>> => {
                    const result = {} as Partial<T>;
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
}

function mkConfigure(config: Config) {
    return function configure<S extends keyof Config>(scope:S, value: Config[S]){
        if (config[scope] == typeof value) {
            config[scope] = value;
        }else {
            throw new Error(`${value} is not a valid value for ${scope}`);
        }
    }
}

export default function <T extends Record<string, any> = Record<string, any>> (
    sessfile = "sessions.json",
    defaultSessionData:Partial<T> = {}
) {
    const config : Config = {
        lifetime: 86400,
        sessfile
    }
    const configure = mkConfigure(config);
    const loadedSessions:any[] = [];
    const Session = mkSessionClass<T>(defaultSessionData, loadedSessions, config);
    const findSession = mkFindSession<T>(loadedSessions);
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
        sessions: mkMiddleWare<T>(Session, findSession),
        Session: Session,
        configure: configure,
        find: findSession,
        getTypeSafeSessionFromExpressMW(req: Request) {
            if (typeof req.session === "undefined") return null;

            return Object.freeze({
                ...req.session,
                /**
                 * sets a value on the session
                 * @example
                 * req.session.set("username", "SweatyCircle439") // log the user in to the SweatyCircle439 account
                 * @param scope the property you would like to change
                 * @param value the value you want to set the property to
                 */
                set <S extends keyof Partial<T>> (scope: S, value: Partial<T>[S]) {
                    return req.session!.set(scope as string, value);
                },
                /**
                 * gets a value on the session
                 * @example
                 * req.session.get("username") // returns "SweatyCircle439" because it was set by req.session.set
                 * @param scope the property you would like to read
                 * @returns the value of that property on the session
                 */
                get <S extends keyof Partial<T>> (scope: S): Readonly<Partial<T>[S]> {
                    return req.session!.get(scope as string);
                },
                /**
                 * gets all values on the session as an object
                 * @returns {Readonly<Record<string, any>>} all values on the session as an object
                 * @example
                 * const data = req.session.getAllProperties()
                 * console.log(data.username) // "SweatyCircle439" because it was set by req.session.set
                 */
                getAllProperties (): Readonly<Partial<T>> {
                    return req.session!.getAllProperties() as Readonly<Partial<T>>;
                },
                /**
                 * deletes a value from the session
                 * @example
                 * req.session.delete("username") // logs the user out without destroying the session
                 * @param scope the property on the session you want to remove
                 */
                delete <S extends keyof Partial<T>> (scope: S) {
                    return req.session!.delete(scope as string);
                }
            });
        }
    }
};