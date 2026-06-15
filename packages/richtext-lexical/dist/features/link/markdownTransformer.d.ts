/**
 * Code taken from https://github.com/facebook/lexical/blob/main/packages/lexical-markdown/src/MarkdownTransformers.ts#L357
 */
import type { TextMatchTransformer } from '../../packages/@lexical/markdown/MarkdownTransformers.js';
import type { SerializedLinkNode } from './nodes/types.js';
export type CreateLinkMarkdownTransformerArgs = {
    /**
     * A function that receives a serialized internal link node and returns the URL string.
     * Required for internal links (linkType === 'internal') to be exported correctly, since
     * internal links store a doc reference rather than a URL.
     *
     * Without this, internal links will export as `[text]()` with an empty href.
     */
    internalDocToHref?: (args: {
        linkNode: SerializedLinkNode;
    }) => string;
};
export declare const createLinkMarkdownTransformer: (args?: CreateLinkMarkdownTransformerArgs) => TextMatchTransformer;
export declare const LinkMarkdownTransformer: TextMatchTransformer;
//# sourceMappingURL=markdownTransformer.d.ts.map