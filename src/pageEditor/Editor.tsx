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

import styles from "./Editor.module.scss";

import React, { useCallback, useContext, useEffect, useMemo } from "react";
import Sidebar from "@/pageEditor/sidebar/Sidebar";
import { useDispatch, useSelector } from "react-redux";
import { PageEditorTabContext } from "@/pageEditor/context";
import { selectExtensions } from "@/store/extensionsSelectors";
import PermissionsPane from "@/pageEditor/panes/PermissionsPane";
import BetaPane from "@/pageEditor/panes/BetaPane";
import InsertMenuItemPane from "@/pageEditor/panes/insert/InsertMenuItemPane";
import InsertPanelPane from "@/pageEditor/panes/insert/InsertPanelPane";
import NoExtensionSelectedPane from "@/pageEditor/panes/NoExtensionSelectedPane";
import NoExtensionsPane from "@/pageEditor/panes/NoExtensionsPane";
import WelcomePane from "@/pageEditor/panes/WelcomePane";
import EditorPane from "@/pageEditor/panes/EditorPane";
import useInstallState from "@/pageEditor/hooks/useInstallState";
import useEscapeHandler from "@/pageEditor/hooks/useEscapeHandler";
import GenericInsertPane from "@/pageEditor/panes/insert/GenericInsertPane";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import { actions } from "@/pageEditor/slices/editorSlice";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import { cancelSelect } from "@/contentScript/messenger/api";
import { thisTab } from "@/pageEditor/utils";
import {
  selectIsAddToRecipeModalVisible,
  selectIsCreateRecipeModalVisible,
  selectIsRemoveFromRecipeModalVisible,
  selectIsSaveAsNewRecipeModalVisible,
} from "@/pageEditor/slices/editorSelectors";
import RecipePane from "@/pageEditor/panes/RecipePane";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import { reportEvent } from "@/telemetry/events";
import { RootState } from "@/pageEditor/pageEditorTypes";
import AddToRecipeModal from "@/pageEditor/sidebar/AddToRecipeModal";
import RemoveFromRecipeModal from "@/pageEditor/sidebar/RemoveFromRecipeModal";
import CreateRecipeModal from "@/pageEditor/sidebar/CreateRecipeModal";
import SaveAsNewRecipeModal from "@/pageEditor/sidebar/SaveAsNewRecipeModal";

const selectEditor = ({ editor }: RootState) => editor;

const Editor: React.FunctionComponent = () => {
  const { tabState, connecting } = useContext(PageEditorTabContext);
  const installed = useSelector(selectExtensions);
  const dispatch = useDispatch();

  const sessionId = useSelector(selectSessionId);
  useEffect(() => {
    reportEvent("PageEditorSessionStart", {
      sessionId,
    });

    return () => {
      reportEvent("PageEditorSessionEnd", {
        sessionId,
      });
    };
  }, [sessionId]);

  // Async fetch marketplace content to the Redux so it's pre-fetched for rendering in the Brick Selection modal
  useGetMarketplaceListingsQuery();

  const {
    inserting,
    elements,
    activeElementId,
    activeRecipeId,
    error: editorError,
    beta,
  } = useSelector(selectEditor);

  const cancelInsert = useCallback(async () => {
    dispatch(actions.toggleInsert(null));
    await cancelSelect(thisTab);
  }, [dispatch]);

  useEscapeHandler(cancelInsert, inserting != null);

  const { availableDynamicIds, unavailableCount } = useInstallState(
    installed,
    elements
  );

  const isAddToRecipeModalVisible = useSelector(
    selectIsAddToRecipeModalVisible
  );
  const isRemoveFromRecipeModalVisible = useSelector(
    selectIsRemoveFromRecipeModalVisible
  );
  const isSaveAsNewRecipeModalVisible = useSelector(
    selectIsSaveAsNewRecipeModalVisible
  );
  const isCreateRecipeModalVisible = useSelector(
    selectIsCreateRecipeModalVisible
  );

  const body = useMemo(() => {
    // Need to explicitly check for `false` because hasPermissions will be undefined if pending/error
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
    if (tabState.hasPermissions === false && !connecting) {
      // Check `connecting` to optimistically show the main interface while the devtools are connecting to the page.
      return <PermissionsPane />;
    }

    if (editorError && beta) {
      return <BetaPane />;
    }

    if (inserting) {
      switch (inserting) {
        case "menuItem":
          return <InsertMenuItemPane cancel={cancelInsert} />;
        case "panel":
          return <InsertPanelPane cancel={cancelInsert} />;
        default:
          return (
            <GenericInsertPane
              cancel={cancelInsert}
              config={ADAPTERS.get(inserting)}
            />
          );
      }
    } else if (editorError) {
      return (
        <div className="p-2">
          <span className="text-danger">{editorError}</span>
        </div>
      );
    } else if (activeElementId) {
      return <EditorPane />;
    } else if (activeRecipeId) {
      return <RecipePane />;
    } else if (
      availableDynamicIds?.size ||
      installed.length > unavailableCount
    ) {
      return <NoExtensionSelectedPane />;
    } else if (installed.length > 0) {
      return <NoExtensionsPane unavailableCount={unavailableCount} />;
    } else {
      return <WelcomePane />;
    }
  }, [
    tabState.hasPermissions,
    connecting,
    editorError,
    beta,
    inserting,
    activeElementId,
    activeRecipeId,
    availableDynamicIds?.size,
    installed.length,
    unavailableCount,
    cancelInsert,
  ]);

  return (
    <>
      <div className={styles.root}>
        {inserting ? null : <Sidebar />}
        {body}
      </div>

      {isAddToRecipeModalVisible && <AddToRecipeModal />}

      {isRemoveFromRecipeModalVisible && <RemoveFromRecipeModal />}

      {isSaveAsNewRecipeModalVisible && <SaveAsNewRecipeModal />}

      {isCreateRecipeModalVisible && <CreateRecipeModal />}
    </>
  );
};

export default Editor;
