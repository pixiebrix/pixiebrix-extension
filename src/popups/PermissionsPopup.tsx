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
import { getErrorMessage } from "@/extensionPoints/helpers";
import { browser } from "webextension-polyfill-ts";

const PermissionsPopup: React.FC = () => {
  const [rejected, setRejected] = useState(false);
  const [error, setError] = useState<string>();

  const origin = useMemo(() => {
    const permissions = new URLSearchParams(location.search);
    return permissions.get("origin");
  }, []);

  const request = useCallback(async () => {
    try {
      setRejected(false);

      const accepted = await browser.permissions.request({
        origins: [origin],
      });

      if (accepted) {
        window.close();
        return;
      }

      setRejected(true);
    } catch (error) {
      // FIXME: this needs to be rebased against main to get the error updates
      reportError(error);
      setError(getErrorMessage(error));
    }
  }, [origin, setRejected]);

  if (origin == null) {
    return (
      <div>
        <div className="text-danger">Error: no origin requested</div>

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
      <div>Grant PixieBrix to access to the following page/host?</div>

      <div className="card bg-light p-3 my-3">
        <p className="mb-0">{new URL(origin).host}</p>
      </div>

      <div>
        <AsyncButton onClick={request}>
          <FontAwesomeIcon icon={faShieldAlt} /> Grant Permanent Access
        </AsyncButton>
      </div>

      {error && <div className="text-danger">Error: {error}</div>}

      {rejected && (
        <div className="text-danger">You declined the permissions</div>
      )}
    </Centered>
  );
};

export default PermissionsPopup;
