/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useCallback, useContext } from "react";
import { DevToolsContext } from "@/devTools/context";
import { getTabInfo } from "@/background/devtools";
import { browser } from "webextension-polyfill-ts";
import { sleep } from "@/utils";
import Centered from "@/devTools/editor/components/Centered";
import { Button } from "react-bootstrap";

const PermissionsPane: React.FunctionComponent = () => {
  const { port, connect } = useContext(DevToolsContext);

  const requestPermissions = useCallback(() => {
    // Firefox browser.permissions.request gets confused by async code. Must use normal promises in the
    // call path to browser.permissions.request so it knows it was triggered by a user action
    getTabInfo(port).then(({ url }) => {
      const requestPromise = browser.permissions.request({ origins: [url] });
      requestPromise.then(async () => {
        await sleep(500);
        await connect();
      });
    });
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
