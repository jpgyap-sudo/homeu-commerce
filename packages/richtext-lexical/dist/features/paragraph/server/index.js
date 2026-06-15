import { createServerFeature } from '../../../utilities/createServerFeature.js';
import { i18n } from './i18n.js';
export const ParagraphFeature = createServerFeature({
  feature: {
    ClientFeature: '@davincios/richtext-lexical/client#ParagraphFeatureClient',
    clientFeatureProps: null,
    i18n
  },
  key: 'paragraph'
});
//# sourceMappingURL=index.js.map