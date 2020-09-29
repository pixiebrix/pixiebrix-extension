import fromPairs from "lodash/fromPairs";

interface DOMFiber {
  _instance: any;
  _currentElement: {
    _owner: DOMFiber;
  };
}

interface ComponentFiber {
  return: ComponentFiber;
  memoizedProps: { [key: string]: unknown };
}

export class ComponentNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComponentNotFoundError";
  }
}

export function readReactProps(fiber: ComponentFiber, rootProp?: string) {
  // getComponentFiber is already returning the "return" for the component
  const memoizedProps = fiber.memoizedProps;
  console.debug("Memoized props", memoizedProps);
  const props = rootProp ? memoizedProps[rootProp] : memoizedProps;
  return fromPairs(
    Object.entries(props).filter(([key, _]) => key !== "children")
  );
}

export function findReactComponent(
  dom: HTMLElement,
  traverseUp: number = 0
): ComponentFiber {
  // https://stackoverflow.com/questions/29321742/react-getting-a-component-from-a-dom-element-for-debugging
  // https://stackoverflow.com/a/39165137/402560

  const key = Object.keys(dom).find((key) =>
    key.startsWith("__reactInternalInstance$")
  );
  // @ts-ignore: works in practice
  const domFiber: DOMFiber | null = dom[key];

  if (domFiber == null) {
    throw new ComponentNotFoundError("React fiber not found at selector");
  }

  // react <16
  // TODO: find a react 15.0 app to test this on
  if (domFiber._currentElement) {
    throw new Error("Support for React <16 not implemented");
    // let componentFiber = domFiber._currentElement._owner;
    // for (let i = 0; i < traverseUp; i++) {
    //     componentFiber = componentFiber._currentElement._owner;
    // }
    // return componentFiber._instance;
  }

  // react 16+
  const getComponentFiber = (fiber: any) => {
    //return fiber._debugOwner; // this also works, but is __DEV__ only
    let parentFiber = fiber.return;
    while (typeof parentFiber.type == "string") {
      parentFiber = parentFiber.return;
    }
    return parentFiber;
  };
  let componentFiber = getComponentFiber(domFiber);
  for (let i = 0; i < traverseUp; i++) {
    componentFiber = getComponentFiber(componentFiber);
  }
  return componentFiber;
}
