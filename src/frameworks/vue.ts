// Adapted from the vue-devtools
// https://github.com/vuejs/vue-devtools/blob/6d8fee4d058716fe72825c9ae22cf831ef8f5172/packages/app-backend/src/index.js#L185

interface BaseVue {
  super?: BaseVue;
  config: unknown;
}

interface Instance {
  $root?: Instance;
  _isFragment: boolean;
  constructor: BaseVue;
  _fragmentEnd?: unknown;
}

const rootInstances: Instance[] = [];

interface VNode {
  _isVue: boolean;
  $el: HTMLElement;
}

// https://github.com/vuejs/vue-devtools/blob/dev/packages/app-backend/src/utils.js
export function findRelatedComponent(
  el: HTMLElement & { __vue__?: VNode }
): VNode {
  while (!el.__vue__ && el.parentElement) {
    el = el.parentElement;
  }
  return el.__vue__;
}

/**
 * Scan the page for root level Vue instances.
 */
export function scan(): Instance[] {
  rootInstances.length = 0;
  let inFragment = false;
  let currentFragment: Instance = null;

  function processInstance(instance: Instance) {
    if (instance) {
      if (rootInstances.indexOf(instance.$root) === -1) {
        instance = instance.$root;
      }
      if (instance._isFragment) {
        inFragment = true;
        currentFragment = instance;
      }

      let baseVue = instance.constructor;
      while (baseVue.super) {
        baseVue = baseVue.super;
      }
      if (baseVue.config) {
        rootInstances.push(instance);
      }
      return true;
    }
  }

  walk(document, function (node) {
    if (inFragment) {
      if (node === currentFragment._fragmentEnd) {
        inFragment = false;
        currentFragment = null;
      }
      return true;
    }

    const instance = (node as any).__vue__;

    return processInstance(instance);
  });

  return rootInstances;
}

/**
 * DOM walk helper
 */
function walk(node: Node | Element, fn: (node: Node) => boolean) {
  if (node.childNodes) {
    for (let i = 0, l = node.childNodes.length; i < l; i++) {
      const child = node.childNodes[i];
      const stop = fn(child);
      if (!stop) {
        walk(child, fn);
      }
    }
  }

  // also walk shadow DOM
  if (node instanceof Element && node.shadowRoot) {
    walk(node.shadowRoot, fn);
  }
}
