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
import JsonSchemaForm from "@rjsf/bootstrap-4";
import { UUID } from "@/core";
import { useAsyncState } from "@/hooks/common";
import {
  getFormDefinition,
  resolveForm,
  cancelForm,
} from "@/contentScript/messenger/api";
import GridLoader from "react-spinners/GridLoader";
import { getErrorMessage } from "@/errors";
import { Target } from "@/types";

const ModalLayout: React.FC = ({ children }) => (
  // Don't use React Bootstrap's Modal because we want to customize the classes in the layout
  <div className="modal-content">
    <div className="modal-body">{children}</div>
  </div>
);

const ModalForm: React.FC = () => {
  const params = new URLSearchParams(location.search);
  const nonce = params.get("nonce") as UUID;
  const opener = JSON.parse(params.get("opener")) as Target;

  const [definition, isLoading, error] = useAsyncState(
    async () => getFormDefinition(opener, nonce),
    [nonce]
  );

  if (isLoading) {
    return (
      <ModalLayout>
        <GridLoader />
      </ModalLayout>
    );
  }

  if (error) {
    return (
      <ModalLayout>
        <div className="text-danger">{getErrorMessage(error)}</div>
      </ModalLayout>
    );
  }

  return (
    <ModalLayout>
      <JsonSchemaForm
        schema={definition.schema}
        uiSchema={definition.uiSchema}
        onSubmit={({ formData: values }) => {
          void resolveForm(opener, nonce, values);
        }}
      >
        <div>
          <button className="btn btn-primary" type="submit">
            {definition.submitCaption}
          </button>
          {definition.cancelable && (
            <button
              className="btn btn-link"
              type="button"
              onClick={() => {
                void cancelForm(opener, nonce);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </JsonSchemaForm>
    </ModalLayout>
  );
};

export default ModalForm;
