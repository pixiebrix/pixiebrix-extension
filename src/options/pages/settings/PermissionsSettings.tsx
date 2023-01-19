/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import React, { useCallback } from "react";
import notify from "@/utils/notify";
import { type Manifest } from "webextension-polyfill";
import { remove } from "lodash";
import { Badge, Button, Card, ListGroup } from "react-bootstrap";
import useExtensionPermissions from "@/hooks/useExtensionPermissions";

type OptionalPermission = Manifest.OptionalPermission;

const IS_DEV = process.env.ENVIRONMENT === "development";

const PermissionRow: React.FunctionComponent<{
  value: string;
  remove?: (value: string) => void;
}> = ({ value, remove }) => (
  <ListGroup.Item className="d-flex">
    <div className="flex-grow-1 align-self-center">{value}</div>
    {remove ? (
      <div className="align-self-center">
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            remove(value);
          }}
        >
          Revoke
        </Button>
      </div>
    ) : (
      <Badge>
        overlapping
        <br />
        dev only
      </Badge>
    )}
  </ListGroup.Item>
);

const PermissionsSettings: React.FunctionComponent = () => {
  const permissions = useExtensionPermissions();

  const removeOrigin = useCallback(async (origin: string) => {
    await browser.permissions.remove({ origins: [origin] });
    notify.success(`Removed permission for ${origin}`);
  }, []);

  const removePermission = useCallback(
    async (permission: OptionalPermission) => {
      await browser.permissions.remove({
        permissions: [permission],
      });
      notify.success(`Removed ${permission}`);
    },
    []
  );

  return (
    <Card>
      <Card.Header>Additional Permissions</Card.Header>
      <ListGroup variant="flush">
        {permissions.map(
          ({ name, isUnique, isOrigin, isAdditional }) =>
            // Only show removable permissions
            isAdditional &&
            // Exclude overlapping permissions, unless it's a dev build
            (isUnique || IS_DEV) && (
              <PermissionRow
                key={name}
                value={name}
                remove={
                  // Removing a non-unique permission does nothing, so don't show the button
                  isUnique ? (isOrigin ? removeOrigin : removePermission) : null
                }
              />
            )
        )}
        {permissions.filter((p) => p.isAdditional).length === 0 && (
          <ListGroup.Item>No active permissions</ListGroup.Item>
        )}
      </ListGroup>
    </Card>
  );
};

export default PermissionsSettings;
