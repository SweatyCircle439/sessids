import type { Request, Response } from "express";
export declare class Session {
    /**
     * how long the session is still alive for
     */
    lifetime: number;
    /**
     * the data stored in the object. should not be accessed except for reading purposes or for inpermanent changes
     * as this is not saved
     */
    storeddata: {
        [key: string]: any;
    };
    /**
     * the id of the session
     */
    id: string;
    /**
     * updates the session
     */
    private update;
    /**
     * regenerates the session id
     */
    private genid;
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
    };
    /**
     * ticks the clock on the session
     */
    private wait;
    constructor(data?: {}, lifetime?: number, id?: string);
}
declare function findsession(search: {
    id?: string;
    data?: {
        [key: string]: string;
    };
}): Session[];
declare function sessions(req: Request, res: Response, next: any): any;
declare function configure(scope: "sessfile" | "lifetime", value: any): void;
declare const _default: (sessfile?: string) => {
    sessions: typeof sessions;
    Session: typeof Session;
    configure: typeof configure;
    find: typeof findsession;
};
export default _default;
//# sourceMappingURL=index.d.ts.map