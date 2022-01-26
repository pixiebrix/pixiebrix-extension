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

import { RecipeDefinition } from "@/types/definitions";
import React from "react";
import { Link } from "react-router-dom";
import {
  useSelectedAuths,
  useSelectedExtensions,
} from "@/options/pages/marketplace/ConfigureBody";
import { faCubes, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Card } from "react-bootstrap";
import useEnsurePermissions from "@/options/pages/marketplace/useEnsurePermissions";
import PermissionsBody from "@/options/pages/marketplace/PermissionsBody";

const ActivateBody: React.FunctionComponent<{
  blueprint: RecipeDefinition;
}> = ({ blueprint }) => {
  const selectedExtensions = useSelectedExtensions(blueprint.extensionPoints);
  const selectedAuths = useSelectedAuths();
  const permissionsState = useEnsurePermissions(
    blueprint,
    selectedExtensions,
    selectedAuths
  );

  return (
    <>
      <Card.Body className="mb-0 p-3">
        <Card.Title>Review Permissions & Activate</Card.Title>
        <p className="text-info">
          <FontAwesomeIcon icon={faInfoCircle} /> You can de-activate bricks at
          any time on the{" "}
          <Link to="/installed">
            <u>
              <FontAwesomeIcon icon={faCubes} />
              {"  "}Active Bricks page
            </u>
          </Link>
        </p>
      </Card.Body>

      <PermissionsBody {...permissionsState} />
    </>
  );
};

export default ActivateBody;
