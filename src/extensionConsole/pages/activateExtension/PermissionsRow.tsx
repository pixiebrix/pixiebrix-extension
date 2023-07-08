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

import { Col, Row } from "react-bootstrap";
import React from "react";
import { useFormikContext } from "formik";
import UrlPermissionsList from "@/extensionConsole/pages/activateRecipe/UrlPermissionsList";
import useCloudExtensionPermissions from "@/extensionConsole/pages/activateExtension/useCloudExtensionPermissions";
import { type CloudExtension } from "@/types/contract";
import { type FormState } from "@/extensionConsole/pages/activateExtension/activateTypes";

const PermissionsRow: React.FunctionComponent<{
  extension: CloudExtension;
}> = ({ extension }) => {
  const { values } = useFormikContext<FormState>();
  const permissionsState = useCloudExtensionPermissions(
    extension,
    values.services
  );

  return (
    <Row>
      <Col xs={12}>
        <h4>Permissions & URLs</h4>
      </Col>
      <Col>
        <UrlPermissionsList {...permissionsState} />
      </Col>
    </Row>
  );
};

export default PermissionsRow;
