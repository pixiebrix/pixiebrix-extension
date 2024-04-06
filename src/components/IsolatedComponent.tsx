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

import React, { Suspense } from "react";
import { Stylesheets } from "@/components/Stylesheets";
import EmotionShadowRoot from "@/components/EmotionShadowRoot";
import isolatedComponentList from "./isolatedComponentList";

const MODE = process.env.SHADOW_DOM as "open" | "closed";

type LazyFactory<T> = () => Promise<{
  default: React.ComponentType<T>;
}>;

// Drop the stylesheet injected by `mini-css-extract-plugin` into the main document.
// Until this is resolved https://github.com/webpack-contrib/mini-css-extract-plugin/issues/1092#issuecomment-2037540032
async function discardStylesheetsWhilePending(
  lazyFactory: LazyFactory<unknown>,
) {
  const baseUrl = chrome.runtime.getURL("");

  const observer = new MutationObserver((mutations) => {
    // Use for of
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLLinkElement && node.href.startsWith(baseUrl)) {
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
    await lazyFactory();
  } catch {
    // React.lazy() will take care of it
  } finally {
    observer.disconnect();
  }
}

type Props<T> = {
  /**
   * It must match the `webpackChunkName` specified in the React.lazy import
   */
  webpackChunkName: string;

  /**
   * @example () => import(/* webpackChunkName: "Moon" * /, "@/components/Moon")
   */
  lazy: LazyFactory<T>;

  /**
   * If true, the component will not attempt to load the stylesheet.
   *
   * @example <IsolatedComponent webpackChunkName="Moon" noStyle>
   */
  noStyle?: boolean;

  /**
   * It must be the result of React.lazy()
   */
  factory: (
    Component: React.LazyExoticComponent<React.ComponentType<T>>,
  ) => JSX.Element;
};

/**
 * Isolate component loaded via React.lazy() in a shadow DOM, including its styles.
 *
 * @example
 * const Moon = React.lazy(() => import(
 *   /* webpackChunkName: Moon /
 *   "./Moon"
 * ));
 *
 * render(
 *   <IsolatedComponent webpackChunkName="Moon">
 *     <Moon/>
 *   </IsolatedComponent>,
 *   document.querySelector('#container'),
 * );
 */
export default function IsolatedComponent<T>({
  webpackChunkName,
  factory,
  noStyle,
  lazy,
  ...props
}: Props<T>) {
  if (
    !isolatedComponentList.some((url) => url.endsWith("/" + webpackChunkName))
  ) {
    throw new Error(
      `Isolated component "${webpackChunkName}" is not listed in isolatedComponentList.mjs. Add it there and restart webpack to create it.`,
    );
  }

  const stylesheetUrl = noStyle
    ? null
    : chrome.runtime.getURL(`${webpackChunkName}.css`);

  // `discard` one must be called before `React.lazy`
  void discardStylesheetsWhilePending(lazy);
  const LazyComponent = React.lazy(lazy);

  return (
    // `pb-name` is used to visually identify it in the dev tools
    <EmotionShadowRoot mode={MODE} pb-name={webpackChunkName} {...props}>
      <style>{cssText}</style>
      <Stylesheets href={stylesheetUrl ?? []}>
        <Suspense fallback={null}>{factory(LazyComponent)}</Suspense>
      </Stylesheets>
    </EmotionShadowRoot>
  );
}
