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
import { cancelForm, getFormDefinition } from "@/contentScript/messenger/api";
import Loader from "@/components/Loader";
import { getErrorMessage } from "@/errors/errorHelpers";
import { type Target } from "../../../types/messengerTypes";
import { validateUUID } from "../../../types/helpers";
import { TOP_LEVEL_FRAME_ID } from "../../../domConstants";
import useAsyncState from "@/hooks/useAsyncState";
import ErrorBoundary from "@/components/ErrorBoundary";
import useReportError from "@/hooks/useReportError";
import IsolatedComponent from "@/components/IsolatedComponent";
import { type EphemeralFormContentProps } from "./EphemeralFormContent";
import { assertNotNullish } from "../../../utils/nullishUtils";
import { type EmptyObject } from "type-fest";

const ModalLayout: React.FC<React.PropsWithChildren<EmptyObject>> = ({
  children,
}) => (
  // Don't use React Bootstrap's Modal because we want to customize the classes in the layout
  <div className="modal-content">
    <div className="modal-body">{children}</div>
  </div>
);

const PanelLayout: React.FC<React.PropsWithChildren<EmptyObject>> = ({
  children,
}) => <div className="p-3">{children}</div>;

const IsolatedEphemeralFormContent: React.FunctionComponent<
  EphemeralFormContentProps
> = (props) => (
  <IsolatedComponent
    name="EphemeralFormContent"
    noStyle={props.definition.disableParentStyles}
    lazy={async () =>
      import(
        /* webpackChunkName: "isolated/EphemeralFormContent" */
        "./EphemeralFormContent"
      )
    }
    factory={(EphemeralFormContent) => <EphemeralFormContent {...props} />}
  />
);

function validateOpener(opener: string | null): Target {
  if (opener == null) {
    throw new Error("Missing opener");
  }

  try {
    const parsed = JSON.parse(opener);
    if (
      parsed &&
      typeof parsed === "object" &&
      "tabId" in parsed &&
      "frameId" in parsed
    ) {
      return parsed as Target;
    }

    throw new TypeError(`Invalid opener: ${opener}`);
  } catch {
    throw new TypeError(`Invalid opener: ${opener}`);
  }
}

/**
 * @see FormTransformer
 */
const EphemeralForm: React.FC = () => {
  const params = new URLSearchParams(location.search);
  const nonce = validateUUID(params.get("nonce"));
  const opener = validateOpener(params.get("opener"));
  const mode = params.get("mode") ?? "modal";

  const isModal = mode === "modal";

  // The opener for a sidebar panel will be the sidebar frame, not the host panel frame. The sidebar only opens in the
  // top-level frame, so hard-code the top-level frameId
  const target = isModal
    ? opener
    : { tabId: opener.tabId, frameId: TOP_LEVEL_FRAME_ID };
  const FormContainer = isModal ? ModalLayout : PanelLayout;

  const {
    data: formDefinition,
    isLoading,
    error,
  } = useAsyncState(async () => getFormDefinition(target, nonce), [nonce]);

  useReportError(error);

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
              cancelForm(target, nonce);
            }}
          >
            Close
          </button>
        </div>
      </FormContainer>
    );
  }

  assertNotNullish(formDefinition, "unable to load form definition");

  return (
    <FormContainer>
      <ErrorBoundary>
        <IsolatedEphemeralFormContent
          definition={formDefinition}
          target={target}
          nonce={nonce}
          isModal={isModal}
        />
      </ErrorBoundary>
    </FormContainer>
  );
};

export default EphemeralForm;
