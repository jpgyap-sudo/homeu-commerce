import { describe, expect, it } from 'vitest';
import { getCustomCollectionViewByRoute } from './getCustomCollectionViewByRoute.js';
const gridView = {
  grid: {
    Component: '/components/views/GridView/index.js#GridView',
    exact: true,
    path: '/grid'
  }
};
const gridViewPrefixMatch = {
  grid: {
    Component: '/components/views/GridView/index.js#GridView',
    exact: false,
    path: '/grid'
  }
};
describe('getCustomCollectionViewByRoute', () => {
  describe('route matching with default /admin prefix', () => {
    it('should match a custom view at the correct path', () => {
      const result = getCustomCollectionViewByRoute({
        adminRoute: '/admin',
        baseRoute: '/collections/my-collection',
        currentRoute: '/admin/collections/my-collection/grid',
        views: gridView
      });
      expect(result.viewKey).toBe('grid');
      expect(result.view.davinciosComponent).toBeDefined();
    });
    it('should not match when the path segment does not correspond to any custom view', () => {
      const result = getCustomCollectionViewByRoute({
        adminRoute: '/admin',
        baseRoute: '/collections/my-collection',
        currentRoute: '/admin/collections/my-collection/abc123',
        views: gridView
      });
      expect(result.viewKey).toBeNull();
      expect(result.view.davinciosComponent).toBeUndefined();
    });
  });
  describe('route matching with custom adminRoute prefix', () => {
    it('should match when adminRoute is a non-default prefix', () => {
      const result = getCustomCollectionViewByRoute({
        adminRoute: '/cms',
        baseRoute: '/collections/my-collection',
        currentRoute: '/cms/collections/my-collection/grid',
        views: gridView
      });
      expect(result.viewKey).toBe('grid');
      expect(result.view.davinciosComponent).toBeDefined();
    });
    it('should match when adminRoute is /', () => {
      const result = getCustomCollectionViewByRoute({
        adminRoute: '/',
        baseRoute: '/collections/my-collection',
        currentRoute: '/collections/my-collection/grid',
        views: gridView
      });
      expect(result.viewKey).toBe('grid');
      expect(result.view.davinciosComponent).toBeDefined();
    });
  });
  describe('route matching with exact: false (prefix matching)', () => {
    it('should match a sub-path when exact is false', () => {
      const result = getCustomCollectionViewByRoute({
        adminRoute: '/admin',
        baseRoute: '/collections/my-collection',
        currentRoute: '/admin/collections/my-collection/grid/detail',
        views: gridViewPrefixMatch
      });
      expect(result.viewKey).toBe('grid');
      expect(result.view.davinciosComponent).toBeDefined();
    });
    it('should match the exact path when exact is false', () => {
      const result = getCustomCollectionViewByRoute({
        adminRoute: '/admin',
        baseRoute: '/collections/my-collection',
        currentRoute: '/admin/collections/my-collection/grid',
        views: gridViewPrefixMatch
      });
      expect(result.viewKey).toBe('grid');
      expect(result.view.davinciosComponent).toBeDefined();
    });
    it('should not match an unrelated path when exact is false', () => {
      const result = getCustomCollectionViewByRoute({
        adminRoute: '/admin',
        baseRoute: '/collections/my-collection',
        currentRoute: '/admin/collections/my-collection/map',
        views: gridViewPrefixMatch
      });
      expect(result.viewKey).toBeNull();
      expect(result.view.davinciosComponent).toBeUndefined();
    });
  });
  describe('edge cases', () => {
    it('should return no match when views is undefined', () => {
      const result = getCustomCollectionViewByRoute({
        adminRoute: '/admin',
        baseRoute: '/collections/my-collection',
        currentRoute: '/admin/collections/my-collection/grid',
        views: undefined
      });
      expect(result.viewKey).toBeNull();
      expect(result.view.davinciosComponent).toBeUndefined();
    });
    it('should not match built-in "edit" or "list" keys', () => {
      const viewsWithBuiltins = {
        edit: {
          default: {
            Component: '/components/views/Edit/index.js#EditView'
          }
        },
        list: {
          Component: '/components/views/List/index.js#ListView'
        }
      };
      const result = getCustomCollectionViewByRoute({
        adminRoute: '/admin',
        baseRoute: '/collections/my-collection',
        currentRoute: '/admin/collections/my-collection/edit',
        views: viewsWithBuiltins
      });
      expect(result.viewKey).toBeNull();
    });
    it('should not match a custom view that has no path defined', () => {
      const viewsWithNoPath = {
        grid: {
          Component: '/components/views/GridView/index.js#GridView'
        }
      };
      const result = getCustomCollectionViewByRoute({
        adminRoute: '/admin',
        baseRoute: '/collections/my-collection',
        currentRoute: '/admin/collections/my-collection/grid',
        views: viewsWithNoPath
      });
      expect(result.viewKey).toBeNull();
    });
    it('should match the correct view when multiple custom views are defined', () => {
      const multipleViews = {
        grid: {
          Component: '/components/views/GridView/index.js#GridView',
          exact: true,
          path: '/grid'
        },
        map: {
          Component: '/components/views/MapView/index.js#MapView',
          exact: true,
          path: '/map'
        }
      };
      const gridResult = getCustomCollectionViewByRoute({
        adminRoute: '/admin',
        baseRoute: '/collections/my-collection',
        currentRoute: '/admin/collections/my-collection/grid',
        views: multipleViews
      });
      expect(gridResult.viewKey).toBe('grid');
      const mapResult = getCustomCollectionViewByRoute({
        adminRoute: '/admin',
        baseRoute: '/collections/my-collection',
        currentRoute: '/admin/collections/my-collection/map',
        views: multipleViews
      });
      expect(mapResult.viewKey).toBe('map');
    });
  });
});
//# sourceMappingURL=getCustomCollectionViewByRoute.spec.js.map