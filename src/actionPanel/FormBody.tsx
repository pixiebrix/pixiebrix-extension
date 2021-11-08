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
import { FormEntry } from "@/actionPanel/actionPanelTypes";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import { UnknownObject } from "@/types";
import AsyncButton from "@/components/AsyncButton";
import { Button } from "react-bootstrap";

type FormBodyProps = {
  form: FormEntry;
  onSubmit: (values: UnknownObject) => Promise<void>;
  onCancel: () => Promise<void>;
};

const FormBody: React.FunctionComponent<FormBodyProps> = ({
  form,
  onSubmit,
  onCancel,
}) => {
  const { form: definition } = form;

  return (
    <JsonSchemaForm
      schema={definition.schema}
      uiSchema={definition.uiSchema}
      onSubmit={async ({ formData }) => {
        await onSubmit(formData);
      }}
    >
      <div>
        <Button variant="primary" type="submit">
          {definition.submitCaption}
        </Button>
        {definition.cancelable && (
          <AsyncButton
            variant="link"
            onClick={async () => {
              await onCancel();
            }}
          >
            Cancel
          </AsyncButton>
        )}
      </div>
    </JsonSchemaForm>
  );
};

export default FormBody;
