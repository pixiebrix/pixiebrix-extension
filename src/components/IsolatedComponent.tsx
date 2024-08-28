/*
 * Copyright (C) 2024 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// This cannot be a CSS module or URL because it must live inside the
// shadow DOM and synchronously set the :host element style.
import cssText from "./IsolatedComponent.scss?loadAsText";

import React, { Suspense, useMemo } from "react";
import { Stylesheets } from "@/components/Stylesheets";
import EmotionShadowRoot from "@/components/EmotionShadowRoot";
import isolatedComponentList from "./isolatedComponentList";

const MODE = process.env.SHADOW_DOM as "open" | "closed";

type LazyFactory<T> = () => Promise<{
  default: React.ComponentType<T>;
}>;

/**
 * Drop the stylesheet injected by `mini-css-extract-plugin` into the main document.
 *
 * @warning The `lazyFactory` function should never be called outside `discardStylesheetsWhilePending`
 * because this helper must catch the stylesheets injected when the factory is first called.
 */
async function discardStylesheetsWhilePending(
  lazyFactory: LazyFactory<unknown>,
) {
  const baseUrl = chrome.runtime.getURL("css");

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (
          node instanceof HTMLLinkElement &&
          // (node.href.startsWith(`${baseUrl}/isolated`) ||
          //   node.href.startsWith(`${baseUrl}/src`))
          node.href.startsWith(baseUrl) &&
          node.href !== `${baseUrl}/ActivatePanels.css`
        ) {
          // Disable stylesheet without removing it. Webpack still awaits its loading.
          node.media = "not all";
          node.dataset.pixiebrix = "Disabled by IsolatedComponent";
        }
      }
    }
  });

  observer.observe(document.head, {
    childList: true,
  });

  // Call and discard. React.lazy() will call it again and use the result or the error.
  // This is fine because import() does not re-fetch/re-run the module.
  try {
    // The function must be first called *after* the observer is set up.
    await lazyFactory();
  } catch {
    // React.lazy() will take care of it
  } finally {
    observer.disconnect();
  }
}

type Props<T> = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  /**
   * It must match the `import()`ed component's filename
   */
  name: string;

  /**
   * It must follow the format `isolated/${name}` specified above
   * @example () => import(/* webpackChunkName: "isolated/Moon" * /, "@/components/Moon")
   */
  lazy: LazyFactory<T>;

  /**
   * A function that provides the loaded component as an argument, and calls it
   * @example (Moon) => <Moon size={5} />
   */
  factory: (
    Component: React.LazyExoticComponent<React.ComponentType<T>>,
  ) => JSX.Element;

  /**
   * If true, the component will not attempt to load the stylesheet.
   *
   * @example <IsolatedComponent name="Moon" noStyle>
   */
  noStyle?: boolean;
};

/**
 * Isolate component loaded via React.lazy() in a shadow DOM, including its styles.
 *
 * Additional props will be passed to the Shadow DOM root element.
 *
 * @example
 * render(
 *   <IsolatedComponent
 *     name="Moon"
 *     lazy={() => import(/* webpackChunkName: "isolated/Moon" * / "@/components/Moon")}
 *     factory={(Moon) => <Moon size={56} />}
 *   />,
 *   document.querySelector('#container'),
 * );
 */
export default function IsolatedComponent<T>({
  name,
  factory,
  noStyle,
  lazy,
  ...props
}: Props<T>) {
  if (!isolatedComponentList.some((url) => url.endsWith("/" + name))) {
    throw new Error(
      `Isolated component "${name}" is not listed in isolatedComponentList.mjs. Add it there and restart webpack to create it.`,
    );
  }

  // `discard` must be called before `React.lazy`.
  // `discardStylesheetsWhilePending` is needed until this is resolved https://github.com/webpack-contrib/mini-css-extract-plugin/issues/1092#issuecomment-2037540032
  void discardStylesheetsWhilePending(lazy);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- lazy is a function that should always return the same value, but is not guaranteed to be referentially equal
  const LazyComponent = useMemo(() => React.lazy(lazy), []);

  const stylesheetUrl = noStyle ? null : chrome.runtime.getURL(`${name}.css`);

  return (
    // `pb-name` is used to visually identify it in the dev tools
    <EmotionShadowRoot mode={MODE} pb-name={name} {...props}>
      <style>{cssText}</style>
      <Stylesheets href={stylesheetUrl ?? []}>
        {/* Must call the factory on each render to pick up changes to the component props */}
        <Suspense fallback={null}>{factory(LazyComponent)}</Suspense>
      </Stylesheets>
    </EmotionShadowRoot>
  );
}
