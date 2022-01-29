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

import React, { forwardRef, useEffect } from "react";
import JsonSchemaForm from "@rjsf/bootstrap-4";
import { useAsyncState } from "@/hooks/common";
import {
  getFormDefinition,
  resolveForm,
  cancelForm,
} from "@/contentScript/messenger/api";
import GridLoader from "react-spinners/GridLoader";
import { getErrorMessage } from "@/errors";
import { Target } from "@/types";
import { validateUUID } from "@/types/helpers";
import ImageCropWidget from "@/components/formBuilder/ImageCropWidget";

const uiWidgets = {
  imageCrop: ImageCropWidget,
};

const ModalLayout = forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
  (props, ref) => (
    // Don't use React Bootstrap's Modal because we want to customize the classes in the layout
    <div className="modal-content" ref={ref}>
      <div className="modal-body">{props.children}</div>
    </div>
  )
);
ModalLayout.displayName = "ModalLayout";

const PanelLayout = forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
  (props, ref) => <div ref={ref}>{props.children}</div>
);
PanelLayout.displayName = "PanelLayout";

/**
 * @see FormTransformer
 */
const EphemeralForm: React.FC = () => {
  const form = React.createRef<HTMLDivElement>();
  const params = new URLSearchParams(location.search);
  const nonce = validateUUID(params.get("nonce"));
  const opener = JSON.parse(params.get("opener")) as Target;
  const mode = params.get("mode") ?? "modal";

  // The opener for a sidebar panel will be the sidebar frame, not the host panel frame. The sidebar only opens in the
  // top-level frame, so hard-code the top-level frameId
  const target =
    mode === "modal" ? opener : { tabId: opener.tabId, frameId: 0 };
  const FormContainer = mode === "modal" ? ModalLayout : PanelLayout;

  const [definition, isLoading, error] = useAsyncState(
    async () => getFormDefinition(target, nonce),
    [nonce]
  );

  useEffect(() => {
    form?.current
      ?.querySelector<HTMLInputElement | HTMLSelectElement>("input, select")
      ?.focus();
  }, [form]);

  if (isLoading) {
    return (
      <FormContainer>
        <GridLoader />
      </FormContainer>
    );
  }

  if (error) {
    return (
      <FormContainer>
        <div className="text-danger">{getErrorMessage(error)}</div>
      </FormContainer>
    );
  }

  return (
    <FormContainer ref={form}>
      <JsonSchemaForm
        schema={definition.schema}
        uiSchema={definition.uiSchema}
        widgets={uiWidgets}
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
