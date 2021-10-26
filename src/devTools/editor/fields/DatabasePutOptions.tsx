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

import SchemaField from "@/components/fields/schemaFields/SchemaField";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import { Schema } from "@/core";
import { validateRegistryId } from "@/types/helpers";
import { joinName } from "@/utils";
import { partial } from "lodash";
import React, { useState } from "react";
import useDatabaseOptions from "@/devTools/editor/hooks/useDatabaseOptions";
import DatabaseCreateModal from "./DatabaseCreateModal";
import createMenuListWithAddButton from "@/components/createMenuListWithAddButton";
import AppServiceField from "@/components/fields/schemaFields/AppServiceField";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";

export const DATABASE_PUT_ID = validateRegistryId("@pixiebrix/data/put");

const keySchema: Schema = {
  type: "string",
  description: "The unique key for the record",
};

const valueSchema: Schema = {
  type: "object",
  description: "The data to store in the database",
  additionalProperties: true,
};

const serviceSchema: Schema = {
  $ref: `https://app.pixiebrix.com/schemas/services/${PIXIEBRIX_SERVICE_ID}`,
};

const DatabasePutOptions: React.FC<{
  name: string;
  configKey: string;
}> = ({ name, configKey }) => {
  const [showModal, setShowModal] = useState(false);

  const configName = partial(joinName, name, configKey);

  const {
    databaseOptions,
    isLoading: isLoadingDatabaseOptions,
  } = useDatabaseOptions();

  return (
    <div>
      {showModal && (
        <DatabaseCreateModal
          onClose={() => {
            setShowModal(false);
          }}
        />
      )}

      <ConnectedFieldTemplate
        name={configName("databaseId")}
        label="Database"
        as={SelectWidget}
        options={databaseOptions}
        isLoading={isLoadingDatabaseOptions}
        components={{
          MenuList: createMenuListWithAddButton(() => {
            setShowModal(true);
          }),
        }}
      />

      <SchemaField name={configName("key")} label="Key" schema={keySchema} />

      <SchemaField
        name={configName("value")}
        label="Value"
        schema={valueSchema}
      />

      <AppServiceField name={configName("service")} schema={serviceSchema} />
    </div>
  );
};

export default DatabasePutOptions;
