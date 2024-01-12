namespace Util {
    // Return a factor that maintains state;
    export function lazy() {
        let cache = undefined;
        return (target: any, propertyKey: string) => {
            // TODO: Implement getter / setter of the prototype
            // TODO: Init cache to initially assigned val
            Object.defineProperty(target, propertyKey, {
                get: () => {
                    cache;
                },
                set: (newVal) => {
                    cache = newVal;
                }
            });
        };
    }

    export class TestClass {
        @lazy()
        example: string;
    }


    export type AsyncFilter<T> = (e: T) => Promise<boolean>;
    export type AsyncComparator<T> = (a:T, b:T) => Promise<Boolean>;
    export type AsyncEquator<T> = (a:T, b:T) => Promise<Boolean>;

    export function defaultEquator<T>(): AsyncEquator<T> {
        return async (a,b) => a == b;
    }

    export async function asyncMinimal<T>(arr: T[], comparator: AsyncComparator<T>): Promise<T> {
        // TODO: Handling of [] case?
        if (arr.length == 1) {
            return arr[0];
        } else {
            let e = arr[0];
            let subMinimal = await asyncMinimal(arr.slice(1), comparator);
            return (await comparator(e, subMinimal)) ? e : subMinimal;
        }
    }

    // TODO: Potential equality issues
    export async function asyncArgMinimal<T>(arr: T[], comparator: AsyncComparator<T>): Promise<number> {
        let minimal = await asyncMinimal(arr, comparator);
        for (let i = 0; i < arr.length; i++) {
            // If the arg is minimal it will compare less than all other elements aside from itself.
            // Note -- only works if the comparator does not contain equality.
            let hitMin = (await comparator(minimal, arr[i]) == false);
            if (hitMin) {
                return i;
            }
        }
    }

    // Inefficient but pretty.
    // TODO: Allow equator? 
    export async function asyncSort<T>(arr: T[], comparator: AsyncComparator<T>): Promise<T[]> {
        if (arr.length <= 1) {
            return arr;
        }

        let argMin = await asyncArgMinimal(arr, comparator);
        let sublist = await asyncSort([...arr.slice(0, argMin), ...arr.slice(argMin+1)], comparator);
        return [arr[argMin], ...sublist];
    }

    export async function asyncFilter<T>(filter: AsyncFilter<T>, arr: T[]): Promise<T[]> {
        let results = [];

        for (const e of arr) {
            if (await filter(e)) {
                results.push(e);
            }
        }

        return results;
    }

    export class DebounceScheduler {
        private events: Map<string, DebounceScheduler.Event> = new Map();
        static instance: DebounceScheduler = new DebounceScheduler();

        private static loop() {
            let scheduler = DebounceScheduler.instance;
            let now = Date.now();
            let entries = Array.from(scheduler.events.entries());

            for (const [key,event] of entries) {
                if (now >= event.execTime) {
                    event.callback();
                    scheduler.events.delete(key);
                }
            }
        }

        private constructor() {
            setInterval(DebounceScheduler.loop, 20);
        }

        submit(key: string, debounce: number, callback: DebounceScheduler.Callback) {
            this.events.set(key, new DebounceScheduler.Event(debounce, callback));
        }
    }

    export namespace DebounceScheduler {
        export type Callback = () => void;

        export class Event {
            execTime: number;
            callback: Callback;

            constructor(debounce: number, callback: Callback) {
                this.execTime = Date.now() + debounce;
                this.callback = callback;
            }
        }
    }

    

    
}

export { Util };