'use client';

import { c as _c } from "react/compiler-runtime";
import { jsx as _jsx } from "react/jsx-runtime";
import { createElement as _createElement } from "react";
import { ShimmerEffect, useConfig } from '@davincios/ui';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { defaultEditorLexicalConfig } from '../lexical/config/client/default.js';
import { loadClientFeatures } from '../lexical/config/client/loader.js';
import { sanitizeClientEditorConfig } from '../lexical/config/client/sanitize.js';
import { RichTextViewProvider, useRichTextView } from './RichTextViewProvider.js';
const RichTextEditor = /*#__PURE__*/lazy(() => import('./Field.js').then(module => ({
  default: module.RichText
})));
export const RichTextField = props => {
  return /*#__PURE__*/_jsx(RichTextViewProvider, {
    inheritable: true,
    views: props.views,
    children: /*#__PURE__*/_jsx(RichTextFieldImpl, {
      ...props
    })
  });
};
export const RichTextFieldImpl = props => {
  const $ = _c(23);
  const {
    admin: t0,
    clientFeatures,
    featureClientImportMap: t1,
    featureClientSchemaMap,
    field,
    lexicalEditorConfig: t2,
    schemaPath,
    views
  } = props;
  let t3;
  if ($[0] !== t0) {
    t3 = t0 === undefined ? {} : t0;
    $[0] = t0;
    $[1] = t3;
  } else {
    t3 = $[1];
  }
  const _admin = t3;
  let t4;
  if ($[2] !== t1) {
    t4 = t1 === undefined ? {} : t1;
    $[2] = t1;
    $[3] = t4;
  } else {
    t4 = $[3];
  }
  const featureClientImportMap = t4;
  const _lexicalEditorConfig = t2 === undefined ? defaultEditorLexicalConfig : t2;
  const {
    currentView
  } = useRichTextView();
  const currentViewAdminConfig = views?.[currentView]?.admin ?? _admin;
  const viewLexical = views?.[currentView]?.lexical;
  let t5;
  if ($[4] !== _lexicalEditorConfig || $[5] !== viewLexical) {
    t5 = typeof viewLexical === "function" ? viewLexical(_lexicalEditorConfig) : viewLexical ?? _lexicalEditorConfig;
    $[4] = _lexicalEditorConfig;
    $[5] = viewLexical;
    $[6] = t5;
  } else {
    t5 = $[6];
  }
  const currentViewLexicalEditorConfig = t5;
  const {
    config
  } = useConfig();
  const [finalSanitizedEditorConfig, setFinalSanitizedEditorConfig] = useState(null);
  let t6;
  let t7;
  if ($[7] !== clientFeatures || $[8] !== config || $[9] !== currentView || $[10] !== currentViewAdminConfig || $[11] !== currentViewLexicalEditorConfig || $[12] !== featureClientImportMap || $[13] !== featureClientSchemaMap || $[14] !== field || $[15] !== finalSanitizedEditorConfig || $[16] !== schemaPath || $[17] !== views) {
    t6 = () => {
      if (finalSanitizedEditorConfig && finalSanitizedEditorConfig.view === currentView) {
        return;
      }
      const currentViewConfig = views?.[currentView];
      const filteredClientFeatures = currentViewConfig?.filterFeatures ? currentViewConfig.filterFeatures(clientFeatures) : clientFeatures;
      const featureProvidersLocal = [];
      for (const clientFeature of Object.values(filteredClientFeatures)) {
        if (!clientFeature.clientFeatureProvider) {
          continue;
        }
        featureProvidersLocal.push(clientFeature.clientFeatureProvider(clientFeature.clientFeatureProps));
      }
      const resolvedClientFeatures = loadClientFeatures({
        config,
        featureClientImportMap,
        featureClientSchemaMap,
        field,
        schemaPath: schemaPath ?? field.name,
        unSanitizedEditorConfig: {
          features: featureProvidersLocal,
          lexical: currentViewLexicalEditorConfig
        }
      });
      setFinalSanitizedEditorConfig(sanitizeClientEditorConfig(resolvedClientFeatures, currentViewLexicalEditorConfig, currentViewAdminConfig, currentView));
    };
    t7 = [currentViewAdminConfig, clientFeatures, config, featureClientImportMap, featureClientSchemaMap, field, finalSanitizedEditorConfig, currentViewLexicalEditorConfig, schemaPath, currentView, views];
    $[7] = clientFeatures;
    $[8] = config;
    $[9] = currentView;
    $[10] = currentViewAdminConfig;
    $[11] = currentViewLexicalEditorConfig;
    $[12] = featureClientImportMap;
    $[13] = featureClientSchemaMap;
    $[14] = field;
    $[15] = finalSanitizedEditorConfig;
    $[16] = schemaPath;
    $[17] = views;
    $[18] = t6;
    $[19] = t7;
  } else {
    t6 = $[18];
    t7 = $[19];
  }
  useEffect(t6, t7);
  let t8;
  if ($[20] !== finalSanitizedEditorConfig || $[21] !== props) {
    t8 = _jsx(Suspense, {
      fallback: _jsx(ShimmerEffect, {
        height: "35vh"
      }),
      children: finalSanitizedEditorConfig && _createElement(RichTextEditor, {
        ...props,
        editorConfig: finalSanitizedEditorConfig,
        key: finalSanitizedEditorConfig.view
      })
    });
    $[20] = finalSanitizedEditorConfig;
    $[21] = props;
    $[22] = t8;
  } else {
    t8 = $[22];
  }
  return t8;
};
//# sourceMappingURL=index.js.map