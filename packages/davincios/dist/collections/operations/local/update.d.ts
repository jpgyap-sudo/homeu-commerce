import type { DeepPartial } from 'ts-essentials';
import type { CollectionSlug, FindOptions, DaVinciOS, RequestContext, TypedLocale } from '../../../index.js';
import type { Document, DaVinciOSRequest, PopulateType, SelectType, Sort, TransformCollectionWithSelect, Where } from '../../../types/index.js';
import type { File } from '../../../uploads/types.js';
import type { BulkOperationResult, DraftFlagFromCollectionSlug, RequiredDataFromCollectionSlug, SelectFromCollectionSlug } from '../../config/types.js';
export type BaseOptions<TSlug extends CollectionSlug, TSelect extends SelectType> = {
    /**
     * Whether the current update should be marked as from autosave.
     * `versions.drafts.autosave` should be specified.
     */
    autosave?: boolean;
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
     * The document / documents data to update.
     */
    data: DeepPartial<RequiredDataFromCollectionSlug<TSlug>>;
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
     * A `File` object when updating a collection with `upload: true`.
     */
    file?: File;
    /**
     * A file path when creating a collection with `upload: true`.
     */
    filePath?: string;
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
     * If you are uploading a file and would like to replace
     * the existing file instead of generating a new filename,
     * you can set the following property to `true`
     */
    overwriteExistingFiles?: boolean;
    /**
     * Specify [populate](https://DaVinciOScms.com/docs/queries/select#populate) to control which fields to include to the result from populated documents.
     */
    populate?: PopulateType;
    /**
     * Publish the document / documents in all locales. Requires `versions.drafts.localizeStatus` to be enabled.
     *
     * @default undefined
     */
    publishAllLocales?: boolean;
    /**
     * Publish the document / documents with a specific locale.
     *
     * @default undefined
     */
    publishSpecificLocale?: string;
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
     * When set to `true`, the operation will update both normal and trashed (soft-deleted) documents.
     * To update only trashed documents, pass `trash: true` and combine with a `where` clause filtering by `deletedAt`.
     * By default (`false`), the update will only include normal documents and exclude those with a `deletedAt` field.
     * @default false
     */
    trash?: boolean;
    /**
     * Unpublish the document / documents in all locales. Requires `versions.drafts.localizeStatus` to be enabled.
     */
    unpublishAllLocales?: boolean;
    /**
     * If you set `overrideAccess` to `false`, you can pass a user to use against the access control checks.
     */
    user?: Document;
} & Pick<FindOptions<TSlug, TSelect>, 'select'>;
export type ByIDOptions<TSlug extends CollectionSlug, TSelect extends SelectFromCollectionSlug<TSlug>> = {
    /**
     * The ID of the document to update.
     */
    id: number | string;
    /**
     * Limit documents to update
     */
    limit?: never;
    /**
     * Sort the documents, can be a string or an array of strings
     * @example '-createdAt' // Sort DESC by createdAt
     * @example ['group', '-createdAt'] // sort by 2 fields, ASC group and DESC createdAt
     */
    sort?: never;
    /**
     * A filter [query](https://DaVinciOScms.com/docs/queries/overview)
     */
    where?: never;
} & BaseOptions<TSlug, TSelect> & DraftFlagFromCollectionSlug<TSlug>;
export type ManyOptions<TSlug extends CollectionSlug, TSelect extends SelectFromCollectionSlug<TSlug>> = {
    /**
     * The ID of the document to update.
     */
    id?: never;
    /**
     * Limit documents to update
     */
    limit?: number;
    /**
     * Sort the documents, can be a string or an array of strings
     * @example '-createdAt' // Sort DESC by createdAt
     * @example ['group', '-createdAt'] // sort by 2 fields, ASC group and DESC createdAt
     */
    sort?: Sort;
    /**
     * A filter [query](https://DaVinciOScms.com/docs/queries/overview)
     */
    where: Where;
} & BaseOptions<TSlug, TSelect> & DraftFlagFromCollectionSlug<TSlug>;
export type Options<TSlug extends CollectionSlug, TSelect extends SelectFromCollectionSlug<TSlug>> = ByIDOptions<TSlug, TSelect> | ManyOptions<TSlug, TSelect>;
declare function updateLocal<TSlug extends CollectionSlug, TSelect extends SelectFromCollectionSlug<TSlug>>(DaVinciOS: DaVinciOS, options: ByIDOptions<TSlug, TSelect>): Promise<TransformCollectionWithSelect<TSlug, TSelect>>;
declare function updateLocal<TSlug extends CollectionSlug, TSelect extends SelectFromCollectionSlug<TSlug>>(DaVinciOS: DaVinciOS, options: ManyOptions<TSlug, TSelect>): Promise<BulkOperationResult<TSlug, TSelect>>;
declare function updateLocal<TSlug extends CollectionSlug, TSelect extends SelectFromCollectionSlug<TSlug>>(DaVinciOS: DaVinciOS, options: Options<TSlug, TSelect>): Promise<BulkOperationResult<TSlug, TSelect> | TransformCollectionWithSelect<TSlug, TSelect>>;
export { updateLocal };
//# sourceMappingURL=update.d.ts.map
