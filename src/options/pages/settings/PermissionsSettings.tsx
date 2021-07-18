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
import { browser, Manifest } from "webextension-polyfill-ts";
import { sortBy } from "lodash";
import useAsyncEffect from "use-async-effect";
import { Button, Card, ListGroup } from "react-bootstrap";
type OptionalPermission = Manifest.OptionalPermission;
type Permissions = chrome.permissions.Permissions;

const PermissionRow: React.FunctionComponent<{
  value: string;
  remove: (value: string) => void;
}> = ({ value, remove }) => {
  return (
    <ListGroup.Item className="d-flex">
      <div className="flex-grow-1 align-self-center">{value}</div>
      <div className="align-self-center">
        <Button variant="danger" size="sm" onClick={async () => remove(value)}>
          Revoke
        </Button>{" "}
      </div>
    </ListGroup.Item>
  );
};

const PermissionsSettings: React.FunctionComponent = () => {
  const { addToast } = useToasts();
  const [permissions, setPermissions] = useState<Permissions>();

  const refresh = useCallback(async () => {
    setPermissions(await getAdditionalPermissions());
  }, [setPermissions]);

  const removeOrigin = useCallback(
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

  const removePermission = useCallback(
    async (permission: string) => {
      await browser.permissions.remove({
        permissions: [permission as OptionalPermission],
      });
      addToast(`Removed ${permission}`, {
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

  const extraPermissions = useMemo(() => {
    return sortBy(permissions?.permissions ?? []);
  }, [permissions]);

  useAsyncEffect(async () => refresh(), []);

  return (
    <Card>
      <Card.Header>Additional Permissions</Card.Header>
      <ListGroup variant="flush">
        {extraPermissions.map((permission) => (
          <PermissionRow
            key={permission}
            value={permission}
            remove={removePermission}
          />
        ))}
        {origins.map((origin) => (
          <PermissionRow key={origin} value={origin} remove={removeOrigin} />
        ))}
        {origins.length + extraPermissions.length === 0 && (
          <ListGroup.Item>No active permissions</ListGroup.Item>
        )}
      </ListGroup>
    </Card>
  );
};

export default PermissionsSettings;
