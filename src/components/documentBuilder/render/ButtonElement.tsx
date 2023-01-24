/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import React, { useContext, useState } from "react";
import { type BlockPipeline } from "@/blocks/types";
import AsyncButton, { type AsyncButtonProps } from "@/components/AsyncButton";
import { runEffectPipeline } from "@/contentScript/messenger/api";
import { uuidv4 } from "@/types/helpers";
import DocumentContext from "@/components/documentBuilder/render/DocumentContext";
import { type Except } from "type-fest";
import apiVersionOptions from "@/runtime/apiVersionOptions";
import { type DynamicPath } from "@/components/documentBuilder/documentBuilderTypes";
import { getTopLevelFrame } from "webext-messenger";
import { getRootCause, hasSpecificErrorCause } from "@/errors/errorHelpers";
import { SubmitPanelAction } from "@/blocks/errors";

type ButtonElementProps = Except<AsyncButtonProps, "onClick"> & {
  onClick: BlockPipeline;
  elementName: string;
  tracePath: DynamicPath;
};

const ButtonElement: React.FC<ButtonElementProps> = ({
  onClick,
  tracePath,
  ...restProps
}) => {
  const {
    onAction,
    meta,
    options: { ctxt, logger },
  } = useContext(DocumentContext);
  const [counter, setCounter] = useState(0);

  if (!meta.extensionId) {
    throw new Error("ButtonElement requires meta.extensionId");
  }

  const handler = async () => {
    const currentCounter = counter;
    setCounter((previous) => previous + 1);

    // We currently only support associating the sidebar with the content script in the top-level frame (frameId: 0)
    const topLevelFrame = await getTopLevelFrame();

    try {
      await runEffectPipeline(topLevelFrame, {
        nonce: uuidv4(),
        context: ctxt,
        pipeline: onClick,
        // TODO: pass runtime version via DocumentContext instead of hard-coding it. This will break for v4+
        options: apiVersionOptions("v3"),
        messageContext: logger.context,
        meta: {
          ...meta,
          branches: [
            ...tracePath.branches.map(({ staticId, index }) => ({
              key: staticId,
              counter: index,
            })),
            { key: "onClick", counter: currentCounter },
          ],
        },
      });
    } catch (error) {
      if (hasSpecificErrorCause(error, SubmitPanelAction)) {
        // The error was created by the SubmitPanelEffect brick
        const rootCause = getRootCause(error) as SubmitPanelAction;
        onAction({ type: rootCause.type, detail: rootCause.detail });
      } else {
        throw error;
      }
    }
  };

  return <AsyncButton onClick={handler} {...restProps} />;
};

export default ButtonElement;
