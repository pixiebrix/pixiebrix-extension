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
import React, { useContext } from "react";
import { DataPanelTabKey } from "../dataPanelTypes";
import TextWidget from "../../../../../components/fields/schemaFields/widgets/TextWidget";
import { Events } from "../../../../../telemetry/events";
import reportEvent from "../../../../../telemetry/reportEvent";
import FieldRuntimeContext from "../../../../../components/fields/schemaFields/FieldRuntimeContext";
import { type Schema } from "../../../../../types/schemaTypes";
import DataTabPane from "../DataTabPane";
import { useSelector } from "react-redux";
import {
  selectActiveNodeEventData,
  selectActiveNodeInfo,
} from "../../../../store/editor/editorSelectors";
import { joinPathParts } from "../../../../../utils/formUtils";

const commentsSchema: Schema = { type: "string" };

const CommentsTab: React.FunctionComponent = () => {
  const { path: brickPath } = useSelector(selectActiveNodeInfo);

  const context = useContext(FieldRuntimeContext);

  const eventData = useSelector(selectActiveNodeEventData);

  const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    const comments = event.target.value;
    reportEvent(Events.BRICK_COMMENTS_UPDATE, {
      ...eventData,
      commentsLength: comments.length,
    });
  };

  return (
    <DataTabPane eventKey={DataPanelTabKey.Comments}>
      <FieldRuntimeContext.Provider
        value={{ ...context, allowExpressions: false }}
      >
        <TextWidget
          name={joinPathParts(brickPath, "comments")}
          schema={commentsSchema}
          onBlur={handleBlur}
        />
      </FieldRuntimeContext.Provider>
    </DataTabPane>
  );
};

export default CommentsTab;
