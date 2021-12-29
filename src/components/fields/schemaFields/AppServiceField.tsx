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

import React, { useEffect } from "react";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { useField, useFormikContext } from "formik";
import { Expression, OutputKey, ServiceKeyVar } from "@/core";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import {
  keyToFieldValue as keyToFieldValueV1,
  ServiceSlice,
} from "@/components/fields/schemaFields/v1/ServiceField";
import { keyToFieldValue as keyToFieldValueV3 } from "@/components/fields/schemaFields/v3/ServiceField";
import { produce } from "immer";
import useApiVersionAtLeast from "@/devTools/editor/hooks/useApiVersionAtLeast";
import { createTypePredicate } from "@/components/fields/fieldUtils";
import { SERVICE_BASE_SCHEMA } from "@/services/serviceUtils";

const PIXIEBRIX_OUTPUT_KEY = "pixiebrix" as OutputKey;

export const isAppServiceField = createTypePredicate(
  (schema) => schema.$ref === `${SERVICE_BASE_SCHEMA}${PIXIEBRIX_SERVICE_ID}`
);

/**
 * Schema-based field for the PixieBrix API (@pixiebrix/api).
 *
 * - Does not render a DOM element
 * - Ensures a @pixiebrix/api dependency is included for the extension
 */
const AppServiceField: React.FunctionComponent<SchemaFieldProps> = ({
  schema,
  uiSchema,
  ...props
}) => {
  const {
    values: root,
    setValues: setRootValues,
  } = useFormikContext<ServiceSlice>();
  // We need this union type to account for v1/v3 runtime config formats
  //  v1 - ServiceKeyVar
  //  v3 - Expression<ServiceKeyVar>
  const [{ value }, , helpers] = useField<
    ServiceKeyVar | Expression<ServiceKeyVar>
  >(props);

  const isApiAtLeastV3 = useApiVersionAtLeast("v3");
  const keyToFieldValue = isApiAtLeastV3
    ? keyToFieldValueV3
    : keyToFieldValueV1;

  useEffect(
    () => {
      if (value == null) {
        const match = root.services.find(
          (service) => service.id === PIXIEBRIX_SERVICE_ID
        );
        if (match?.outputKey) {
          // If the service is already being used, default to the currently configured auth
          console.debug(
            "PixieBrix dependency already exists for %s, using output key %s",
            match.id,
            match.outputKey,
            { root, match }
          );
          helpers.setValue(keyToFieldValue(match.outputKey));
        } else {
          console.debug("Adding PixieBrix API dependency");
          // Try defaulting to the only option available. Use onChange instead of helpers.setValue b/c it automatically
          // updates the services part of the form state
          setRootValues(
            produce(root, (draft) => {
              draft.services.push({
                id: PIXIEBRIX_SERVICE_ID,
                // XXX: in practice it the pixiebrix outputKey won't be used by any other service. However, we might
                // consider using fresh identifier here to eliminate the possibility of colliding with a different
                // service that is somehow already using the @pixiebrix key
                outputKey: PIXIEBRIX_OUTPUT_KEY,
                // PixieBrix service does not use an ID -- the auth is automatically handled based on the logged in user
                config: null,
              });
            })
          );
          helpers.setValue(keyToFieldValue(PIXIEBRIX_OUTPUT_KEY));
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount
    []
  );

  return null;
};

export default AppServiceField;
