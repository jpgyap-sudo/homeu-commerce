import type { ClientBlock } from 'payload';
import React from 'react';
/**
 * Get the appropriate icon component for a block in Lexical editor menus/toolbars.
 *
 * Priority for URL: images.icon > images.thumbnail > imageURL (deprecated)
 * Priority for alt: images.icon.alt > images.thumbnail.alt > imageAltText (deprecated)
 */
export declare function getBlockImageComponent(block: ClientBlock, fallback: React.ElementType): React.ElementType<any, keyof React.JSX.IntrinsicElements> | (() => React.JSX.Element);
//# sourceMappingURL=getBlockImageComponent.d.ts.map