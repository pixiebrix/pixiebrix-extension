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

import React, { useMemo } from "react";
import { Card } from "react-bootstrap";
import { RecipeDefinition } from "@/types/definitions";
import genericOptionsFactory from "@/components/fields/schemaFields/genericOptionsFactory";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCubes, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";

interface OwnProps {
  blueprint: RecipeDefinition;
}

const OptionsBody: React.FunctionComponent<OwnProps> = ({ blueprint }) => {
  const OptionsGroup = useMemo(
    () =>
      genericOptionsFactory(
        blueprint.options.schema,
        blueprint.options.uiSchema
      ),
    [blueprint.options.schema, blueprint.options.uiSchema]
  );
  return (
    <>
      <Card.Body className="px-3 py-3">
        <Card.Title>Personalize Blueprint</Card.Title>
        <p className="text-info">
          <FontAwesomeIcon icon={faInfoCircle} /> After activating this
          blueprint, you can configure it at any time on the{" "}
          <Link to="/installed">
            <u>
              <FontAwesomeIcon icon={faCubes} />
              {"  "}Active Bricks page
            </u>
          </Link>
        </p>
      </Card.Body>
      <Card.Body className="OptionsBody p-3">
        <OptionsGroup name="optionsArgs" />
      </Card.Body>
    </>
  );
};

export default OptionsBody;
