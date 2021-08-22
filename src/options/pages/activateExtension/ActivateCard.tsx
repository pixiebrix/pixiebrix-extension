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

import { Card } from "react-bootstrap";
import AsyncButton from "@/components/AsyncButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagic } from "@fortawesome/free-solid-svg-icons";
import React from "react";
import { useFormikContext } from "formik";
import PermissionsBody from "@/options/pages/marketplace/PermissionsBody";
import useEnsurePermissions from "@/options/pages/activateExtension/useEnsurePermissions";
import { CloudExtension } from "@/types/contract";
import { FormState } from "@/options/pages/activateExtension/activateTypes";

const ActivateCard: React.FunctionComponent<{ extension: CloudExtension }> = ({
  extension,
}) => {
  const { submitForm, values } = useFormikContext<FormState>();

  const permissionsState = useEnsurePermissions(extension, values.services);

  return (
    <Card>
      <Card.Header>Review Permissions & Activate</Card.Header>

      <PermissionsBody {...permissionsState} />

      <Card.Footer className="d-inline-flex">
        <div className="ml-auto">
          <AsyncButton variant="primary" size="sm" onClick={submitForm}>
            <FontAwesomeIcon icon={faMagic} /> Activate
          </AsyncButton>
        </div>
      </Card.Footer>
    </Card>
  );
};

export default ActivateCard;
