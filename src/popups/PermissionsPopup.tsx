/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { getErrorMessage, reportError } from "@/errors";
import browser, { Permissions } from "webextension-polyfill";
import { selectOptionalPermissions } from "@/utils/permissions";

const PermissionsPopup: React.FC = () => {
  const [rejected, setRejected] = useState(false);
  const [error, setError] = useState<string>();

  const permissions = useMemo<Permissions.Permissions>(() => {
    const params = new URLSearchParams(location.search);
    return {
      origins: params.getAll("origin"),
      permissions: selectOptionalPermissions(params.getAll("permission")),
    };
  }, []);

  const request = useCallback(async () => {
    try {
      setRejected(false);

      const accepted = await browser.permissions.request(permissions);

      if (accepted) {
        window.close();
        return;
      }

      setRejected(true);
    } catch (error) {
      reportError(error);
      setError(getErrorMessage(error));
    }
  }, [permissions, setRejected]);

  if (permissions.origins.length + permissions.permissions.length === 0) {
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
        Additional permissions are required, the browser will prompt you to
        accept them.
      </p>

      <p>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- It's a modal, autofocus improves a11y */}
        <AsyncButton onClick={request} autoFocus>
          <FontAwesomeIcon icon={faShieldAlt} /> Grant Permissions
        </AsyncButton>
      </p>

      {error && <p className="text-danger">Error: {error}</p>}

      {rejected && <p className="text-danger">You declined the permissions</p>}
    </Centered>
  );
};

export default PermissionsPopup;
