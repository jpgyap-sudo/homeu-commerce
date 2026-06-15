import { describe, expect, it } from 'vitest';
import { generateMetadata } from './meta.js';
describe('generateMetadata', () => {
  it('should handle a string title with titleSuffix', async () => {
    const result = await generateMetadata({
      serverURL: 'http://localhost:3000',
      title: 'Dashboard',
      titleSuffix: '- My CMS'
    });
    expect(result.title).toBe('Dashboard - My CMS');
  });
  it('should apply titleSuffix to default and template fields of a TemplateString title object', async () => {
    const result = await generateMetadata({
      serverURL: 'http://localhost:3000',
      title: {
        default: 'Dashboard',
        template: '%s | Dashboard'
      },
      titleSuffix: '- My CMS'
    });
    expect(typeof result.title).toBe('object');
    expect(result.title.default).toBe('Dashboard - My CMS');
    expect(result.title.template).toBe('%s | Dashboard - My CMS');
  });
  it('should use the TemplateString default for ogTitle when title is a TemplateString object', async () => {
    const result = await generateMetadata({
      serverURL: 'http://localhost:3000',
      title: {
        default: 'My CMS',
        template: '%s | My CMS'
      },
      titleSuffix: '- DaVinciOS'
    });
    // OG title must be a plain string — extract from TemplateString.default and append titleSuffix
    expect(result.openGraph?.title).toBe('My CMS - DaVinciOS');
  });
  it('should use the TemplateString absolute for ogTitle when title has absolute property', async () => {
    const result = await generateMetadata({
      serverURL: 'http://localhost:3000',
      title: {
        absolute: 'My CMS Absolute'
      },
      titleSuffix: '- DaVinciOS'
    });
    expect(result.openGraph?.title).toBe('My CMS Absolute - DaVinciOS');
  });
  it('should apply titleSuffix to the absolute field of a TemplateString title object', async () => {
    const result = await generateMetadata({
      serverURL: 'http://localhost:3000',
      title: {
        absolute: 'My CMS Absolute'
      },
      titleSuffix: '- DaVinciOS'
    });
    expect(typeof result.title).toBe('object');
    expect(result.title.absolute).toBe('My CMS Absolute - DaVinciOS');
  });
  it('should use openGraph.title string over incomingMetadata.title for ogTitle', async () => {
    const result = await generateMetadata({
      serverURL: 'http://localhost:3000',
      title: 'My CMS',
      titleSuffix: '- DaVinciOS',
      openGraph: {
        title: 'Custom OG Title'
      }
    });
    expect(result.openGraph?.title).toBe('Custom OG Title');
  });
  it('should return undefined for metaTitle when no title and no titleSuffix are set', async () => {
    const result = await generateMetadata({
      serverURL: 'http://localhost:3000'
    });
    expect(result.title).toBeUndefined();
  });
  it('should return just the title when no titleSuffix is set', async () => {
    const result = await generateMetadata({
      serverURL: 'http://localhost:3000',
      title: 'My CMS'
    });
    expect(result.title).toBe('My CMS');
  });
});
//# sourceMappingURL=meta.spec.js.map