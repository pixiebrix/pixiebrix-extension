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

import React, { useState } from "react";
import { castArray, uniq } from "lodash";
import oneEvent from "one-event";
import { assertNotNullish } from "@/utils/nullishUtils";

/**
 * Detect and extract font-face rules because Chrome fails to load them from
 * the shadow DOM's stylesheets: https://issues.chromium.org/issues/41085401
 */
async function extractFontFaceRulesToMainDocument(
  link: HTMLLinkElement | null,
) {
  const isShadowRoot = link?.getRootNode() instanceof ShadowRoot;
  if (!isShadowRoot) {
    return;
  }

  if (!link.sheet) {
    await oneEvent(link, "load");
    assertNotNullish(link.sheet, "The stylesheet wasn't parsed after loading");
  }

  const fontFaceStylesheet = new CSSStyleSheet();
  for (const rule of link.sheet.cssRules) {
    if (rule instanceof CSSFontFaceRule) {
      fontFaceStylesheet.insertRule(rule.cssText);
    }
  }

  document.adoptedStyleSheets.push(fontFaceStylesheet);
}

/**
 * Loads one or more stylesheets and hides the content until they're done loading.
 *
 * Does not support changing the initial href(s)
 */
export const Stylesheets: React.FC<
  React.PropsWithChildren<{
    href?: string | string[];
    /**
     * If true, we mount the component after the stylesheets are loaded.
     * Chrome doesn't focus on the hidden elements so we want to make sure that component is rendered after the stylesheets are loaded.
     * If false, we mount the component immediately.
     * Include the DOM to start loading the subresources too
     */
    mountOnLoad?: boolean;
  }>
> = ({ href, children, mountOnLoad = false }) => {
  const [resolved, setResolved] = useState<string[]>([]);
  if (!href?.length) {
    // Shortcut if no stylesheets are needed
    return <>{children}</>;
  }

  const urls = uniq(castArray(href));
  const allResolved = urls.every((url) => resolved.includes(url));

  return (
    <>
      {urls.map((href) => {
        const resolve = () => {
          setResolved((prev) => [...prev, href]);
        };

        return (
          <link
            rel="stylesheet"
            ref={extractFontFaceRulesToMainDocument}
            href={href}
            key={href}
            onLoad={resolve}
            // The content must be shown even if this fails
            onError={resolve}
          />
        );
      })}
      {mountOnLoad ? (
        allResolved && <div>{children}</div>
      ) : (
        <div hidden={!allResolved}>{children}</div>
      )}
    </>
  );
};
