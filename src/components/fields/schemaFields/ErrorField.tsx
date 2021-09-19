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

import React, { FunctionComponent } from "react";
import { SchemaFieldProps } from "@/components/fields/propTypes";
import { fieldLabel } from "@/components/fields/fieldUtils";
import { CustomFieldWidget } from "@/components/form/FieldTemplate";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { getErrorMessage } from "@/errors";

type ErrorProps = {
  error: unknown;
};

const ErrorWidget: CustomFieldWidget<
  SchemaFieldProps<unknown> & ErrorProps
> = ({ error }) => <div className="text-danger">{getErrorMessage(error)}</div>;

const ErrorField: FunctionComponent<SchemaFieldProps<unknown> & ErrorProps> = ({
  label,
  name,
  schema,
  error,
}) => (
  <ConnectedFieldTemplate
    label={label ?? fieldLabel(name)}
    description={schema?.description}
    as={ErrorWidget}
    error={error}
  />
);

export default ErrorField;
