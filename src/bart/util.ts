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
}

export { Util };