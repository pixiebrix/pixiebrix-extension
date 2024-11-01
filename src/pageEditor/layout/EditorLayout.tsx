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

import React, { useEffect, useMemo } from "react";
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
import { RestrictedFeatures } from "@/auth/featureFlags";

const EditorLayout: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const { insertingStarterBrickType } = useInsertPane();
  const { restrict } = useFlags();
  const isStaleSession = useSelector(selectIsStaleSession);
  const isRestricted = restrict(RestrictedFeatures.PAGE_EDITOR);
  const isInserting = Boolean(insertingStarterBrickType);
  const inspectedUrl = useCurrentInspectedUrl();

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

  // Hide modals on Editor state transitions
  // XXX: using usePreviousValue on currentPane was causing infinite re-render even when the useMemo was stable
  // because the value of currentPane was changing between renders. That might be a quirk in how React fragments work?
  useEffect(() => {
    dispatch(editorActions.hideModal());
  }, [dispatch, isInserting, isRestricted, isStaleSession]);

  if (!inspectedUrl) {
    // Nearly immediate, likely never shown
    return <Loader />;
  }

  if (!isScriptableUrl(inspectedUrl)) {
    return <NonScriptablePage url={inspectedUrl} />;
  }

  return (
    <>
      <div className={styles.root}>{currentPane}</div>
      <Modals />
    </>
  );
};

export default EditorLayout;
