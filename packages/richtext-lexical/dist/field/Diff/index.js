import { jsx as _jsx } from "react/jsx-runtime";
import { FieldDiffContainer, getHTMLDiffComponents } from '@davincios/ui/rsc';
import '../bundled.css';
import { formatAdminURL } from 'davincios/shared';
import React from 'react';
import { convertLexicalToHTMLAsync } from '../../features/converters/lexicalToHtml/async/index.js';
import { getDaVinciOSPopulateFn } from '../../features/converters/utilities/davinciosPopulateFn.js';
import { LinkDiffHTMLConverterAsync } from './converters/link.js';
import { ListItemDiffHTMLConverterAsync } from './converters/listitem/index.js';
import { RelationshipDiffHTMLConverterAsync } from './converters/relationship/index.js';
import { UnknownDiffHTMLConverterAsync } from './converters/unknown/index.js';
import { UploadDiffHTMLConverterAsync } from './converters/upload/index.js';
const baseClass = 'lexical-diff';
export const LexicalDiffComponent = async args => {
  const {
    comparisonValue: valueFrom,
    field,
    i18n,
    locale,
    nestingLevel,
    req,
    versionValue: valueTo
  } = args;
  const internalDocToHref = async ({
    linkNode,
    populate
  }) => {
    if (!linkNode.fields.doc) {
      return '#';
    }
    const {
      relationTo,
      value
    } = linkNode.fields.doc;
    let docId;
    if (typeof value === 'object' && value !== null) {
      docId = value.id;
    } else if (populate && typeof value !== 'object') {
      const doc = await populate({
        id: value,
        collectionSlug: relationTo
      });
      if (!doc || !doc.id) {
        return '#';
      }
      docId = doc.id;
    } else {
      docId = value;
    }
    return formatAdminURL({
      adminRoute: req.davincios.config.routes.admin,
      path: `/collections/${relationTo}/${docId}`,
      serverURL: req.davincios.config.serverURL
    });
  };
  const converters = ({
    defaultConverters
  }) => ({
    ...defaultConverters,
    ...LinkDiffHTMLConverterAsync({
      internalDocToHref
    }),
    ...ListItemDiffHTMLConverterAsync,
    ...UploadDiffHTMLConverterAsync({
      i18n,
      req
    }),
    ...RelationshipDiffHTMLConverterAsync({
      i18n,
      req
    }),
    ...UnknownDiffHTMLConverterAsync({
      i18n,
      req
    })
  });
  const davinciosPopulateFn = await getDaVinciOSPopulateFn({
    currentDepth: 0,
    depth: 1,
    req
  });
  const fromHTML = await convertLexicalToHTMLAsync({
    converters,
    data: valueFrom,
    disableContainer: true,
    populate: davinciosPopulateFn
  });
  const toHTML = await convertLexicalToHTMLAsync({
    converters,
    data: valueTo,
    disableContainer: true,
    populate: davinciosPopulateFn
  });
  const {
    From,
    To
  } = getHTMLDiffComponents({
    // Ensure empty paragraph is displayed for empty rich text fields - otherwise, toHTML may be displayed in the wrong column
    fromHTML: fromHTML?.length ? fromHTML : '<p></p>',
    toHTML: toHTML?.length ? toHTML : '<p></p>'
  });
  return /*#__PURE__*/_jsx(FieldDiffContainer, {
    className: baseClass,
    From: From,
    i18n: i18n,
    label: {
      label: field.label,
      locale
    },
    nestingLevel: nestingLevel,
    To: To
  });
};
//# sourceMappingURL=index.js.map