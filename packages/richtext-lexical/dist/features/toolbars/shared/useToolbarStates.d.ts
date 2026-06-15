import type { LexicalEditor } from 'lexical';
import type { ToolbarGroup, ToolbarGroupItem } from '../types.js';
export interface ToolbarItemState {
    active: boolean;
    enabled: boolean;
}
export interface ToolbarGroupState {
    activeItemKeys: string[];
    activeItems: ToolbarGroupItem[];
    enabledGroup: boolean;
    enabledItemKeys: string[];
}
export interface ToolbarStates {
    groupStates: Map<string, ToolbarGroupState>;
    itemStates: Map<string, ToolbarItemState>;
}
/**
 * Subscribes once to `editor.registerUpdateListener` and computes
 * isActive / isEnabled for every toolbar item in a read.
 */
export declare function useToolbarStates(editor: LexicalEditor, groups: ToolbarGroup[] | undefined): ToolbarStates;
//# sourceMappingURL=useToolbarStates.d.ts.map