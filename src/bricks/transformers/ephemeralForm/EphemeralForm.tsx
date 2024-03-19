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

import React, { useEffect } from "react";
import {
  cancelForm,
  getFormDefinition,
} from "@/contentScript/messenger/strict/api";
import Loader from "@/components/Loader";
import { getErrorMessage } from "@/errors/errorHelpers";
import { type Target } from "@/types/messengerTypes";
import { validateUUID } from "@/types/helpers";
import reportError from "@/telemetry/reportError";
import { TOP_LEVEL_FRAME_ID } from "@/domConstants";
import useAsyncState from "@/hooks/useAsyncState";
import { EphemeralFormContent } from "./EphemeralFormContent";
import EmotionShadowRoot from "@/components/EmotionShadowRoot";
import ErrorBoundary from "@/components/ErrorBoundary";

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
  const target = isModal
    ? opener
    : { tabId: opener.tabId, frameId: TOP_LEVEL_FRAME_ID };
  const FormContainer = isModal ? ModalLayout : PanelLayout;

  const {
    data: formDefinition,
    isLoading,
    error,
  } = useAsyncState(async () => getFormDefinition(target, nonce), [nonce]);

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
              cancelForm(target, nonce);
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
      <ErrorBoundary>
        <EmotionShadowRoot>
          <EphemeralFormContent
            definition={formDefinition}
            target={target}
            nonce={nonce}
            isModal={isModal}
          />
        </EmotionShadowRoot>
      </ErrorBoundary>
    </FormContainer>
  );
};

export default EphemeralForm;
