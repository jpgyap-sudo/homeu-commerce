import { createHash } from 'crypto';
import escapeHTML from 'escape-html';
import { sanitizeUrl } from '@davincios/cms/shared';
export const LinkDiffHTMLConverterAsync = ({
  internalDocToHref
}) => ({
  autolink: async ({
    node,
    nodesToHTML,
    providedStyleTag
  }) => {
    const children = (await nodesToHTML({
      nodes: node.children
    })).join('');
    // hash fields to ensure they are diffed if they change
    const nodeFieldsHash = createHash('sha256').update(JSON.stringify(node.fields)).digest('hex');
    const href = escapeHTML(sanitizeUrl(node.fields.url ?? ''));
    return `<a${providedStyleTag} data-fields-hash="${nodeFieldsHash}" data-enable-match="true" href="${href}"${node.fields.newTab ? ' rel="noopener noreferrer" target="_blank"' : ''}>
        ${children}
      </a>`;
  },
  link: async ({
    node,
    nodesToHTML,
    populate,
    providedStyleTag
  }) => {
    const children = (await nodesToHTML({
      nodes: node.children
    })).join('');
    let href = node.fields.url ?? '';
    if (node.fields.linkType === 'internal') {
      if (internalDocToHref) {
        href = await internalDocToHref({
          linkNode: node,
          populate
        });
      } else {
        // eslint-disable-next-line no-console
        console.error('Lexical => HTML converter: Link converter: found internal link, but internalDocToHref is not provided');
        href = '#'; // fallback
      }
    }
    // hash fields to ensure they are diffed if they change
    const nodeFieldsHash = createHash('sha256').update(JSON.stringify(node.fields ?? {})).digest('hex');
    const safeHref = escapeHTML(sanitizeUrl(href));
    return `<a${providedStyleTag} data-fields-hash="${nodeFieldsHash}" data-enable-match="true" href="${safeHref}"${node.fields.newTab ? ' rel="noopener noreferrer" target="_blank"' : ''}>
        ${children}
      </a>`;
  }
});
//# sourceMappingURL=link.js.map