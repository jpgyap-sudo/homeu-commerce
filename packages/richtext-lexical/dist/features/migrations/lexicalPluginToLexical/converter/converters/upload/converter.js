/* eslint-disable @typescript-eslint/no-explicit-any */export const UploadConverter = {
  converter({
    lexicalPluginNode
  }) {
    let fields = {};
    if (lexicalPluginNode?.caption?.editorState) {
      fields = {
        caption: lexicalPluginNode?.caption
      };
    }
    return {
      type: 'upload',
      fields,
      format: lexicalPluginNode?.format || '',
      relationTo: lexicalPluginNode?.rawImageDaVinciOS?.relationTo,
      value: lexicalPluginNode?.rawImageDaVinciOS?.value?.id || '',
      version: 2
    };
  },
  nodeTypes: ['upload']
};
//# sourceMappingURL=converter.js.map