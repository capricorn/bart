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
    export async function asyncArgMinimal<T>(arr: T[], comparator: AsyncComparator<T>, equator: AsyncEquator<T> = defaultEquator()): Promise<number> {
        let minimal = await asyncMinimal(arr, comparator);
        for (let i = 0; i < arr.length; i++) {
            let equal = await equator(minimal, arr[i]);
            if (equal) {
                return i;
            }
        }
    }

    // Inefficient but pretty.
    // TODO: Allow equator? 
    export async function asyncSort<T>(arr: T[], comparator: AsyncComparator<T>, equator: AsyncEquator<T> = defaultEquator()): Promise<T[]> {
        if (arr.length <= 1) {
            return arr;
        }

        let argMin = await asyncArgMinimal(arr, comparator, equator);
        let sublist = await asyncSort([...arr.slice(0, argMin), ...arr.slice(argMin+1)], comparator, equator);
        return [arr[argMin], ...sublist];
    }
}

export { Util };