import type { ImportMap, SanitizedConfig, ServerFunctionClient } from 'payload';
import React from 'react';
import '@payloadcms/ui/scss/app.scss';
export declare const metadata: {
    description: string;
    title: string;
};
type RootLayoutProps = {
    readonly children: React.ReactNode;
    readonly config: Promise<SanitizedConfig>;
    readonly htmlProps?: React.HtmlHTMLAttributes<HTMLHtmlElement>;
    readonly importMap: ImportMap;
    readonly serverFunction: ServerFunctionClient;
};
export declare const RootLayout: ({ children, config: configPromise, htmlProps, importMap, serverFunction, }: RootLayoutProps) => React.JSX.Element;
export {};
//# sourceMappingURL=index.d.ts.map