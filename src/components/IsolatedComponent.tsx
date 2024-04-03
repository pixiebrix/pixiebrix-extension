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

import React, { Suspense, useEffect } from "react";
import { Stylesheets } from "@/components/Stylesheets";
import EmotionShadowRoot from "@/components/EmotionShadowRoot";
import { css } from "code-tag";

const MODE = process.env.SHADOW_DOM as "open" | "closed";

const styleReset = css`
  :host {
    all: initial;
    font: 16px / 1.5 sans-serif;
    color-scheme: light;
  }
  :host::selection {
    background: initial;
  }
`;

/**
 * Isolate component loaded via React.lazy() in a shadow DOM, including its styles.
 *
 * @example
 * const Component = React.lazy(() => import(
 *   /* webpackChunkName: Component /
 *   "./Component"
 * ));
 *
 * render(
 *   <IsolatedComponent
 *     webpackChunkName="Component"
 *     className="my-class"
 *   ><Component/></IsolatedComponent>,
 *   document.querySelector('#container')
 * )
 */
export const IsolatedComponent: React.VFC<{
  /**
   * It must match the `webpackChunkName` specified in the React.lazy import
   */
  webpackChunkName: string;

  /**
   * It must be the result of React.lazy()
   */
  children: JSX.Element;

  className?: string;
}> = ({ webpackChunkName, children, ...props }) => {
  const stylesheetUrl = chrome.runtime.getURL(`css/${webpackChunkName}.css`);
  useEffect(() => {
    const observer = new MutationObserver(([mutations]) => {
      const link = document.head.querySelector<HTMLLinkElement>(
        `link[href="${stylesheetUrl}"]`,
      );
      if (link) {
        // Disable stylesheet without removing it. Webpack still awaits its loading.
        link.media = "not all";
        observer.disconnect();
      }
    });
    observer.observe(document.head, { childList: true });
    return () => {
      observer.disconnect();
    };
  });

  return (
    <EmotionShadowRoot mode={MODE} {...props}>
      <style>{styleReset}</style>
      <Stylesheets href={stylesheetUrl}>
        <Suspense fallback={null}>{children}</Suspense>
      </Stylesheets>
    </EmotionShadowRoot>
  );
};
