import type { SerializedEditorState, SerializedLexicalNode } from 'lexical';
/**
 * This function checks if the editor state is empty (has any text). If the editor state has no nodes,
 * or only an empty paragraph node (no TextNode with length > 0), it returns false.
 * Otherwise, it returns true.
 */
export declare function hasText(value: null | SerializedEditorState<SerializedLexicalNode> | undefined): value is SerializedEditorState<SerializedLexicalNode>;
//# sourceMappingURL=hasText.d.ts.map