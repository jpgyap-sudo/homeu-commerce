import type { FormState } from 'payload';
import './index.scss';
import React from 'react';
import type { ViewMapInlineBlockComponentProps } from '../../../../types.js';
import type { InlineBlockFields } from '../../server/nodes/InlineBlocksNode.js';
import type { BlockComponentProps } from '../component/index.js';
export type InlineBlockComponentProps<TFormData extends Record<string, unknown> = InlineBlockFields> = {
    readonly CustomBlock?: React.FC<ViewMapInlineBlockComponentProps>;
    readonly CustomLabel?: React.FC<ViewMapInlineBlockComponentProps>;
} & Pick<BlockComponentProps<TFormData>, 'cacheBuster' | 'className' | 'formData' | 'nodeKey'>;
export type InlineBlockComponentContextType = {
    EditButton?: React.FC;
    initialState: false | FormState | undefined;
    InlineBlockContainer?: React.FC<{
        children: React.ReactNode;
    }>;
    Label?: React.FC;
    nodeKey?: string;
    RemoveButton?: React.FC;
};
export declare const useInlineBlockComponentContext: () => InlineBlockComponentContextType;
export declare const InlineBlockComponent: React.FC<InlineBlockComponentProps<InlineBlockFields>>;
//# sourceMappingURL=index.d.ts.map