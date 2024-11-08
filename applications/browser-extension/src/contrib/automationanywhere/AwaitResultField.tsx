/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import React from "react";
import ConnectedFieldTemplate from "../../components/form/ConnectedFieldTemplate";
import BooleanWidget from "../../components/fields/schemaFields/widgets/BooleanWidget";
import SchemaField from "../../components/fields/schemaFields/SchemaField";
import { ENTERPRISE_EDITION_COMMON_PROPERTIES } from "./RunBot";
import type { Schema } from "../../types/schemaTypes";
import { useField } from "formik";

const AwaitResultField: React.FC<{
  awaitResultFieldName: string;
  maxWaitMillisFieldName: string;
}> = ({ awaitResultFieldName, maxWaitMillisFieldName }) => {
  const [{ value: awaitResult }] = useField<boolean | null>(
    awaitResultFieldName,
  );

  return (
    <>
      <ConnectedFieldTemplate
        label="Await Result"
        name={awaitResultFieldName}
        description="Wait for the run to finish, and return the output"
        as={BooleanWidget}
      />
      {awaitResult && (
        <SchemaField
          label="Result Timeout (Milliseconds)"
          name={maxWaitMillisFieldName}
          schema={ENTERPRISE_EDITION_COMMON_PROPERTIES.maxWaitMillis as Schema}
          // Mark as required so the widget defaults to showing the number entry
          isRequired
        />
      )}
    </>
  );
};

export default AwaitResultField;
