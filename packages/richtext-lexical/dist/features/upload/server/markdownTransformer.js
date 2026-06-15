import { $createUploadServerNode, $isUploadServerNode, UploadServerNode } from './nodes/UploadNode.js';
/** Matches upload placeholder written by export: ![relationTo:id]() */
const UPLOAD_PLACEHOLDER_REGEX = /!\[([^\]:]+):([^\]]+)\]\(\)/;
export const UploadMarkdownTransformer = {
  type: 'element',
  dependencies: [UploadServerNode],
  export: node => {
    if (!$isUploadServerNode(node)) {
      return null;
    }
    const data = node.getData();
    const value = data?.value;
    // When the value is a populated document object (not just an ID),
    // we can extract the URL and alt text
    if (value && typeof value === 'object' && 'url' in value) {
      const url = value.url;
      const alt = data.fields?.alt || value.alt || value.filename || '';
      if (value.mimeType) {
        const mimeType = value.mimeType;
        // For non-image uploads, output a link instead of an image
        if (!mimeType.startsWith('image')) {
          const filename = value.filename || url;
          return `[${filename}](${url})`;
        }
      }
      return `![${alt}](${url})`;
    }
    // When value is just an ID (not populated), output a reference placeholder
    // so the upload is not silently dropped from the markdown output
    const id = typeof value === 'object' ? value?.id : value;
    return `![${data.relationTo}:${id}]()`;
  },
  regExp: UPLOAD_PLACEHOLDER_REGEX,
  replace: (parentNode, _children, match, isImport) => {
    if (!isImport || !match[1] || !match[2]) {
      return false;
    }
    const relationTo = match[1];
    const value = match[2];
    const id = /^\d+$/.test(value) ? Number(value) : value;
    const node = $createUploadServerNode({
      data: {
        fields: {},
        relationTo,
        value: id
      }
    });
    parentNode.replace(node);
    return true;
  }
};
//# sourceMappingURL=markdownTransformer.js.map