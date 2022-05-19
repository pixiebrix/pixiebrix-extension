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

import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import RegistryIdWidget from "@/components/form/widgets/RegistryIdWidget";
import { FieldDescriptions } from "@/utils/strings";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { StylesConfig } from "react-select";

const selectStylesOverride: StylesConfig = {
  control: (base) => ({
    ...base,
    borderRadius: 0,
    border: "none",
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0.875rem 1.375rem",
  }),
  singleValue: (base) => ({
    ...base,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
  }),
  input: (base) => ({
    ...base,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
  }),
};

const ConvertToRecipe: React.FunctionComponent = () => (
  <div className="text-info">
    <div className="mb-2">
      <FontAwesomeIcon icon={faInfoCircle} /> To share, first give your
      blueprint a name.
    </div>
    <ConnectedFieldTemplate
      name="blueprintId"
      label="Blueprint Id"
      description={
        <span>
          {FieldDescriptions.BLUEPRINT_ID}.{" "}
          <i>Cannot be modified once shared.</i>
        </span>
      }
      as={RegistryIdWidget}
      selectStyles={selectStylesOverride}
    />
    <ConnectedFieldTemplate
      name="name"
      label="Name"
      description={FieldDescriptions.BLUEPRINT_NAME}
    />
    <ConnectedFieldTemplate name="version" label="Version" />
    <ConnectedFieldTemplate
      name="description"
      label="Description"
      description={FieldDescriptions.BLUEPRINT_DESCRIPTION}
    />
  </div>
);

export default ConvertToRecipe;
