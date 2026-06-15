export async function getItemsFromConfig(defaultLayout, req, widgets) {
  let widgetInstances;
  if (typeof defaultLayout === 'function') {
    widgetInstances = await defaultLayout({
      req
    });
  } else {
    widgetInstances = defaultLayout;
  }
  return widgetInstances.map((widgetInstance, index) => {
    const widget = widgets.find(w => w.slug === widgetInstance.widgetSlug);
    return {
      id: `${widgetInstance.widgetSlug}-${index}`,
      data: widgetInstance.data,
      maxWidth: widget?.maxWidth ?? 'full',
      minWidth: widget?.minWidth ?? 'x-small',
      width: widgetInstance.width || 'x-small'
    };
  });
}
//# sourceMappingURL=getItemsFromConfig.js.map