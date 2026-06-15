import React from 'react';
import type { LexicalEditor } from 'lexical';
import type { ToolbarDropdownGroup } from '../../types.js';
import type { ToolbarGroupState } from '../useToolbarStates.js';
import './index.scss';
export declare const ToolbarDropdown: ({ anchorElem, classNames, editor, group, groupState, Icon, itemsContainerClassNames, label, }: {
    anchorElem: HTMLElement;
    classNames?: string[];
    editor: LexicalEditor;
    group: ToolbarDropdownGroup;
    groupState: ToolbarGroupState;
    Icon?: React.FC;
    itemsContainerClassNames?: string[];
    label?: string;
}) => React.JSX.Element;
//# sourceMappingURL=index.d.ts.map