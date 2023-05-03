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

import React, { useMemo } from "react";
import { isEmpty, uniq } from "lodash";
import { selectOptionalPermissions } from "@/permissions/permissionsUtils";
import Loader from "@/components/Loader";
import { Col, Row } from "react-bootstrap";
import useReportError from "@/hooks/useReportError";
import { getErrorMessage } from "@/errors/errorHelpers";
import { type AsyncState } from "@/types/sliceTypes";
import { PermissionsStatus } from "@/permissions/permissionsTypes";

const UrlPermissionsList: React.FunctionComponent<
  AsyncState<PermissionsStatus>
> = ({ error, isFetching, data }) => {
  useReportError(error);

  const permissions = data?.permissions;

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
    if (isFetching) {
      return <Loader />;
    }

    if (error) {
      return (
        <p className="text-danger">
          An error occurred determining additional permissions:{" "}
          {getErrorMessage(error)}
        </p>
      );
    }

    if (permissionsList.length === 0) {
      return <p>No special permissions required</p>;
    }

    const { hasPermissions } = data;

    if (hasPermissions) {
      return (
        <p>
          PixieBrix already has the permissions required for the bricks
          you&apos;ve selected
        </p>
      );
    }

    return (
      <p>
        Your browser will prompt to you approve any permissions you haven&apos;t
        granted yet
      </p>
    );
  }, [permissionsList, data, error, isFetching]);

  return (
    <>
      <Row>
        <Col>{helpText}</Col>
      </Row>
      {!isEmpty(permissionsList) && (
        // Use Table single column table instead of ListGroup to more closely match style on other wizard tabs
        <Row>
          <Col>
            <h6>URLs</h6>
            <ul className="list-unstyled">
              {permissionsList.map((permission) => (
                <li key={permission}>{permission}</li>
              ))}
            </ul>
          </Col>
        </Row>
      )}
    </>
  );
};

export default UrlPermissionsList;
