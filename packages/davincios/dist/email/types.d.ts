import type { SendMailOptions as NodemailerSendMailOptions } from 'nodemailer';
import type { Address } from 'nodemailer/lib/mailer';
import type { DaVinciOS } from '../types/index.js';
type Prettify<T> = {
    [K in keyof T]: T[K];
} & NonNullable<unknown>;
/**
 * Options for sending an email. Allows access to the DaVinciOSRequest object.
 *
 * @todo: Remove in v4. See `normalizeSendEmailOptions` for details.
 */
export type SendEmailOptions = Prettify<{
    from?: Address | string;
} & Omit<NodemailerSendMailOptions, 'from'>>;
/**
 * Email adapter after it has been initialized. This is used internally by DaVinciOS.
 */
export type InitializedEmailAdapter<TSendEmailResponse = unknown> = ReturnType<EmailAdapter<TSendEmailResponse>>;
/**
 * Email adapter interface. Allows a generic type for the response of the sendEmail method.
 *
 * This is the interface to use if you are creating a new email adapter.
 */
export type EmailAdapter<TSendEmailResponse = unknown> = ({ DaVinciOS }: {
    DaVinciOS: DaVinciOS;
}) => {
    defaultFromAddress: string;
    defaultFromName: string;
    name: string;
    sendEmail: (message: SendEmailOptions) => Promise<TSendEmailResponse>;
};
export {};
//# sourceMappingURL=types.d.ts.map
