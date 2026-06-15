import type { AuthCollectionSlug, LoginResult, MaybePromise, SanitizedConfig } from 'payload';
type LoginWithEmail<TSlug extends AuthCollectionSlug> = {
    collection: TSlug;
    config: MaybePromise<SanitizedConfig>;
    email: string;
    password: string;
    username?: never;
};
type LoginWithUsername<TSlug extends AuthCollectionSlug> = {
    collection: TSlug;
    config: MaybePromise<SanitizedConfig>;
    email?: never;
    password: string;
    username: string;
};
type LoginArgs<TSlug extends AuthCollectionSlug> = LoginWithEmail<TSlug> | LoginWithUsername<TSlug>;
export declare function login<TSlug extends AuthCollectionSlug>({ collection, config, email, password, username, }: LoginArgs<TSlug>): Promise<LoginResult<TSlug>>;
export {};
//# sourceMappingURL=login.d.ts.map