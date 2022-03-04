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

import React, { useCallback, useMemo, useState } from "react";
import notify from "@/utils/notify";
import {
  getAdditionalPermissions,
  dropOverlappingPermissions,
} from "webext-additional-permissions";
import browser, { Manifest } from "webextension-polyfill";
import { sortBy } from "lodash";
import { useAsyncEffect } from "use-async-effect";
import { Button, Card, ListGroup } from "react-bootstrap";

type OptionalPermission = Manifest.OptionalPermission;
type Permissions = chrome.permissions.Permissions;

const PermissionRow: React.FunctionComponent<{
  value: string;
  remove: (value: string) => void;
}> = ({ value, remove }) => (
  <ListGroup.Item className="d-flex">
    <div className="flex-grow-1 align-self-center">{value}</div>
    <div className="align-self-center">
      <Button
        variant="danger"
        size="sm"
        onClick={async () => {
          remove(value);
        }}
      >
        Revoke
      </Button>{" "}
    </div>
  </ListGroup.Item>
);

// `devtools` is actually a required permission that gets added automatically
// https://github.com/fregante/webext-additional-permissions/issues/6
const HIDE_EXTRA_PERMISSIONS = ["devtools"];

const PermissionsSettings: React.FunctionComponent = () => {
  const [permissions, setPermissions] = useState<Permissions>();

  const refresh = useCallback(async () => {
    setPermissions(
      dropOverlappingPermissions(await getAdditionalPermissions())
    );
  }, [setPermissions]);

  const removeOrigin = useCallback(
    async (origin: string) => {
      await browser.permissions.remove({ origins: [origin] });
      notify.success(`Removed permission for ${origin}`);
      await refresh();
    },
    [refresh]
  );

  const removePermission = useCallback(
    async (permission: string) => {
      await browser.permissions.remove({
        permissions: [permission as OptionalPermission],
      });
      notify.success(`Removed ${permission}`);
      await refresh();
    },
    [refresh]
  );

  const origins = useMemo(
    () => sortBy(permissions?.origins ?? []),
    [permissions]
  );

  const extraPermissions = useMemo(
    () =>
      sortBy(permissions?.permissions ?? []).filter(
        (x) => !HIDE_EXTRA_PERMISSIONS.includes(x)
      ),
    [permissions]
  );

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
