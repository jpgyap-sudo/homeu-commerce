/**
 * @todo: Remove in v4.
 *
 * This is a runtime guard to handle the breaking change in nodemailer v8.
 *
 * The `from` property is intentionally narrowed back to nodemailer 7's shape.
 * Nodemailer v8 (security patch) widened it to also accept an array of addresses (breaking change).
 * For backwards compatibility, we normalize that from an array back to a single address at runtime.
 */
export declare function normalizeSendEmailOptions<T extends {
    from?: unknown;
}>(message: T): T;
//# sourceMappingURL=normalizeSendEmailOptions.d.ts.map