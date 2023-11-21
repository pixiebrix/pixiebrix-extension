/* eslint-disable jsx-a11y/anchor-is-valid -- options page behaves like a link */
/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

const RestrictedUrlPopupApp: React.FC = () => {
  reportEvent(Events.BROWSER_ACTION_RESTRICTED_URL);

  return (
    <div className="p-3">
      <div className="font-weight-bold">This is a restricted browser page.</div>
      <div className="mt-2">PixieBrix cannot access this page.</div>

      <div className="mt-2">
        To open the PixieBrix Sidebar, navigate to a website and then click the
        PixieBrix toolbar icon again.
      </div>

      <hr />

      <div className="mt-2">
        Looking for the Extension Console?{" "}
        <a
          href="#"
          onClick={async () => {
            await browser.runtime.openOptionsPage();
          }}
        >
          Open the Extension Console
        </a>
      </div>

      <div className="mt-2">
        Looking for the Page Editor?{" "}
        <a
          href="#"
          onClick={async () => {
            await browser.tabs.update({
              url: "https://www.pixiebrix.com/developers-welcome",
            });
            window.close();
          }}
        >
          View the Developer Welcome Page
        </a>
      </div>
    </div>
  );
};

export default RestrictedUrlPopupApp;
