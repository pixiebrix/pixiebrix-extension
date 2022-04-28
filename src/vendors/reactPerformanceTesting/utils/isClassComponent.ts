export const isClassComponent = (
  Component: React.ElementType<React.ComponentClass | React.FunctionComponent>
): Component is React.ComponentClass =>
  Component.prototype && Boolean(Component.prototype.isReactComponent);
