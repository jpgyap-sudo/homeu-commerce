import { type EditorConfig, type LexicalEditor, type LexicalNode } from 'lexical';
import React, { type JSX } from 'react';
import type { ViewMapInlineBlockComponentProps } from '../../../../types.js';
import type { InlineBlockFields, SerializedInlineBlockNode } from '../../server/nodes/InlineBlocksNode.js';
import { ServerInlineBlockNode } from '../../server/nodes/InlineBlocksNode.js';
export type InlineBlockDecorateFunction = (editor: LexicalEditor, config: EditorConfig, CustomBlock?: React.FC<ViewMapInlineBlockComponentProps>, CustomLabel?: React.FC<ViewMapInlineBlockComponentProps>) => JSX.Element;
export declare class InlineBlockNode extends ServerInlineBlockNode {
    static clone(node: ServerInlineBlockNode): ServerInlineBlockNode;
    static getType(): string;
    static importJSON(serializedNode: SerializedInlineBlockNode): InlineBlockNode;
    decorate(...[_editor, config, CustomBlock, CustomLabel]: Parameters<InlineBlockDecorateFunction>): ReturnType<InlineBlockDecorateFunction>;
    exportJSON(): SerializedInlineBlockNode;
}
export declare function $createInlineBlockNode(fields: Exclude<InlineBlockFields, 'id'>): InlineBlockNode;
export declare function $isInlineBlockNode(node: InlineBlockNode | LexicalNode | null | undefined): node is InlineBlockNode;
//# sourceMappingURL=InlineBlocksNode.d.ts.map