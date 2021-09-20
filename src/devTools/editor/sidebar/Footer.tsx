/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useCallback, useContext, useEffect } from "react";
import AuthContext from "@/auth/AuthContext";
import { DevToolsContext } from "@/devTools/context";
import BeatLoader from "react-spinners/BeatLoader";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/devTools/store";
import { actions } from "@/devTools/editor/slices/editorSlice";

const Footer: React.FunctionComponent = () => {
  const { scope, flags } = useContext(AuthContext);
  const { connecting } = useContext(DevToolsContext);

  const hasBetaFeatureFlag = flags.includes("page-editor-beta");

  const isBetaUI = useSelector(
    (rootState: RootState) => rootState.editor.isBetaUI
  );

  const dispatch = useDispatch();

  const toggleBetaUI = useCallback(() => {
    dispatch(actions.setBetaUIEnabled(!isBetaUI));
  }, [isBetaUI, dispatch]);

  useEffect(() => {
    if (flags.includes("beta-auto")) {
      dispatch(actions.setBetaUIEnabled(true));
    }
  }, [dispatch, flags]);

  return (
    <div className="Sidebar__footer flex-grow-0">
      {hasBetaFeatureFlag && (
        <div>
          <label>
            Enable Beta UI
            <input type="checkbox" checked={isBetaUI} onChange={toggleBetaUI} />
          </label>
        </div>
      )}
      <div className="d-flex">
        <div className="flex-grow-1">
          Scope: <code>{scope}</code>
        </div>
        <div>{connecting && <BeatLoader size={7} />}</div>
      </div>
    </div>
  );
};

export default Footer;
