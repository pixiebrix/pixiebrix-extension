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

import React, { useMemo } from "react";
import { uniq } from "lodash";
import { selectOptionalPermissions } from "@/utils/permissions";
import Loader from "@/components/Loader";
import { Card, Table } from "react-bootstrap";
import useReportError from "@/hooks/useReportError";
import { Permissions } from "webextension-polyfill";
import { getErrorMessage } from "@/errors";

const PermissionsBody: React.FunctionComponent<{
  enabled: boolean;
  isPending: boolean;
  error: unknown;
  permissions: Permissions.Permissions;
}> = ({ error, enabled, isPending, permissions }) => {
  useReportError(error);

  const permissionsList = useMemo(() => {
    if (permissions == null) {
      return [];
    }

    // `selectOptionalPermissions` never returns any origins because we request *://*
    return uniq([
      ...selectOptionalPermissions(permissions.permissions),
      ...permissions.origins,
    ]);
  }, [permissions]);

  const helpText = useMemo(() => {
    if (isPending) {
      return <Loader />;
    }

    if (error) {
      return (
        <Card.Text className="text-danger">
          An error occurred determining additional permissions:{" "}
          {getErrorMessage(error)}
        </Card.Text>
      );
    }

    if (permissionsList.length === 0) {
      return <Card.Text>No special permissions required</Card.Text>;
    }

    if (enabled) {
      return (
        <Card.Text>
          PixieBrix already has the permissions required for the bricks
          you&apos;ve selected
        </Card.Text>
      );
    }

    return (
      <Card.Text>
        Your browser will prompt to you approve any permissions you haven&apos;t
        granted yet
      </Card.Text>
    );
  }, [permissionsList, enabled, error, isPending]);

  return (
    <>
      <Card.Body className="p-3">
        <Card.Subtitle>Permissions & URLs</Card.Subtitle>
        {helpText}
      </Card.Body>
      {permissionsList.length > 0 && (
        // Use Table single column table instead of ListGroup to more closely match style on other wizard tabs
        <Table variant="flush">
          <tbody>
            {permissionsList.map((permission) => (
              <tr key={permission}>
                <td>{permission}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
};

export default PermissionsBody;
