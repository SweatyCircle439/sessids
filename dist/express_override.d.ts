import 'express';

declare module 'express' {
    interface Request {
        session: Readonly<{
            /**
             * sets a value on the session
             * @example req.session.set("username", "SweatyCircle439") // log the user in to the SweatyCircle439 account
             * @param scope the property you would like to change
             * @param value the value you want to set the property to
             */
            set: (scope: string, value: any) => void;
            /**
             * gets a value on the session
             * @example req.session.get("username") // returns "SweatyCircle439" because it was set by req.session.set
             * @param scope the property you would like to read
             * @returns the value of that property on the session
             */
            get: (scope: string) => any;
            getAllProperties: () => Readonly<{
                [key: string]: any;
            }>;
            /**
             * deletes a value from the session
             * @example req.session.delete("username") // logs the user out without destroying the session
             * @param scope the property on the session you want to remove
             */
            delete: (scope: string) => void;
            /**
             * destroys the session. this 
             * - fully deletes all data in the session
             * - removes it from the sessions file
             * 
             * **do not call any function on this session after this as that will recreate the session**
             * @example req.session.destroy() // delete the session
             */
            destroy: () => void;
            /**
             * the id of the session
             */
            id: string;
            /**
             * how long the session is still alive for
             */
            lifetime: number;
        }>
    }
}