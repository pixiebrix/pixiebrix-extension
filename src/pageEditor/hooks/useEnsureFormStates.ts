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
  selectGetCleanComponentsAndDirtyFormStatesForMod,
} from "@/pageEditor/store/editor/editorSelectors";
import { useDispatch, useSelector } from "react-redux";
import useAsyncEffect from "use-async-effect";

/**
 * Hook to ensure all mod components have draft form states in the editor. For example, if you need to ensure
 * instanceIds are set for all brick configurations.
 */
function useEnsureFormStates(): void {
  const dispatch = useDispatch();
  const currentModId = useSelector(selectCurrentModId);
  const getCleanComponentsAndDirtyFormStatesForMod = useSelector(
    selectGetCleanComponentsAndDirtyFormStatesForMod,
  );

  const result = currentModId
    ? getCleanComponentsAndDirtyFormStatesForMod(currentModId)
    : null;

  useAsyncEffect(async () => {
    await Promise.all(
      (result?.cleanModComponents ?? []).map(async (modComponent) => {
        dispatch(
          actions.addModComponentFormState({
            modComponentFormState: await modComponentToFormState(modComponent),
            dirty: false,
          }),
        );
      }),
    );
  }, [result]);
}

export default useEnsureFormStates;
