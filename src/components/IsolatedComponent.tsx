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

import React, { Suspense, useEffect } from "react";
import { Stylesheets } from "@/components/Stylesheets";
import EmotionShadowRoot from "@/components/EmotionShadowRoot";

const MODE = process.env.SHADOW_DOM as "open" | "closed";

function deactivateGlobalStyle(href: string): boolean {
  const link = document.head.querySelector<HTMLLinkElement>(
    `link[href="${href}"]`,
  );

  if (link) {
    // Disable stylesheet without removing it. Webpack still awaits its loading.
    link.media = "not all";
    return true;
  }

  return false;
}

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
export const IsolatedComponent: React.VFC<{
  /**
   * It must match the `webpackChunkName` specified in the React.lazy import
   */
  webpackChunkName: string;

  /**
   * If true, the component will not attempt to load the stylesheet.
   *
   * @example <IsolatedComponent webpackChunkName="Moon" noStyle>
   */
  noStyle?: boolean;

  /**
   * It must be the result of React.lazy()
   */
  children: JSX.Element;
}> = ({ webpackChunkName, children, noStyle, ...props }) => {
  const stylesheetUrl = noStyle
    ? null
    : chrome.runtime.getURL(`css/${webpackChunkName}.css`);

  // Drop the stylesheet injected by `mini-css-extract-plugin` into the main document.
  useEffect(() => {
    if (!stylesheetUrl) {
      // This component doesn't generate any stylesheets
      return;
    }

    if (deactivateGlobalStyle(stylesheetUrl)) {
      // This stylesheet is injected only once per document, don't await further injections.
      return;
    }

    const observer = new MutationObserver(() => {
      if (deactivateGlobalStyle(stylesheetUrl)) {
        observer.disconnect();
      }
    });
    observer.observe(document.head, { childList: true });
    return () => {
      observer.disconnect();
    };
  });

  return (
    // `pb-name` is used to visually identify it in the dev tools
    <EmotionShadowRoot mode={MODE} pb-name={webpackChunkName} {...props}>
      <style>{cssText}</style>
      <Stylesheets href={stylesheetUrl ?? []}>
        <Suspense fallback={null}>{children}</Suspense>
      </Stylesheets>
    </EmotionShadowRoot>
  );
};
