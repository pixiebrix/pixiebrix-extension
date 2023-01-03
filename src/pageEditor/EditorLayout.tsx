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

import React from "react";
import Sidebar from "@/pageEditor/sidebar/Sidebar";
import { useSelector } from "react-redux";
import useFlags from "@/hooks/useFlags";
import Modals from "./Modals";
import { selectInserting } from "@/pageEditor/slices/editorSelectors";
import EditorContent from "@/pageEditor/EditorContent";
import styles from "./Editor.module.scss";
import RestrictedPane from "@/pageEditor/panes/RestrictedPane";
import InsertPane from "@/pageEditor/panes/insert/InsertPane";
import { selectIsStaleSession } from "@/pageEditor/sessionChanges/sessionChangesSelectors";
import StaleSessionPane from "@/pageEditor/panes/StaleSessionPane";
import useCurrentUrl from "./hooks/useCurrentUrl";
import NonScriptablePage from "./NonScriptablePage";
import { isScriptableUrl } from "@/utils/permissions";
import Loader from "@/components/Loader";

const EditorLayout: React.FunctionComponent = () => {
  const inserting = useSelector(selectInserting);
  const { restrict } = useFlags();
  const isRestricted = restrict("page-editor");
  const isStaleSession = useSelector(selectIsStaleSession);

  const url = useCurrentUrl();

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
        ) : inserting ? (
          <InsertPane inserting={inserting} />
        ) : (
          <>
            <Sidebar />
            <EditorContent />
          </>
        )}
      </div>
      <Modals />
    </>
  );
};

export default EditorLayout;
