import { type EditorConfig, type LexicalEditor, type LexicalNode } from 'lexical';
import React, { type JSX } from 'react';
import type { ViewMapBlockComponentProps } from '../../../../types.js';
import type { BlockFieldsOptionalID, SerializedBlockNode } from '../../server/nodes/BlocksNode.js';
import { ServerBlockNode } from '../../server/nodes/BlocksNode.js';
export type BlockDecorateFunction = (editor: LexicalEditor, config: EditorConfig, CustomBlock?: React.FC<ViewMapBlockComponentProps>, CustomLabel?: React.FC<ViewMapBlockComponentProps>) => JSX.Element;
export declare class BlockNode extends ServerBlockNode {
    static clone(node: ServerBlockNode): ServerBlockNode;
    static getType(): string;
    static importJSON(serializedNode: SerializedBlockNode): BlockNode;
    decorate(...[_editor, config, CustomBlock, CustomLabel]: Parameters<BlockDecorateFunction>): ReturnType<BlockDecorateFunction>;
    exportJSON(): SerializedBlockNode;
}
export declare function $createBlockNode(fields: BlockFieldsOptionalID): BlockNode;
export declare function $isBlockNode(node: BlockNode | LexicalNode | null | undefined): node is BlockNode;
//# sourceMappingURL=BlocksNode.d.ts.map