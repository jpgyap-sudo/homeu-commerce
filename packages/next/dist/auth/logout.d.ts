import type { MaybePromise, SanitizedConfig } from 'payload';
export declare function logout({ allSessions, config, }: {
    allSessions?: boolean;
    config: MaybePromise<SanitizedConfig>;
}): Promise<{
    message: string;
    success: boolean;
}>;
//# sourceMappingURL=logout.d.ts.map