import type { CollectionSlug, FindOptions, DaVinciOS, RequestContext, TypedLocale } from '../../../index.js';
import type { Document, DaVinciOSRequest, PopulateType, SelectType, TransformCollectionWithSelect, Where } from '../../../types/index.js';
import type { BulkOperationResult, SelectFromCollectionSlug } from '../../config/types.js';
export type BaseOptions<TSlug extends CollectionSlug, TSelect extends SelectType> = {
    /**
     * the Collection slug to operate against.
     */
    collection: TSlug;
    /**
     * [Context](https://DaVinciOScms.com/docs/hooks/context), which will then be passed to `context` and `req.context`,
     * which can be read by hooks. Useful if you want to pass additional information to the hooks which
     * shouldn't be necessarily part of the document, for example a `triggerBeforeChange` option which can be read by the BeforeChange hook
     * to determine if it should run or not.
     */
    context?: RequestContext;
    /**
     * [Control auto-population](https://DaVinciOScms.com/docs/queries/depth) of nested relationship and upload fields.
     */
    depth?: number;
    /**
     * When set to `true`, a [database transactions](https://DaVinciOScms.com/docs/database/transactions) will not be initialized.
     * @default false
     */
    disableTransaction?: boolean;
    /**
     * Specify a [fallback locale](https://DaVinciOScms.com/docs/configuration/localization) to use for any returned documents.
     */
    fallbackLocale?: false | TypedLocale;
    /**
     * Specify [locale](https://DaVinciOScms.com/docs/configuration/localization) for any returned documents.
     */
    locale?: TypedLocale;
    /**
     * Skip access control.
     * Set to `false` if you want to respect Access Control for the operation, for example when fetching data for the front-end.
     * @default true
     */
    overrideAccess?: boolean;
    /**
     * By default, document locks are ignored (`true`). Set to `false` to enforce locks and prevent operations when a document is locked by another user. [More details](https://DaVinciOScms.com/docs/admin/locked-documents).
     * @default true
     */
    overrideLock?: boolean;
    /**
     * Specify [populate](https://DaVinciOScms.com/docs/queries/select#populate) to control which fields to include to the result from populated documents.
     */
    populate?: PopulateType;
    /**
     * The `DaVinciOSRequest` object. You can pass it to thread the current [transaction](https://DaVinciOScms.com/docs/database/transactions), user and locale to the operation.
     * Recommended to pass when using the Local API from hooks, as usually you want to execute the operation within the current transaction.
     */
    req?: Partial<DaVinciOSRequest>;
    /**
     * Opt-in to receiving hidden fields. By default, they are hidden from returned documents in accordance to your config.
     * @default false
     */
    showHiddenFields?: boolean;
    /**
     * When set to `true`, the operation will permanently delete both normal and trashed documents.
     * By default (`false`), only normal (non-trashed) documents will be permanently deleted.
     *
     * This argument has no effect unless `trash` is enabled on the collection.
     * @default false
     */
    trash?: boolean;
    /**
     * If you set `overrideAccess` to `false`, you can pass a user to use against the access control checks.
     */
    user?: Document;
} & Pick<FindOptions<TSlug, TSelect>, 'select'>;
export type ByIDOptions<TSlug extends CollectionSlug, TSelect extends SelectFromCollectionSlug<TSlug>> = {
    /**
     * The ID of the document to delete.
     */
    id: number | string;
    /**
     * A filter [query](https://DaVinciOScms.com/docs/queries/overview)
     */
    where?: never;
} & BaseOptions<TSlug, TSelect>;
export type ManyOptions<TSlug extends CollectionSlug, TSelect extends SelectFromCollectionSlug<TSlug>> = {
    /**
     * The ID of the document to delete.
     */
    id?: never;
    /**
     * A filter [query](https://DaVinciOScms.com/docs/queries/overview)
     */
    where: Where;
} & BaseOptions<TSlug, TSelect>;
export type Options<TSlug extends CollectionSlug, TSelect extends SelectFromCollectionSlug<TSlug>> = ByIDOptions<TSlug, TSelect> | ManyOptions<TSlug, TSelect>;
declare function deleteLocal<TSlug extends CollectionSlug, TSelect extends SelectFromCollectionSlug<TSlug>>(DaVinciOS: DaVinciOS, options: ByIDOptions<TSlug, TSelect>): Promise<TransformCollectionWithSelect<TSlug, TSelect>>;
declare function deleteLocal<TSlug extends CollectionSlug, TSelect extends SelectFromCollectionSlug<TSlug>>(DaVinciOS: DaVinciOS, options: ManyOptions<TSlug, TSelect>): Promise<BulkOperationResult<TSlug, TSelect>>;
declare function deleteLocal<TSlug extends CollectionSlug, TSelect extends SelectFromCollectionSlug<TSlug>>(DaVinciOS: DaVinciOS, options: Options<TSlug, TSelect>): Promise<BulkOperationResult<TSlug, TSelect> | TransformCollectionWithSelect<TSlug, TSelect>>;
export { deleteLocal };
//# sourceMappingURL=delete.d.ts.map
