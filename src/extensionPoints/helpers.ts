import castArray from "lodash/castArray";

export const EXTENSION_POINT_DATA_ATTR = "data-pixiebrix-extension-point";

export function isHost(hostname: string): boolean {
  return (
    window.location.hostname === hostname ||
    window.location.hostname.endsWith(`.${hostname}`)
  );
}

export function onNodeRemoved(element: Node, callback: () => void) {
  // https://stackoverflow.com/a/50397148/
  const parent = element.parentNode;
  const parentObserver = new MutationObserver((mutations, observer) => {
    for (const mutation of mutations) {
      // @ts-ignore: thought this would be fixed by changing the target to es6?
      // https://stackoverflow.com/questions/51723962/typescript-nodelistofelement-is-not-an-array-type-or-a-string-type
      for (const removedNode of mutation.removedNodes) {
        if (element === removedNode) {
          observer.disconnect();
          callback();
          break;
        }
      }
    }
  });
  parentObserver.observe(parent, { childList: true });
}

export async function _initialize(
  selector: string,
  $target: JQuery
): Promise<JQuery> {
  console.debug(`Awaiting selector ${selector}`);
  return new Promise((resolve) => {
    // @ts-ignore: no typescript definitions for https://www.npmjs.com/package/jquery.initialize
    $.initialize(
      selector,
      function () {
        resolve($(this));
      },
      { target: $target.get(0) }
    );
  });
}

/**
 * Recursively await an element using one or more JQuery selectors.
 * @param selector
 * @param rootElement
 */
export async function awaitElementOnce(
  selector: string | string[],
  rootElement: JQuery = undefined
): Promise<JQuery> {
  if (selector == null) {
    throw new Error("Expected selector");
  }

  const selectors = castArray(selector);

  console.debug(`Awaiting selector ${selectors}`);

  const $root: JQuery<any> = rootElement ? $(rootElement) : $(document);

  if (!selectors.length) {
    return $root;
  }

  const [nextSelector, ...rest] = selectors;

  // find immediately, or wait for it to be initialized
  let $nextElement = $root.find(nextSelector);
  if (!$nextElement.length) {
    $nextElement = await _initialize(nextSelector, $root);
  }

  return await awaitElementOnce(rest, $nextElement);
}

/**
 * Marks extensionPointId as owning a DOM element.
 * @param $element the JQuery selector
 * @param extensionPointId the owner extension ID
 * @param onRemove callback to call when the element is removed from the DOM
 */
export function acquireElement(
  $element: JQuery,
  extensionPointId: string,
  onRemove: () => void
): boolean {
  if ($element.length === 0) {
    console.debug(`acquireElement: no elements found for ${extensionPointId}`);
    return false;
  } else if ($element.length > 1) {
    console.debug(
      `acquireElement: multiple elements found for ${extensionPointId}`
    );
    return false;
  } else if ($element.attr(EXTENSION_POINT_DATA_ATTR)) {
    const existing = $element.attr(EXTENSION_POINT_DATA_ATTR);
    if (extensionPointId !== existing) {
      console.warn(
        `acquireElement: cannot acquire for ${extensionPointId} because has extension point ${existing} attached to it`
      );
      return false;
    }
    console.debug(
      `acquireElement: re-acquiring element for ${extensionPointId}`
    );
  }
  $element.attr(EXTENSION_POINT_DATA_ATTR, extensionPointId);
  onNodeRemoved($element.get(0), onRemove);
  return true;
}
