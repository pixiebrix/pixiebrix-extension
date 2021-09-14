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
import Form from "@rjsf/core";
import { Message } from "@/core";
import { browser } from "webextension-polyfill-ts";
import { useAsyncState } from "@/hooks/common";
import { whoAmI } from "@/background/messenger/api";
import {
  FORM_CANCEL,
  FORM_GET_DEFINITION,
  FORM_RESOLVE,
  FormDefinition,
} from "@/blocks/transformers/modalForm/formTypes";
import GridLoader from "react-spinners/GridLoader";
import { getErrorMessage } from "@/errors";

const ModalLayout: React.FC = ({ children }) => (
  // Don't use React Bootstrap's Modal because we want to customize the classes in the layout
  <div className="modal-content">
    <div className="modal-body">{children}</div>
  </div>
);

const ModalForm: React.FC = () => {
  const params = new URLSearchParams(location.search);
  const nonce = params.get("nonce");
  const sourceFrameId = Number(params.get("frameId"));

  const [state, isLoading, error] = useAsyncState(async () => {
    const tab = await whoAmI();

    async function sendMessage<T = unknown>(message: Message) {
      return browser.tabs.sendMessage(tab.tab.id, message, {
        frameId: sourceFrameId,
      }) as Promise<T>;
    }

    return {
      definition: await sendMessage<FormDefinition>({
        type: FORM_GET_DEFINITION,
        payload: { nonce },
      }),
      sendMessage,
    };
  }, [nonce]);

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
      <Form
        schema={state.definition.schema}
        uiSchema={state.definition.uiSchema}
        onSubmit={({ formData: values }) => {
          void state.sendMessage({
            type: FORM_RESOLVE,
            payload: {
              nonce,
              values,
            },
          });
        }}
      >
        <div>
          <button className="btn btn-primary" type="submit">
            {state.definition.submitCaption}
          </button>
          {state.definition.cancelable && (
            <button
              className="btn btn-link"
              type="button"
              onClick={() => {
                void state.sendMessage({
                  type: FORM_CANCEL,
                  payload: { nonce },
                });
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </Form>
    </ModalLayout>
  );
};

export default ModalForm;
