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

import styles from "./ModEditorPane.module.scss";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveModId,
  selectEditorUpdateKey,
} from "@/pageEditor/store/editor/editorSelectors";
import { Alert } from "react-bootstrap";
import Centered from "@/components/Centered";
import EditorTabLayout, {
  type TabItem,
} from "@/components/tabLayout/EditorTabLayout";
import Logs from "@/pageEditor/tabs/Logs";
import ModMetadataEditor from "@/pageEditor/tabs/modMetadata/ModMetadataEditor";
import { type MessageContext } from "@/types/loggerTypes";
import { logActions } from "@/components/logViewer/logSlice";
import useLogsBadgeState from "@/pageEditor/tabs/logs/useLogsBadgeState";
import ModOptionsDefinitionEditor from "@/pageEditor/tabs/modOptionsDefinitions/ModOptionsDefinitionEditor";
import ModOptionsValuesEditor from "@/pageEditor/tabs/modOptionsValues/ModOptionsValuesEditor";

const ModEditorPane: React.VFC = () => {
  const dispatch = useDispatch();

  const activeModId = useSelector(selectActiveModId);

  const editorUpdateKey = useSelector(selectEditorUpdateKey);
  const layoutKey = `${activeModId}-${editorUpdateKey}`;

  useEffect(() => {
    const messageContext: MessageContext = activeModId
      ? {
          modId: activeModId,
        }
      : {};
    dispatch(logActions.setContext(messageContext));
  }, [dispatch, activeModId]);

  const [unreadLogsCount, logsBadgeVariant] = useLogsBadgeState();

  const tabItems: TabItem[] = [
    {
      name: "Edit",
      TabContent: ModMetadataEditor,
    },
    {
      name: "Current Inputs",
      TabContent: ModOptionsValuesEditor,
    },
    {
      name: "Input Form",
      TabContent: ModOptionsDefinitionEditor,
    },
    {
      name: "Logs",
      badgeCount: unreadLogsCount,
      badgeVariant: logsBadgeVariant,
      TabContent: Logs,
      mountWhenActive: true,
    },
  ];

  if (!activeModId) {
    return (
      <Centered>
        <Alert variant="danger">Mod not found</Alert>
      </Centered>
    );
  }

  return (
    <div className={styles.root} data-testid="modEditorPane">
      <EditorTabLayout key={layoutKey} tabs={tabItems} />
    </div>
  );
};

export default ModEditorPane;
