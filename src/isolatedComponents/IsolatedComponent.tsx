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
import EmotionShadowRoot, { styleReset } from "@/components/EmotionShadowRoot";

const MODE = process.env.SHADOW_DOM as "open" | "closed";

export const IsolatedComponent: React.VFC<{
  LazyComponent: React.LazyExoticComponent<React.FC>;
  webpackChunkName: string;
  className?: string;
}> = ({ webpackChunkName, LazyComponent, ...props }) => {
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
    <EmotionShadowRoot style={styleReset} mode={MODE} {...props}>
      <Stylesheets href={stylesheetUrl}>
        <Suspense fallback={null}>
          <LazyComponent />
        </Suspense>
      </Stylesheets>
    </EmotionShadowRoot>
  );
};
