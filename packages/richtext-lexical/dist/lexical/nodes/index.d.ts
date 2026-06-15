import type { Klass, LexicalEditor, LexicalNode, LexicalNodeReplacement } from 'lexical';
import type { NodeWithHooks } from '../../features/typesServer.js';
import type { LexicalEditorNodeMap } from '../../types.js';
import type { SanitizedClientEditorConfig, SanitizedServerEditorConfig } from '../config/types.js';
/**
 * Register view definitions for an editor
 */
export declare function registerEditorNodeViews(editor: LexicalEditor, nodeViews: LexicalEditorNodeMap): void;
/**
 * Clear all view overrides for an editor (restores default rendering)
 */
export declare function clearEditorNodeViews(editor: LexicalEditor): void;
export declare function getEnabledNodes({ editorConfig, nodeViews, }: {
    editorConfig: SanitizedClientEditorConfig | SanitizedServerEditorConfig;
    nodeViews?: LexicalEditorNodeMap;
}): Array<Klass<LexicalNode> | LexicalNodeReplacement>;
export declare function getEnabledNodesFromServerNodes({ nodes, }: {
    nodes: Array<Klass<LexicalNode> | LexicalNodeReplacement> | Array<NodeWithHooks>;
}): Array<Klass<LexicalNode> | LexicalNodeReplacement>;
//# sourceMappingURL=index.d.ts.map