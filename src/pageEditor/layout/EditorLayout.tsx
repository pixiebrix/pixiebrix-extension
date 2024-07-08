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
import ModListingPanel from "@/pageEditor/modListingPanel/ModListingPanel";
import { useSelector } from "react-redux";
import useFlags from "@/hooks/useFlags";
import Modals from "../modals/Modals";
import { selectInsertingStarterBrickType } from "@/pageEditor/store/editor/editorSelectors";
import EditorContent from "@/pageEditor/layout/EditorContent";
import styles from "./EditorLayout.module.scss";
import RestrictedPane from "@/pageEditor/panes/RestrictedPane";
import InsertPane from "@/pageEditor/panes/insert/InsertPane";
import useCurrentInspectedUrl from "../hooks/useCurrentInspectedUrl";
import NonScriptablePage from "../panes/NonScriptablePage";
import { isScriptableUrl } from "webext-content-scripts";
import Loader from "@/components/Loader";
import { selectIsStaleSession } from "@/store/sessionChanges/sessionChangesSelectors";
import StaleSessionPane from "@/pageEditor/panes/StaleSessionPane";

const EditorLayout: React.FunctionComponent = () => {
  const insertingStarterBrickType = useSelector(
    selectInsertingStarterBrickType,
  );
  const { restrict } = useFlags();
  const isRestricted = restrict("page-editor");
  const isStaleSession = useSelector(selectIsStaleSession);

  const url = useCurrentInspectedUrl();

  if (!url) {
    // Nearly immediate, likely never shown
    return <Loader />;
  }

  if (!isScriptableUrl(url)) {
    return <NonScriptablePage url={url} />;
  }

  return (
    <>
      <div className={styles.root}>
        {isRestricted ? (
          <RestrictedPane />
        ) : isStaleSession ? (
          <StaleSessionPane />
        ) : insertingStarterBrickType ? (
          <InsertPane insertingStarterBrickType={insertingStarterBrickType} />
        ) : (
          <>
            <ModListingPanel />
            <EditorContent />
          </>
        )}
      </div>
      <Modals />
    </>
  );
};

export default EditorLayout;
