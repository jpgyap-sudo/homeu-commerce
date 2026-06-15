import React from 'react';
import type { ViewMapBlockComponentProps } from '../../../../types.js';
import type { BlockFields } from '../../server/nodes/BlocksNode.js';
import './index.scss';
export type BlockComponentProps<TFormData extends Record<string, unknown> = BlockFields> = {
    /**
     * Can be modified by the node in order to trigger the re-fetch of the initial state based on the
     * formData. This is useful when node.setFields() is explicitly called from outside of the form - in
     * this case, the new field state is likely not reflected in the form state, so we need to re-fetch
     */
    readonly cacheBuster: number;
    readonly className: string;
    /**
     * Custom block component from view map
     * Will be rendered with useBlockComponentContext hook.
     */
    readonly CustomBlock?: React.FC<ViewMapBlockComponentProps>;
    /**
     * Custom block label from view map
     * Will be rendered with useBlockComponentContext hook.
     */
    readonly CustomLabel?: React.FC<ViewMapBlockComponentProps>;
    /**
     * The block's form data (field values).
     */
    readonly formData: TFormData;
    /**
     * The unique key identifying this block node in the current editor instance.
     */
    readonly nodeKey: string;
};
export declare const BlockComponent: React.FC<BlockComponentProps>;
//# sourceMappingURL=index.d.ts.map