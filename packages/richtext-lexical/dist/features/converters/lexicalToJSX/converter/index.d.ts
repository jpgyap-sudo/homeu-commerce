import type { SerializedEditorState, SerializedLexicalNode } from 'lexical';
import React from 'react';
import type { LexicalEditorNodeMap, SerializedNodeBase } from '../../../../types.js';
import type { JSXConverters, SerializedLexicalNodeWithParent } from './types.js';
export type ConvertLexicalToJSXArgs<TNodes extends SerializedNodeBase = SerializedNodeBase> = {
    converters: JSXConverters;
    /**
     * Serialized editor state to render.
     */
    data: SerializedEditorState;
    /**
     * If true, disables indentation globally. If an array, disables for specific node `type` values.
     */
    disableIndent?: boolean | string[];
    /**
     * If true, disables text alignment globally. If an array, disables for specific node `type` values.
     */
    disableTextAlign?: boolean | string[];
    /**
     * You can use the lexical editor node map or view map as converters. NodeMap converters will override converters passed
     * in the `converters` prop. If a LexicalEditorViewMap is provided, the `default` view will be used.
     */
    nodeMap?: LexicalEditorNodeMap<TNodes>;
};
export declare function convertLexicalToJSX<TNodes extends SerializedNodeBase = SerializedNodeBase>({ converters, data, disableIndent, disableTextAlign, nodeMap, }: ConvertLexicalToJSXArgs<TNodes>): React.ReactNode;
export declare function convertLexicalNodesToJSX({ converters, disableIndent, disableTextAlign, nodes, parent, }: {
    converters: JSXConverters;
    disableIndent?: boolean | string[];
    disableTextAlign?: boolean | string[];
    nodes: SerializedLexicalNode[];
    parent: SerializedLexicalNodeWithParent;
}): React.ReactNode[];
//# sourceMappingURL=index.d.ts.map