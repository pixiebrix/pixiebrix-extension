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

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useCallback, useMemo, useState } from "react";
import { faShieldAlt } from "@fortawesome/free-solid-svg-icons";
import AsyncButton from "@/components/AsyncButton";
import { Button } from "react-bootstrap";
import Centered from "@/devTools/editor/components/Centered";
import { reportError } from "@/telemetry/logging";
import { browser, Manifest } from "webextension-polyfill-ts";
import { getErrorMessage } from "@/errors";
import { selectOptionalPermissions } from "@/permissions";

const PermissionsPopup: React.FC = () => {
  const [rejected, setRejected] = useState(false);
  const [error, setError] = useState<string>();

  const origins = useMemo<string[]>(
    () => new URLSearchParams(location.search).getAll("origin"),
    []
  );
  const permissions = useMemo<Manifest.OptionalPermission[]>(
    () =>
      selectOptionalPermissions(
        new URLSearchParams(location.search).getAll("permission")
      ),
    []
  );

  const request = useCallback(async () => {
    try {
      setRejected(false);

      const accepted = await browser.permissions.request({
        origins,
        permissions,
      });

      if (accepted) {
        window.close();
        return;
      }

      setRejected(true);
    } catch (error: unknown) {
      reportError(error);
      setError(getErrorMessage(error));
    }
  }, [origins, permissions, setRejected]);

  if (origins.length + permissions.length === 0) {
    return (
      <div>
        <div className="text-danger">Error: no permission requested</div>

        <div>
          <Button
            onClick={() => {
              window.close();
            }}
          >
            Close Popup
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Centered>
      <p>
        Additional permissions may be required, you will be asked to confirm one
        more time.
      </p>

      <p>
        <AsyncButton onClick={request}>
          <FontAwesomeIcon icon={faShieldAlt} /> Grant Permissions
        </AsyncButton>
      </p>

      {error && <p className="text-danger">Error: {error}</p>}

      {rejected && <p className="text-danger">You declined the permissions</p>}
    </Centered>
  );
};

export default PermissionsPopup;
