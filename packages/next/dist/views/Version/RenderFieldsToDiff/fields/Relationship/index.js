import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { getTranslation } from '@davincios/translations';
import { FieldDiffContainer, getHTMLDiffComponents } from '@davincios/ui/rsc';
import React from 'react';
import { generateLabelFromValue } from './generateLabelFromValue.js';
const baseClass = 'relationship-diff';
export const Relationship = ({
  comparisonValue: valueFrom,
  field,
  i18n,
  locale,
  nestingLevel,
  parentIsLocalized,
  req,
  versionValue: valueTo
}) => {
  const hasMany = 'hasMany' in field && field.hasMany ||
  // Check data structure (handles block swaps where schema may not match data)
  Array.isArray(valueFrom) || Array.isArray(valueTo);
  const polymorphic = Array.isArray(field.relationTo);
  if (hasMany) {
    return /*#__PURE__*/_jsx(ManyRelationshipDiff, {
      field: field,
      i18n: i18n,
      locale: locale,
      nestingLevel: nestingLevel,
      parentIsLocalized: parentIsLocalized,
      polymorphic: polymorphic,
      req: req,
      valueFrom: valueFrom,
      valueTo: valueTo
    });
  }
  return /*#__PURE__*/_jsx(SingleRelationshipDiff, {
    field: field,
    i18n: i18n,
    locale: locale,
    nestingLevel: nestingLevel,
    parentIsLocalized: parentIsLocalized,
    polymorphic: polymorphic,
    req: req,
    valueFrom: valueFrom,
    valueTo: valueTo
  });
};
export const SingleRelationshipDiff = async args => {
  const {
    field,
    i18n,
    locale,
    nestingLevel,
    parentIsLocalized,
    polymorphic,
    req,
    valueFrom,
    valueTo
  } = args;
  const ReactDOMServer = (await import('react-dom/server')).default;
  const localeToUse = locale ?? (req.davincios.config?.localization && req.davincios.config?.localization?.defaultLocale) ?? 'en';
  // Generate titles asynchronously before creating components
  const [titleFrom, titleTo] = await Promise.all([valueFrom ? generateLabelFromValue({
    field,
    locale: localeToUse,
    parentIsLocalized,
    req,
    value: valueFrom
  }) : Promise.resolve(null), valueTo ? generateLabelFromValue({
    field,
    locale: localeToUse,
    parentIsLocalized,
    req,
    value: valueTo
  }) : Promise.resolve(null)]);
  const FromComponent = valueFrom ? /*#__PURE__*/_jsx(RelationshipDocumentDiff, {
    field: field,
    i18n: i18n,
    locale: locale,
    parentIsLocalized: parentIsLocalized,
    polymorphic: polymorphic,
    relationTo: polymorphic ? valueFrom.relationTo : field.relationTo,
    req: req,
    showPill: true,
    title: titleFrom,
    value: valueFrom
  }) : null;
  const ToComponent = valueTo ? /*#__PURE__*/_jsx(RelationshipDocumentDiff, {
    field: field,
    i18n: i18n,
    locale: locale,
    parentIsLocalized: parentIsLocalized,
    polymorphic: polymorphic,
    relationTo: polymorphic ? valueTo.relationTo : field.relationTo,
    req: req,
    showPill: true,
    title: titleTo,
    value: valueTo
  }) : null;
  const fromHTML = FromComponent ? ReactDOMServer.renderToStaticMarkup(FromComponent) : `<p></p>`;
  const toHTML = ToComponent ? ReactDOMServer.renderToStaticMarkup(ToComponent) : `<p></p>`;
  const diff = getHTMLDiffComponents({
    fromHTML,
    toHTML,
    tokenizeByCharacter: false
  });
  return /*#__PURE__*/_jsx(FieldDiffContainer, {
    className: `${baseClass}-container ${baseClass}-container--hasOne`,
    From: diff.From,
    i18n: i18n,
    label: {
      label: field.label,
      locale
    },
    nestingLevel: nestingLevel,
    To: diff.To
  });
};
const ManyRelationshipDiff = async ({
  field,
  i18n,
  locale,
  nestingLevel,
  parentIsLocalized,
  polymorphic,
  req,
  valueFrom,
  valueTo
}) => {
  const ReactDOMServer = (await import('react-dom/server')).default;
  const fromArr = Array.isArray(valueFrom) ? valueFrom : [];
  const toArr = Array.isArray(valueTo) ? valueTo : [];
  const localeToUse = locale ?? (req.davincios.config?.localization && req.davincios.config?.localization?.defaultLocale) ?? 'en';
  // Generate all titles asynchronously before creating components
  const [titlesFrom, titlesTo] = await Promise.all([Promise.all(fromArr.map(val => generateLabelFromValue({
    field,
    locale: localeToUse,
    parentIsLocalized,
    req,
    value: val
  }))), Promise.all(toArr.map(val => generateLabelFromValue({
    field,
    locale: localeToUse,
    parentIsLocalized,
    req,
    value: val
  })))]);
  const makeNodes = (list, titles) => list.map((val, idx) => /*#__PURE__*/_jsx(RelationshipDocumentDiff, {
    field: field,
    i18n: i18n,
    locale: locale,
    parentIsLocalized: parentIsLocalized,
    polymorphic: polymorphic,
    relationTo: polymorphic ? val.relationTo : field.relationTo,
    req: req,
    showPill: polymorphic,
    title: titles[idx],
    value: val
  }, idx));
  const fromNodes = fromArr.length > 0 ? makeNodes(fromArr, titlesFrom) : /*#__PURE__*/_jsx("p", {
    className: `${baseClass}__empty`
  });
  const toNodes = toArr.length > 0 ? makeNodes(toArr, titlesTo) : /*#__PURE__*/_jsx("p", {
    className: `${baseClass}__empty`
  });
  const fromHTML = ReactDOMServer.renderToStaticMarkup(fromNodes);
  const toHTML = ReactDOMServer.renderToStaticMarkup(toNodes);
  const diff = getHTMLDiffComponents({
    fromHTML,
    toHTML,
    tokenizeByCharacter: false
  });
  return /*#__PURE__*/_jsx(FieldDiffContainer, {
    className: `${baseClass}-container ${baseClass}-container--hasMany`,
    From: diff.From,
    i18n: i18n,
    label: {
      label: field.label,
      locale
    },
    nestingLevel: nestingLevel,
    To: diff.To
  });
};
const RelationshipDocumentDiff = ({
  field,
  i18n,
  locale,
  parentIsLocalized,
  polymorphic,
  relationTo,
  req,
  showPill = false,
  title,
  value
}) => {
  let pillLabel = null;
  if (showPill) {
    const collectionConfig = req.davincios.collections[relationTo].config;
    pillLabel = collectionConfig.labels?.singular ? getTranslation(collectionConfig.labels.singular, i18n) : collectionConfig.slug;
  }
  return /*#__PURE__*/_jsxs("div", {
    className: `${baseClass}`,
    "data-enable-match": "true",
    "data-id": polymorphic ? value.value.id : value.id,
    "data-relation-to": relationTo,
    children: [pillLabel && /*#__PURE__*/_jsx("span", {
      className: `${baseClass}__pill`,
      "data-enable-match": "false",
      children: pillLabel
    }), /*#__PURE__*/_jsx("strong", {
      className: `${baseClass}__info`,
      "data-enable-match": "false",
      children: title
    })]
  });
};
//# sourceMappingURL=index.js.map