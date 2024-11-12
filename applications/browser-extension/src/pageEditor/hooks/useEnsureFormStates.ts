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

import { actions } from "@/pageEditor/store/editor/editorSlice";
import { modComponentToFormState } from "@/pageEditor/starterBricks/adapter";
import {
  selectCurrentModId,
  selectGetUntouchedActivatedModComponentsForMod,
} from "@/pageEditor/store/editor/editorSelectors";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";

/**
 * Hook to ensure all mod components have draft form states in the editor. For example, if you need to ensure
 * instanceIds are set for all brick configurations.
 */
function useEnsureFormStates(): void {
  const dispatch = useDispatch();
  const currentModId = useSelector(selectCurrentModId);
  const getUntouchedActivatedModComponentsForMod = useSelector(
    selectGetUntouchedActivatedModComponentsForMod,
  );

  const untouchedModComponents = currentModId
    ? getUntouchedActivatedModComponentsForMod(currentModId)
    : null;

  useEffect(() => {
    void Promise.all(
      (untouchedModComponents ?? []).map(async (modComponent) => {
        dispatch(
          actions.addModComponentFormState({
            modComponentFormState: await modComponentToFormState(modComponent),
            dirty: false,
            activate: false,
          }),
        );
      }),
    );
  }, [dispatch, untouchedModComponents]);
}

export default useEnsureFormStates;
