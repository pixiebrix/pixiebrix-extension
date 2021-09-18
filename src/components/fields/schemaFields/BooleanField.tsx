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

import React from "react";
import { FieldProps } from "@/components/fields/propTypes";
import { useField } from "formik";
import { Form } from "react-bootstrap";
import { fieldLabel } from "@/components/fields/fieldUtils";
import BootstrapSwitchButton from "bootstrap-switch-button-react";

const BooleanField: React.FunctionComponent<FieldProps<boolean>> = ({
  label,
  schema,
  ...props
}) => {
  const [field, , helpers] = useField(props);

  return (
    <Form.Group>
      <div>
        <Form.Label className="mr-2">
          {label ?? fieldLabel(field.name)}
        </Form.Label>
      </div>
      <BootstrapSwitchButton
        size="sm"
        onstyle="info"
        offstyle="light"
        onlabel="On"
        offlabel="Off"
        checked={field.value ?? false}
        onChange={(value) => {
          helpers.setValue(value);
        }}
      />
      {schema.description && (
        <Form.Text className="text-muted">{schema.description}</Form.Text>
      )}
    </Form.Group>
  );
};

export default BooleanField;
