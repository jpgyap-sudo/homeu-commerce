import { type Logger } from 'pino';
import { type PinoPretty } from 'pino-pretty';
import type { Config } from '../config/types.js';
/**
 * DaVinciOS internal logger. Uses Pino.
 * This allows you to bring your own logger instance and let DaVinciOS use it
 */
export type DaVinciOSLogger = Logger;
export declare const prettySyncLoggerDestination: PinoPretty.PrettyStream;
export declare const defaultLoggerOptions: PinoPretty.PrettyStream;
export declare const getLogger: (name?: string, logger?: Config["logger"]) => DaVinciOSLogger;
//# sourceMappingURL=logger.d.ts.map
