import { JsonValue } from 'type-fest';
export declare const debug: {
    error: import("debug").Debugger;
    log: import("debug").Debugger;
    write: (t: string) => boolean | "" | null | undefined;
};
export declare function sleep(delay: number): Promise<unknown>;
export declare function parseUnsafeJson(json: string): JsonValue;
export type MaybePromise<T> = Promise<T> | T;
//# sourceMappingURL=utils.d.ts.map