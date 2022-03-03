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

import React, { useEffect } from "react";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import { useAsyncState } from "@/hooks/common";
import {
  getFormDefinition,
  resolveForm,
  cancelForm,
} from "@/contentScript/messenger/api";
import Loader from "@/components/Loader";
import { getErrorMessage } from "@/errors";
import { Target } from "@/types";
import { validateUUID } from "@/types/helpers";
import ImageCropWidget from "@/components/formBuilder/ImageCropWidget";
// eslint-disable-next-line import/no-named-as-default -- need default export here
import DescriptionField from "@/components/formBuilder/DescriptionField";
import FieldTemplate from "@/components/formBuilder/FieldTemplate";
import reportError from "@/telemetry/reportError";

const fields = {
  DescriptionField,
};
const uiWidgets = {
  imageCrop: ImageCropWidget,
};

const ModalLayout: React.FC = ({ children }) => (
  // Don't use React Bootstrap's Modal because we want to customize the classes in the layout
  <div className="modal-content">
    <div className="modal-body">{children}</div>
  </div>
);

const PanelLayout: React.FC = ({ children }) => (
  <div className="p-3">{children}</div>
);

/**
 * @see FormTransformer
 */
const EphemeralForm: React.FC = () => {
  const params = new URLSearchParams(location.search);
  const nonce = validateUUID(params.get("nonce"));
  const opener = JSON.parse(params.get("opener")) as Target;
  const mode = params.get("mode") ?? "modal";

  const isModal = mode === "modal";

  // The opener for a sidebar panel will be the sidebar frame, not the host panel frame. The sidebar only opens in the
  // top-level frame, so hard-code the top-level frameId
  const target = isModal ? opener : { tabId: opener.tabId, frameId: 0 };
  const FormContainer = isModal ? ModalLayout : PanelLayout;

  const [definition, isLoading, error] = useAsyncState(
    async () => getFormDefinition(target, nonce),
    [nonce]
  );

  // Report error once
  useEffect(() => {
    if (error) {
      // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/2769
      reportError(error);
    }
  }, [error]);

  if (isLoading) {
    return (
      <FormContainer>
        <Loader />
      </FormContainer>
    );
  }

  if (error) {
    return (
      <FormContainer>
        <div>Form Error</div>

        <div className="text-danger my-3">{getErrorMessage(error)}</div>

        <div>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              void cancelForm(target, nonce);
            }}
          >
            Close
          </button>
        </div>
      </FormContainer>
    );
  }

  return (
    <FormContainer>
      <JsonSchemaForm
        schema={definition.schema}
        uiSchema={definition.uiSchema}
        fields={fields}
        widgets={uiWidgets}
        FieldTemplate={FieldTemplate}
        onSubmit={({ formData: values }) => {
          void resolveForm(target, nonce, values);
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
                void cancelForm(target, nonce);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </JsonSchemaForm>
    </FormContainer>
  );
};

export default EphemeralForm;
