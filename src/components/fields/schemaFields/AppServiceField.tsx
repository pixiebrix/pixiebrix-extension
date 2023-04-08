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

import type React from "react";
import { useEffect } from "react";
import { useField, useFormikContext } from "formik";
import { PIXIEBRIX_SERVICE_ID } from "@/services/constants";
import { produce } from "immer";
import { isEqual, set } from "lodash";
import { keyToFieldValue, type ServiceSlice } from "./serviceFieldUtils";
import { Expression, OutputKey, ServiceKeyVar } from "@/types/runtimeTypes";

const PIXIEBRIX_OUTPUT_KEY = "pixiebrix" as OutputKey;

/**
 * Schema-based field for the PixieBrix API (@pixiebrix/api).
 *
 * - Does not render a DOM element
 * - Ensures a @pixiebrix/api dependency is included for the extension
 */
const AppServiceField: React.FunctionComponent<{ name: string }> = ({
  name,
}) => {
  const { values: root, setValues: setRootValues } =
    useFormikContext<ServiceSlice>();
  const [{ value: serviceOutputKey }, , { setValue: setServiceOutputKey }] =
    useField<Expression<ServiceKeyVar>>(name);

  // This currently happens when a brick is copy-pasted into a separate extension
  // that does not yet have root.services configured, but already has the service
  // key set up in the (copied) BlockConfig.
  const isBadValue =
    serviceOutputKey &&
    !root.services.some((service) =>
      isEqual(keyToFieldValue(service.outputKey), serviceOutputKey)
    );

  useEffect(
    () => {
      if (serviceOutputKey == null) {
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
          setServiceOutputKey(keyToFieldValue(match.outputKey));
        } else {
          console.debug("Adding PixieBrix API dependency");
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

              set(draft, name, keyToFieldValue(PIXIEBRIX_OUTPUT_KEY));
            })
          );
        }
      } else if (isBadValue) {
        // Clearing this "bad value" value will enable the preceding if-branch to
        // execute again, and that will configure root.services properly
        setServiceOutputKey(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run on mount, or if we detect a "bad value" (see comment above)
    [isBadValue]
  );

  return null;
};

export default AppServiceField;
