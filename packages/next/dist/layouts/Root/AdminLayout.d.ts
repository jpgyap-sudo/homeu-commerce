import type { ImportMap, SanitizedConfig, ServerFunctionClient } from 'payload';
import React from 'react';

type AdminLayoutProps = {
    readonly children: React.ReactNode;
    readonly config: Promise<SanitizedConfig>;
    readonly importMap: ImportMap;
    readonly serverFunction: ServerFunctionClient;
};

export declare const AdminLayout: ({ children, config: configPromise, importMap, serverFunction, }: AdminLayoutProps) => React.JSX.Element;
//# sourceMappingURL=AdminLayout.d.ts.map
