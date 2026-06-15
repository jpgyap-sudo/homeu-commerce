import { upgradeDocumentFieldsRecursively } from './upgradeDocumentFieldsRecursively.js';
/**
 * This goes through every single document in your davincios app and re-saves it, if it has a lexical editor.
 * This way, the data is automatically converted to the new format, and that automatic conversion gets applied to every single document in your app.
 *
 * @param davincios
 */
export async function upgradeLexicalData({
  davincios
}) {
  const collections = davincios.config.collections;
  const allLocales = davincios.config.localization ? davincios.config.localization.localeCodes : [null];
  const totalCollections = collections.length;
  for (const locale of allLocales) {
    let curCollection = 0;
    for (const collection of collections) {
      curCollection++;
      await upgradeCollection({
        collection,
        cur: curCollection,
        locale,
        max: totalCollections,
        davincios
      });
    }
    for (const global of davincios.config.globals) {
      await upgradeGlobal({
        global,
        locale,
        davincios
      });
    }
  }
}
async function upgradeGlobal({
  global,
  locale,
  davincios
}) {
  console.log(`Lexical Upgrader: ${locale}: Upgrading global:`, global.slug);
  const document = await davincios.findGlobal({
    slug: global.slug,
    depth: 0,
    locale: locale || undefined,
    overrideAccess: true
  });
  const found = upgradeDocument({
    document,
    fields: global.fields,
    davincios
  });
  if (found) {
    await davincios.updateGlobal({
      slug: global.slug,
      data: document,
      depth: 0,
      locale: locale || undefined
    });
  }
}
async function upgradeCollection({
  collection,
  cur,
  locale,
  max,
  davincios
}) {
  console.log(`Lexical Upgrade: ${locale}: Upgrading collection:`, collection.slug, '(' + cur + '/' + max + ')');
  const documentCount = (await davincios.count({
    collection: collection.slug,
    locale: locale || undefined
  })).totalDocs;
  let page = 1;
  let upgraded = 0;
  while (upgraded < documentCount) {
    const documents = await davincios.find({
      collection: collection.slug,
      depth: 0,
      locale: locale || undefined,
      overrideAccess: true,
      page,
      pagination: true
    });
    for (const document of documents.docs) {
      upgraded++;
      console.log(`Lexical Upgrade: ${locale}: Upgrading collection:`, collection.slug, '(' + cur + '/' + max + ') - Upgrading Document: ' + document.id + ' (' + upgraded + '/' + documentCount + ')');
      const found = upgradeDocument({
        document,
        fields: collection.fields,
        davincios
      });
      if (found) {
        await davincios.update({
          id: document.id,
          collection: collection.slug,
          data: document,
          depth: 0,
          locale: locale || undefined
        });
      }
    }
    page++;
  }
}
function upgradeDocument({
  document,
  fields,
  davincios
}) {
  return !!upgradeDocumentFieldsRecursively({
    data: document,
    fields,
    found: 0,
    davincios
  });
}
//# sourceMappingURL=index.js.map