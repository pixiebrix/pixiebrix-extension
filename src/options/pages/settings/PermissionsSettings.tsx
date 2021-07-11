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

import React, { useCallback, useMemo, useState } from "react";
import { useToasts } from "react-toast-notifications";
import { getAdditionalPermissions } from "webext-additional-permissions";
import { browser } from "webextension-polyfill-ts";
import { sortBy } from "lodash";
import useAsyncEffect from "use-async-effect";
import { Button, Card, ListGroup } from "react-bootstrap";

type Permissions = chrome.permissions.Permissions;

const PermissionsSettings: React.FunctionComponent = () => {
  const { addToast } = useToasts();
  const [permissions, setPermissions] = useState<Permissions>();

  const refresh = useCallback(async () => {
    setPermissions(await getAdditionalPermissions());
  }, [setPermissions]);

  const remove = useCallback(
    async (origin: string) => {
      await browser.permissions.remove({ origins: [origin] });
      addToast(`Removed permission for ${origin}`, {
        appearance: "success",
        autoDismiss: true,
      });
      await refresh();
    },
    [refresh, addToast]
  );

  const origins = useMemo(() => {
    return sortBy(permissions?.origins ?? []);
  }, [permissions]);

  useAsyncEffect(async () => refresh(), []);

  return (
    <Card>
      <Card.Header>Additional Permissions</Card.Header>
      <ListGroup variant="flush">
        {origins.map((origin) => (
          <ListGroup.Item key={origin} className="d-flex">
            <div className="flex-grow-1 align-self-center">{origin}</div>
            <div className="align-self-center">
              <Button
                variant="danger"
                size="sm"
                onClick={async () => remove(origin)}
              >
                Revoke
              </Button>{" "}
            </div>
          </ListGroup.Item>
        ))}
        {origins.length === 0 && (
          <ListGroup.Item>No active permissions</ListGroup.Item>
        )}
      </ListGroup>
    </Card>
  );
};

export default PermissionsSettings;
