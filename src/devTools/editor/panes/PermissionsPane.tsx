/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useCallback, useContext } from "react";
import { DevToolsContext } from "@/devTools/context";
import { getTabInfo } from "@/background/devtools";
import { browser } from "webextension-polyfill-ts";
import { isChrome } from "@/helpers";
import { sleep } from "@/utils";
import Centered from "@/devTools/editor/components/Centered";
import { Button } from "react-bootstrap";
import { openTab } from "@/background/executor";

const PermissionsPane: React.FunctionComponent = () => {
  const { port, connect } = useContext(DevToolsContext);

  const requestPermissions = useCallback(async () => {
    const { url } = await getTabInfo(port);
    if (isChrome) {
      await browser.permissions.request({ origins: [url] });
    } else {
      const parameters = new URLSearchParams();
      parameters.set("requestOrigins", url);
      await openTab({ url: "options.html?" + parameters.toString() });
    }
    await sleep(500);
    await connect();
  }, [connect, port]);

  return (
    <Centered>
      <div className="PaneTitle">
        PixieBrix does not have access to the page
      </div>
      <p>
        <Button onClick={requestPermissions}>Grant permanent access</Button>
      </p>
      <p>
        Or grant temporary access by 1) clicking on the PixieBrix extension in
        the extensions dropdown and 2) then refreshing the page
      </p>
    </Centered>
  );
};

export default PermissionsPane;
