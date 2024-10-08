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

import React, { useMemo } from "react";
import ModListingPanel from "@/pageEditor/modListingPanel/ModListingPanel";
import { useDispatch, useSelector } from "react-redux";
import useFlags from "@/hooks/useFlags";
import Modals from "../modals/Modals";
import EditorContent from "@/pageEditor/layout/EditorContent";
import styles from "./EditorLayout.module.scss";
import RestrictedPane from "@/pageEditor/panes/RestrictedPane";
import InsertPane, {
  useInsertPane,
} from "@/pageEditor/panes/insert/InsertPane";
import useCurrentInspectedUrl from "../hooks/useCurrentInspectedUrl";
import NonScriptablePage from "../panes/NonScriptablePage";
import { isScriptableUrl } from "webext-content-scripts";
import Loader from "@/components/Loader";
import { selectIsStaleSession } from "@/store/sessionChanges/sessionChangesSelectors";
import StaleSessionPane from "@/pageEditor/panes/StaleSessionPane";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { usePreviousValue } from "@/hooks/usePreviousValue";
import { RestrictedFeatures } from "@/auth/featureFlags";

const EditorLayout: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const { insertingStarterBrickType } = useInsertPane();
  const isInserting = Boolean(insertingStarterBrickType);
  const { restrict } = useFlags();
  const isRestricted = restrict(RestrictedFeatures.PAGE_EDITOR);
  const isStaleSession = useSelector(selectIsStaleSession);

  const url = useCurrentInspectedUrl();

  const currentPane = useMemo(
    () =>
      isRestricted ? (
        <RestrictedPane />
      ) : isStaleSession ? (
        <StaleSessionPane />
      ) : isInserting ? (
        <InsertPane />
      ) : (
        <>
          <ModListingPanel />
          <EditorContent />
        </>
      ),
    [isInserting, isRestricted, isStaleSession],
  );

  const previousPane = usePreviousValue(currentPane);
  if (previousPane !== currentPane) {
    dispatch(editorActions.hideModal());
  }

  if (!url) {
    // Nearly immediate, likely never shown
    return <Loader />;
  }

  if (!isScriptableUrl(url)) {
    return <NonScriptablePage url={url} />;
  }

  return (
    <>
      <div className={styles.root}>{currentPane}</div>
      <Modals />
    </>
  );
};

export default EditorLayout;
