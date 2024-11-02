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

import React from "react";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import {
  DISPLAY_REASON_EXTENSION_CONSOLE,
  DISPLAY_REASON_UNKNOWN,
} from "@/tinyPages/restrictedUrlPopupConstants";
import { isBrowserSidebarTopFrame } from "@/utils/expectContext";
import { getExtensionConsoleUrl } from "@/utils/extensionUtils";
import useOnMountOnly from "@/hooks/useOnMountOnly";

// TODO: Move to utils folder after the isBrowserSidebar condition is dropped
async function openInActiveTab(event: React.MouseEvent<HTMLAnchorElement>) {
  if (event.shiftKey || event.ctrlKey || event.metaKey) {
    return;
  }

  event.preventDefault();
  await browser.tabs.update({
    url: event.currentTarget.href,
  });

  // TODO: Drop conditon after we drop the browser action popover since this
  // component will only be shown in the sidebar
  if (!isBrowserSidebarTopFrame()) {
    window.close();
  }
}

const RestrictedUrlContent: React.FC<
  React.PropsWithChildren<{ extensionConsoleLink?: boolean }>
> = ({ children, extensionConsoleLink = true }) => (
  <div className="p-3">
    {children}
    <div className="mt-2">
      To open the PixieBrix Sidebar, navigate to a website and then click the
      PixieBrix toolbar icon again.
    </div>
    <hr />

    {extensionConsoleLink && (
      <div className="mt-2">
        Looking for the Extension Console?{" "}
        <a href={getExtensionConsoleUrl()} onClick={openInActiveTab}>
          Open the Extension Console
        </a>
      </div>
    )}

    <div className="mt-2">
      Looking for the Page Editor?{" "}
      <a
        href="https://www.pixiebrix.com/developers-welcome"
        onClick={openInActiveTab}
      >
        View the Developer Welcome Page
      </a>
    </div>
  </div>
);

const RestrictedUrlPopupApp: React.FC<{
  reason: string | null;
  url: string;
}> = ({ reason = DISPLAY_REASON_UNKNOWN, url }) => {
  useOnMountOnly(() => {
    reportEvent(Events.BROWSER_ACTION_RESTRICTED_URL, {
      reason,
      url,
    });
  });

  return reason === DISPLAY_REASON_EXTENSION_CONSOLE ? (
    <RestrictedUrlContent extensionConsoleLink={false}>
      <div className="font-weight-bold">This is the Extension Console.</div>
      <div className="mt-2">PixieBrix mods cannot run on this page.</div>
    </RestrictedUrlContent>
  ) : (
    <RestrictedUrlContent>
      <div className="font-weight-bold">This is a restricted browser page.</div>
      <div className="mt-2">PixieBrix cannot access this page.</div>
    </RestrictedUrlContent>
  );
};

export default RestrictedUrlPopupApp;
