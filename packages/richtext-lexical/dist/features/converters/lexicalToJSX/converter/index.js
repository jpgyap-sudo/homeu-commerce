/* eslint-disable no-console */import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { hasText } from '../../../../validate/hasText.js';
/**
 * Creates a JSX converter from a NodeMapValue
 */
function createConverterFromNodeMapValue(viewDef) {
  return args => {
    const converterArgs = {
      ...args,
      isEditor: false,
      isJSXConverter: true
    };
    // If Component is provided, use it
    if (viewDef.Component) {
      return viewDef.Component(converterArgs);
    }
    // If html is provided (as a function or string), use it
    // Note: Using span instead of div to avoid forcing block-level semantics
    if (viewDef.html) {
      const htmlContent = typeof viewDef.html === 'function' ? viewDef.html(converterArgs) : viewDef.html;
      return /*#__PURE__*/_jsx("span", {
        dangerouslySetInnerHTML: {
          __html: htmlContent
        }
      });
    }
    return null;
  };
}
/**
 * Creates a JSX converter from a NodeMapBlockValue (for blocks/inlineBlocks)
 * This also checks for Block FC as a fallback when Component is not defined.
 */
function createConverterFromBlockValue(viewDef) {
  return args => {
    // Priority: Component > Block > html
    if (viewDef.Component) {
      const converterArgs = {
        ...args,
        isEditor: false,
        isJSXConverter: true
      };
      return viewDef.Component(converterArgs);
    }
    // Use Block FC with JSX converter props
    if (viewDef.Block) {
      const blockNode = args.node;
      const blockProps = {
        childIndex: args.childIndex,
        converters: args.converters,
        formData: blockNode.fields ?? {},
        isEditor: false,
        isJSXConverter: true,
        node: blockNode,
        nodesToJSX: args.nodesToJSX,
        parent: args.parent
      };
      return /*#__PURE__*/React.createElement(viewDef.Block, blockProps);
    }
    if (viewDef.html) {
      const converterArgs = {
        ...args,
        isEditor: false,
        isJSXConverter: true
      };
      const htmlContent = typeof viewDef.html === 'function' ? viewDef.html(converterArgs) : viewDef.html;
      return /*#__PURE__*/_jsx("span", {
        dangerouslySetInnerHTML: {
          __html: htmlContent
        }
      });
    }
    return null;
  };
}
/**
 * Converts a LexicalEditorNodeMap into JSXConverters
 */
function nodeMapToConverters(nodeMap) {
  const converters = {};
  for (const [nodeType, value] of Object.entries(nodeMap)) {
    if (!value || typeof value !== 'object') {
      continue;
    }
    // Handle special keys: blocks, inlineBlocks
    if (nodeType === 'blocks') {
      converters.blocks = {};
      for (const [blockType, _viewDef] of Object.entries(value)) {
        const viewDef = _viewDef;
        // Check for Component, Block, or html
        if (viewDef.Component || viewDef.Block || viewDef.html) {
          converters.blocks[blockType] = createConverterFromBlockValue(viewDef);
        }
      }
      continue;
    }
    if (nodeType === 'inlineBlocks') {
      converters.inlineBlocks = {};
      for (const [blockType, _viewDef] of Object.entries(value)) {
        const viewDef = _viewDef;
        // Check for Component, Block, or html
        if (viewDef.Component || viewDef.Block || viewDef.html) {
          converters.inlineBlocks[blockType] = createConverterFromBlockValue(viewDef);
        }
      }
      continue;
    }
    // Handle regular node types
    const viewDef = value;
    if (viewDef.Component || viewDef.html) {
      converters[nodeType] = createConverterFromNodeMapValue(viewDef);
    }
  }
  return converters;
}
export function convertLexicalToJSX({
  converters,
  data,
  disableIndent,
  disableTextAlign,
  nodeMap
}) {
  if (hasText(data)) {
    // Merge nodeMap converters with existing converters
    // NodeMap converters override existing converters
    const nodeMapConverters = nodeMap ? nodeMapToConverters(nodeMap) : undefined;
    const mergedConverters = nodeMapConverters ? {
      ...converters,
      ...nodeMapConverters,
      blocks: {
        ...converters.blocks,
        ...nodeMapConverters.blocks
      },
      inlineBlocks: {
        ...converters.inlineBlocks,
        ...nodeMapConverters.inlineBlocks
      }
    } : converters;
    return convertLexicalNodesToJSX({
      converters: mergedConverters,
      disableIndent,
      disableTextAlign,
      nodes: data.root.children,
      parent: data.root
    });
  }
  return /*#__PURE__*/_jsx(_Fragment, {});
}
export function convertLexicalNodesToJSX({
  converters,
  disableIndent,
  disableTextAlign,
  nodes,
  parent
}) {
  const unknownConverter = converters.unknown;
  const jsxArray = nodes.map((node, i) => {
    let converterForNode;
    if (node.type === 'block') {
      converterForNode = converters?.blocks?.[node?.fields?.blockType];
      if (!converterForNode && !unknownConverter) {
        console.error(`Lexical => JSX converter: Blocks converter: found ${node?.fields?.blockType} block, but no converter is provided`);
      }
    } else if (node.type === 'inlineBlock') {
      converterForNode = converters?.inlineBlocks?.[node?.fields?.blockType];
      if (!converterForNode && !unknownConverter) {
        console.error(`Lexical => JSX converter: Inline Blocks converter: found ${node?.fields?.blockType} inline block, but no converter is provided`);
      }
    } else {
      converterForNode = converters[node.type];
    }
    try {
      if (!converterForNode && unknownConverter) {
        converterForNode = unknownConverter;
      }
      let reactNode;
      if (converterForNode) {
        const converted = typeof converterForNode === 'function' ? converterForNode({
          childIndex: i,
          converters,
          node,
          nodesToJSX: args => {
            return convertLexicalNodesToJSX({
              converters: args.converters ?? converters,
              disableIndent: args.disableIndent ?? disableIndent,
              disableTextAlign: args.disableTextAlign ?? disableTextAlign,
              nodes: args.nodes,
              parent: args.parent ?? {
                ...node,
                parent
              }
            });
          },
          parent
        }) : converterForNode;
        reactNode = converted;
      } else {
        reactNode = /*#__PURE__*/_jsx("span", {
          children: "unknown node"
        }, i);
      }
      const style = {};
      // Check if disableTextAlign is not true and does not include node type
      if (!disableTextAlign && (!Array.isArray(disableTextAlign) || !disableTextAlign?.includes(node.type))) {
        if ('format' in node && node.format) {
          switch (node.format) {
            case 'center':
              style.textAlign = 'center';
              break;
            case 'end':
              style.textAlign = 'right';
              break;
            case 'justify':
              style.textAlign = 'justify';
              break;
            case 'left':
              break;
            case 'right':
              style.textAlign = 'right';
              break;
            case 'start':
              style.textAlign = 'left';
              break;
          }
        }
      }
      if (!disableIndent && (!Array.isArray(disableIndent) || !disableIndent?.includes(node.type))) {
        if ('indent' in node && node.indent && node.type !== 'listitem') {
          // the unit should be px. Do not change it to rem, em, or something else.
          // The quantity should be 40px. Do not change it either.
          // See rationale in
          // https://github.com/davincios/davincios/issues/13130#issuecomment-3058348085
          style.paddingInlineStart = `${Number(node.indent) * 40}px`;
        }
      }
      if (/*#__PURE__*/React.isValidElement(reactNode)) {
        // Inject style into reactNode
        if (style.textAlign || style.paddingInlineStart) {
          const newStyle = {
            ...style,
            // @ts-expect-error type better later
            ...(reactNode?.props?.style ?? {})
          };
          return /*#__PURE__*/React.cloneElement(reactNode, {
            key: i,
            // @ts-expect-error type better later
            style: newStyle
          });
        }
        return /*#__PURE__*/React.cloneElement(reactNode, {
          key: i
        });
      }
      return reactNode;
    } catch (error) {
      console.error('Error converting lexical node to JSX:', error, 'node:', node);
      return null;
    }
  });
  return jsxArray.filter(Boolean);
}
//# sourceMappingURL=index.js.map