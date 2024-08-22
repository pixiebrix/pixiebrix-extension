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

import { useDispatch, useSelector } from "react-redux";
import { selectModComponentFormStates } from "@/pageEditor/store/editor/editorSelectors";
import { selectActivatedModComponents } from "@/store/modComponents/modComponentSelectors";
import { useEffect } from "react";
import { actions } from "@/pageEditor/store/editor/editorSlice";

/**
 * Note: This must be run underneath the PersistGate component in the React component tree
 */
export default function useMigrateStandaloneComponentsToMods() {
  const dispatch = useDispatch();
  const formStates = useSelector(selectModComponentFormStates);
  const activatedModComponents = useSelector(selectActivatedModComponents);

  useEffect(() => {
    const standaloneComponentFormStates = formStates.filter(
      (formState) => formState.modMetadata == null,
    );

    for (const formState of standaloneComponentFormStates) {
      const activatedModComponent = activatedModComponents.find(
        ({ id }) => id === formState.uuid,
      );

      if (activatedModComponent == null) {
        // We shouldn't touch "unsaved" form states that do not have a corresponding activated mod component
        return;
      }

      if (activatedModComponent._recipe == null) {
        dispatch(actions.removeModComponentFormState(formState.uuid));
      } else {
        dispatch(
          actions.syncModComponentFormState({
            ...formState,
            modMetadata: activatedModComponent._recipe,
          }),
        );
      }
    }
    // eslint-disable-next-line -- Only need to run this migration once
  }, []);
}
