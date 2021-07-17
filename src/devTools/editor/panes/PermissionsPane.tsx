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
import { sleep } from "@/utils";
import Centered from "@/devTools/editor/components/Centered";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle, faShieldAlt } from "@fortawesome/free-solid-svg-icons";

import { requestPermissions } from "@/utils/permissions";

const PermissionsPane: React.FunctionComponent = () => {
  const { port, connect } = useContext(DevToolsContext);

  const requestPermissionsHandler = useCallback(async () => {
    const { url } = await getTabInfo(port);
    await requestPermissions({ origins: [url] });
    await sleep(500);
    await connect();
  }, [connect, port]);

  return (
    <Centered>
      <div className="PaneTitle">
        PixieBrix does not have access to the page
      </div>
      <p>
        <Button onClick={requestPermissionsHandler}>
          <FontAwesomeIcon icon={faShieldAlt} /> Grant Permanent Access
        </Button>
      </p>
      <p className="text-info">
        <FontAwesomeIcon icon={faInfoCircle} /> You can revoke PixieBrix&apos;s
        access to a site at any time on PixieBrix&apos;s Settings page
      </p>
      <p>
        Or, grant temporary access by 1) clicking on the PixieBrix extension
        menu item in your browser&apos;s extensions dropdown, and 2) then
        refreshing the page
      </p>
    </Centered>
  );
};

export default PermissionsPane;
