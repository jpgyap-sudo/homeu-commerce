import escapeHTML from 'escape-html';
export const UploadHTMLConverter = {
  upload: ({
    node,
    providedStyleTag
  }) => {
    const uploadNode = node;
    let uploadDoc = undefined;
    // If there's no valid upload data, populate return an empty string
    if (typeof uploadNode.value !== 'object') {
      return '';
    } else {
      uploadDoc = uploadNode.value;
    }
    if (!uploadDoc) {
      return '';
    }
    const alt = escapeHTML(node.fields?.alt || uploadDoc?.alt || '');
    const url = escapeHTML(uploadDoc.url ?? '');
    // 1) If upload is NOT an image, return a link
    if (!uploadDoc.mimeType.startsWith('image')) {
      return `<a${providedStyleTag} href="${url}" rel="noopener noreferrer">${escapeHTML(uploadDoc.filename ?? '')}</a>`;
    }
    // 2) If image has no different sizes, return a simple <img />
    if (!uploadDoc.sizes || !Object.keys(uploadDoc.sizes).length) {
      return `
        <img${providedStyleTag}
          alt="${alt}"
          height="${escapeHTML(String(uploadDoc.height ?? ''))}"
          src="${url}"
          width="${escapeHTML(String(uploadDoc.width ?? ''))}"
        />
      `;
    }
    // 3) If image has different sizes, build a <picture> element with <source> tags
    let pictureHTML = '';
    for (const size in uploadDoc.sizes) {
      const imageSize = uploadDoc.sizes[size];
      if (!imageSize || !imageSize.width || !imageSize.height || !imageSize.mimeType || !imageSize.filesize || !imageSize.filename || !imageSize.url) {
        continue;
      }
      pictureHTML += `
        <source
          media="(max-width: ${escapeHTML(String(imageSize.width))}px)"
          srcset="${escapeHTML(imageSize.url)}"
          type="${escapeHTML(imageSize.mimeType)}"
        />
      `;
    }
    pictureHTML += `
      <img
        alt="${alt}"
        height="${escapeHTML(String(uploadDoc.height ?? ''))}"
        src="${url}"
        width="${escapeHTML(String(uploadDoc.width ?? ''))}"
      />
    `;
    return `<picture${providedStyleTag}>${pictureHTML}</picture>`;
  }
};
//# sourceMappingURL=upload.js.map