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

import React, { useCallback, useContext, useState } from "react";
import { DevToolsContext } from "@/devTools/context";
import Centered from "@/devTools/editor/components/Centered";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle, faShieldAlt } from "@fortawesome/free-solid-svg-icons";
import {
  canReceiveContentScript,
  requestPermissions,
} from "@/utils/permissions";
import AsyncButton from "@/components/AsyncButton";
import { getCurrentURL } from "@/devTools/utils";
import { safeParseUrl } from "@/utils";
import { parse as parseDomain } from "psl";
import { useAsyncEffect } from "use-async-effect";

const PermissionsPane: React.FunctionComponent = () => {
  const { connect } = useContext(DevToolsContext);
  const [rejected, setRejected] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const [siteLabel, setSiteLabel] = useState("this page");

  useAsyncEffect(async (isMounted) => {
    const url = await getCurrentURL();
    if (!isMounted()) {
      return;
    }

    const { hostname } = safeParseUrl(url);
    setAllowed(canReceiveContentScript(url));
    const result = parseDomain(hostname);
    if ("domain" in result && result.domain) {
      setSiteLabel(result.domain);
    }
  }, []);

  const onRequestPermission = useCallback(async () => {
    const url = await getCurrentURL();
    if (await requestPermissions({ origins: [url] })) {
      await connect();
    } else {
      setRejected(true);
    }
  }, [connect]);

  return (
    <Centered vertically={true}>
      {allowed ? (
        <>
          <p>
            <AsyncButton onClick={onRequestPermission} className="btn-">
              <FontAwesomeIcon icon={faShieldAlt} /> Enable PixieBrix on{" "}
              {siteLabel}
            </AsyncButton>
          </p>

          <p className="text-muted small">
            Your browser will prompt you to Allow permissions. <br />
            You can revoke the permissions from PixieBrix&apos;s Settings page.
          </p>

          {rejected && (
            <p className="text-info small">
              <FontAwesomeIcon icon={faInfoCircle} />
              &nbsp; You can grant temporary permissions by clicking on the
              PixieBrix extension menu item in your browser&apos;s extensions
              dropdown.
            </p>
          )}
        </>
      ) : (
        <p>PixieBrix cannot modify web store or special browser pages</p>
      )}
    </Centered>
  );
};

export default PermissionsPane;
