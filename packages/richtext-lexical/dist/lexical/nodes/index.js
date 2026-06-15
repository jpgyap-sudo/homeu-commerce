import React from 'react';
// Store view definitions for each editor and node type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const editorNodeViews = new WeakMap();
/**
 * Register view definitions for an editor
 */
export function registerEditorNodeViews(editor, nodeViews) {
  if (!editorNodeViews.has(editor)) {
    editorNodeViews.set(editor, new Map());
  }
  const editorViews = editorNodeViews.get(editor);
  // Register each node type's view
  for (const [nodeType, value] of Object.entries(nodeViews)) {
    if (!value || typeof value !== 'object') {
      continue;
    }
    // Handle blocks specially - store each block type with key 'block:blockType'
    if (nodeType === 'blocks') {
      for (const [blockType, viewDef] of Object.entries(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value)) {
        editorViews.set(`block:${blockType}`, viewDef);
      }
      continue;
    }
    // Handle inlineBlocks specially - store each block type with key 'inlineBlock:blockType'
    if (nodeType === 'inlineBlocks') {
      for (const [blockType, viewDef] of Object.entries(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value)) {
        editorViews.set(`inlineBlock:${blockType}`, viewDef);
      }
      continue;
    }
    // Regular node types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editorViews.set(nodeType, value);
  }
}
/**
 * Clear all view overrides for an editor (restores default rendering)
 */
export function clearEditorNodeViews(editor) {
  editorNodeViews.delete(editor);
}
/**
 * Get the view definition for a specific editor and node
 */
function getEditorNodeView(editor, nodeType,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
node) {
  const editorViews = editorNodeViews.get(editor);
  // For block nodes, look up by blockType
  if (nodeType === 'block' && node?.['__fields']?.blockType) {
    const blockType = node['__fields'].blockType;
    return editorViews?.get(`block:${blockType}`);
  }
  // For inlineBlock nodes, look up by blockType
  if (nodeType === 'inlineBlock' && node?.['__fields']?.blockType) {
    const blockType = node['__fields'].blockType;
    return editorViews?.get(`inlineBlock:${blockType}`);
  }
  // Regular node types
  return editorViews?.get(nodeType);
}
/**
 * Apply view overrides to a specific node type by modifying its prototype
 * Uses WeakMap to check per-editor at runtime
 */
function applyNodeOverride({
  node,
  nodeType
}) {
  if (!('getType' in node) || node.getType() !== nodeType) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const NodeClass = node;
  // Store original methods if not already stored
  if (!NodeClass.prototype._originalDecorate) {
    NodeClass.prototype._originalDecorate = NodeClass.prototype.decorate;
  }
  if (!NodeClass.prototype._originalCreateDOM) {
    NodeClass.prototype._originalCreateDOM = NodeClass.prototype.createDOM;
  }
  // Override decorate method (for DecoratorNodes)
  if (NodeClass.prototype.decorate && !NodeClass.prototype._decorateOverridden) {
    NodeClass.prototype._decorateOverridden = true;
    const hasCreateDOM = !!NodeClass.prototype.createDOM;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    NodeClass.prototype.decorate = function (editor, config) {
      const viewDef = getEditorNodeView(editor, nodeType, this);
      if (viewDef) {
        // Priority 1: If Component is provided, use it
        if (viewDef.Component) {
          return viewDef.Component({
            config,
            editor,
            isEditor: true,
            isJSXConverter: false,
            node: this
          });
        }
        // Priority 2: If custom createDOM is provided, use html in decorate
        if (viewDef.createDOM && viewDef.html) {
          const htmlContent = typeof viewDef.html === 'function' ? viewDef.html({
            config,
            editor,
            isEditor: true,
            isJSXConverter: false,
            node: this
          }) : viewDef.html;
          return React.createElement('span', {
            dangerouslySetInnerHTML: {
              __html: htmlContent
            }
          });
        }
        // Priority 3: If only html is provided (no custom createDOM),
        // createDOM will handle it, so decorate returns empty fragment
        if (viewDef.html && hasCreateDOM && !viewDef.createDOM) {
          return React.createElement(React.Fragment);
        }
        if (nodeType === 'block') {
          const blockViewDef = viewDef;
          if (blockViewDef.Block || blockViewDef.Label) {
            const originalDecorate = NodeClass.prototype._originalDecorate;
            // Pass Block FC to BlockContent for rendering
            // BlockContent will render with useBlockComponentContext hook (client-only)
            return originalDecorate.call(this, editor, config, blockViewDef.Block, blockViewDef.Label);
          }
        } else if (nodeType === 'inlineBlock') {
          const blockViewDef = viewDef;
          if (blockViewDef.Block || blockViewDef.Label) {
            const originalDecorate = NodeClass.prototype._originalDecorate;
            // Pass Block FC to BlockContent for rendering
            // BlockContent will render with useBlockComponentContext hook (client-only)
            return originalDecorate.call(this, editor, config, blockViewDef.Block, blockViewDef.Label);
          }
        }
      }
      const originalDecorate = NodeClass.prototype._originalDecorate;
      // Otherwise use original
      return originalDecorate.call(this, editor, config);
    };
  }
  // Override createDOM method (for ElementNodes)
  if (NodeClass.prototype.createDOM && !NodeClass.prototype._createDOMOverridden) {
    NodeClass.prototype._createDOMOverridden = true;
    NodeClass.prototype.createDOM = function (config, editor) {
      const viewDef = getEditorNodeView(editor, nodeType, this);
      if (viewDef) {
        // If createDOM is provided, use it
        if (viewDef.createDOM) {
          return viewDef.createDOM({
            config,
            editor,
            node: this
          });
        }
        // If html is provided (as a function or string), create element from it
        if (viewDef.html) {
          const htmlContent = typeof viewDef.html === 'function' ? viewDef.html({
            config,
            editor,
            isEditor: true,
            isJSXConverter: false,
            node: this
          }) : viewDef.html;
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;
          return tempDiv.firstElementChild || tempDiv;
        }
      }
      // Otherwise use original
      return NodeClass.prototype._originalCreateDOM.call(this, config, editor);
    };
  }
}
export function getEnabledNodes({
  editorConfig,
  nodeViews
}) {
  const nodes = getEnabledNodesFromServerNodes({
    nodes: editorConfig.features.nodes
  });
  if (nodeViews) {
    // Apply node overrides by modifying prototypes (once globally)
    // The overrides check per-editor at runtime using WeakMap
    const nodeTypesToOverride = new Set();
    for (const [key, value] of Object.entries(nodeViews)) {
      if (!value || typeof value !== 'object') {
        continue;
      }
      // If 'blocks' key exists with content, we need to override 'block' nodes
      if (key === 'blocks' && Object.keys(value).length > 0) {
        nodeTypesToOverride.add('block');
      } else if (key === 'inlineBlocks' && Object.keys(value).length > 0) {
        nodeTypesToOverride.add('inlineBlock');
      } else {
        nodeTypesToOverride.add(key);
      }
    }
    for (const node of nodes) {
      if ('getType' in node) {
        const nodeType = node.getType();
        if (nodeTypesToOverride.has(nodeType)) {
          applyNodeOverride({
            node,
            nodeType
          });
        }
      }
    }
  }
  return nodes;
}
export function getEnabledNodesFromServerNodes({
  nodes
}) {
  return nodes.map(node => {
    if ('node' in node) {
      return node.node;
    }
    return node;
  });
}
//# sourceMappingURL=index.js.map