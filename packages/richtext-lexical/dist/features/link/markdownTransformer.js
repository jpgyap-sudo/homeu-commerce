/**
 * Code taken from https://github.com/facebook/lexical/blob/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L357
 */ // Order of text transformers matters:
//
// - code should go first as it prevents any transformations inside
import { $createTextNode } from 'lexical';
import { sanitizeUrl } from '../../lexical/utils/url.js';
import { $createLinkNode, $isLinkNode, LinkNode } from './nodes/LinkNode.js';
const replaceTransformer = (textNode, match) => {
  const [, linkText, linkUrl] = match;
  const linkNode = $createLinkNode({
    fields: {
      doc: null,
      linkType: 'custom',
      newTab: false,
      url: linkUrl
    }
  });
  const linkTextNode = $createTextNode(linkText);
  linkTextNode.setFormat(textNode.getFormat());
  linkNode.append(linkTextNode);
  textNode.replace(linkNode);
  return linkTextNode;
};
export const createLinkMarkdownTransformer = args => ({
  type: 'text-match',
  dependencies: [LinkNode],
  export: (_node, exportChildren) => {
    if (!$isLinkNode(_node)) {
      return null;
    }
    const node = _node;
    const fields = node.getFields();
    let url;
    if (fields.linkType === 'internal') {
      if (args?.internalDocToHref) {
        url = sanitizeUrl(args.internalDocToHref({
          linkNode: node.exportJSON()
        }));
      } else {
        // eslint-disable-next-line no-console
        console.warn('Lexical → Markdown converter: found internal link but internalDocToHref is not provided — link will have an empty href');
        url = '';
      }
    } else {
      url = sanitizeUrl(fields.url ?? '');
    }
    const textContent = exportChildren(node);
    return `[${textContent}](${url})`;
  },
  importRegExp: /(?<!!)\[([^[]+)\]\(([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?\)/,
  regExp: /(?<!!)\[([^[]+)\]\(([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?\)$/,
  replace: replaceTransformer,
  trigger: ')'
});
export const LinkMarkdownTransformer = createLinkMarkdownTransformer();
//# sourceMappingURL=markdownTransformer.js.map