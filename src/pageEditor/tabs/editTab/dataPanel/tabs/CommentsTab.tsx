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
import React, { useContext } from "react";
import { Tab } from "react-bootstrap";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import styles from "@/pageEditor/tabs/dataPanelTabs.module.scss";
import TextWidget from "@/components/fields/schemaFields/widgets/TextWidget";
import { Events } from "@/telemetry/events";
import reportEvent from "@/telemetry/reportEvent";
import { type RegistryId } from "@/types/registryTypes";
import FieldRuntimeContext from "@/components/fields/schemaFields/FieldRuntimeContext";
import { type Schema } from "@/types/schemaTypes";

const commentsSchema: Schema = { type: "string" };

const CommentsTab: React.FunctionComponent<{
  brickId: RegistryId;
  brickCommentsFieldName: string;
  modId?: RegistryId;
}> = ({ brickCommentsFieldName, brickId, modId }) => {
  const context = useContext(FieldRuntimeContext);
  const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    const comments = event.target.value;
    reportEvent(Events.BRICK_COMMENTS_UPDATE, {
      commentsLength: comments.length,
      modId,
      brickId,
    });
  };

  return (
    <Tab.Pane eventKey={DataPanelTabKey.Comments} className={styles.tabPane}>
      <FieldRuntimeContext.Provider
        value={{ ...context, allowExpressions: false }}
      >
        <TextWidget
          name={brickCommentsFieldName}
          schema={commentsSchema}
          onBlur={handleBlur}
        />
      </FieldRuntimeContext.Provider>
    </Tab.Pane>
  );
};

export default CommentsTab;
