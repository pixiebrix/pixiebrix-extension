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

import React from "react";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import { makeLabelForSchemaField } from "@/components/fields/schemaFields/schemaFieldUtils";
import { connect, getIn } from "formik";
import { type FieldProps } from "@/components/form/FieldTemplate";
import { type FormikContextType } from "formik/dist/types";

/**
 * Field used for backward compatible upgrade of DOM bricks to be root aware.
 *
 * - Not visible if value true
 * - Visible and disabled if false/undefined (to show the behavior of legacy bricks)
 */
const RootAwareField: React.FunctionComponent<
  { formik: FormikContextType<boolean> } & SchemaFieldProps
> = (props) => {
  const { name, formik } = props;
  const value = getIn(formik.values, name);

  if (value) {
    // Don't show the field if the value is true. (The Page Editor default the value to true)
    return null;
  }

  // The DOM brick is running in legacy mode.
  return (
    <ConnectedFieldTemplate
      disabled
      name={name}
      as={SwitchButtonWidget}
      label={makeLabelForSchemaField(props)}
      description="This brick was configured in legacy mode. Selectors will be evaluated over the entire document. Remove and re-add this brick to pass a target element to the brick."
    />
  );
};

export default connect<FieldProps>(RootAwareField);
