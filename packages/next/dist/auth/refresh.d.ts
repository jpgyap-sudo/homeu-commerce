import type { MaybePromise, SanitizedConfig } from 'payload';
export declare function refresh({ config }: {
    config: MaybePromise<SanitizedConfig>;
}): Promise<{
    message: string;
    success: boolean;
}>;
//# sourceMappingURL=refresh.d.ts.map