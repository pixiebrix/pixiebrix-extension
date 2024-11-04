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
import { selectActiveModId } from "@/pageEditor/store/editor/editorSelectors";
import EditorTabLayout, {
  type TabItem,
} from "@/components/tabLayout/EditorTabLayout";
import Logs from "@/pageEditor/tabs/Logs";
import ModMetadataEditor from "@/pageEditor/tabs/modMetadata/ModMetadataEditor";
import { logActions } from "@/components/logViewer/logSlice";
import useLogsBadgeState from "@/pageEditor/tabs/logs/useLogsBadgeState";
import ModOptionsDefinitionEditor from "@/pageEditor/tabs/modOptionsDefinitions/ModOptionsDefinitionEditor";
import ModOptionsArgsEditor from "@/pageEditor/tabs/modOptionsArgs/ModOptionsArgsEditor";
import useRegisterDraftModInstanceOnAllFrames from "@/pageEditor/hooks/useRegisterDraftModInstanceOnAllFrames";
import { assertNotNullish } from "@/utils/nullishUtils";
import ModVariablesEditor from "@/pageEditor/tabs/modVariablesDefinition/ModVariablesDefinitionEditor";
import { FeatureFlags } from "@/auth/featureFlags";

const ModEditorPane: React.VFC = () => {
  const dispatch = useDispatch();

  // Inject the draft mod instance into the page while editing
  useRegisterDraftModInstanceOnAllFrames();

  const activeModId = useSelector(selectActiveModId);
  assertNotNullish(activeModId, "Expected active mod id");

  useEffect(() => {
    dispatch(logActions.setContext({ messageContext: { modId: activeModId } }));
  }, [dispatch, activeModId]);

  const [unreadLogsCount, logsBadgeVariant] = useLogsBadgeState();

  const tabItems: TabItem[] = [
    {
      name: "Edit",
      TabContent: ModMetadataEditor,
    },
    {
      name: "Mod Variables",
      TabContent: ModVariablesEditor,
      flag: FeatureFlags.PAGE_EDITOR_MOD_VARIABLES_DEFINITION,
    },
    {
      name: "Current Inputs",
      TabContent: ModOptionsArgsEditor,
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
    },
  ];

  return (
    // Only need to remount on activeModId change because the sub-tabs mount/unmount on selection and there's
    // no Redux actions that'd update the values while the forms are mounted
    <div className={styles.root} data-testid="modEditorPane">
      <EditorTabLayout key={activeModId} tabs={tabItems} />
    </div>
  );
};

export default ModEditorPane;
