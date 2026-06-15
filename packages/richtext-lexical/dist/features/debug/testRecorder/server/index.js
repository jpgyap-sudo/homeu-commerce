import { createServerFeature } from '../../../../utilities/createServerFeature.js';
export const TestRecorderFeature = createServerFeature({
  feature: {
    ClientFeature: '@davincios/richtext-lexical/client#TestRecorderFeatureClient'
  },
  key: 'testRecorder'
});
//# sourceMappingURL=index.js.map