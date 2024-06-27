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

import { useSelector } from "react-redux";
import { useState } from "react";
import useUpsertModComponentFormState from "@/pageEditor/hooks/useUpsertModComponentFormState";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import notify from "@/utils/notify";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";

type ExtensionSaver = {
  save: (modComponentFormState: ModComponentFormState) => Promise<void>;
  isSaving: boolean;
};

function useSaveStandaloneModComponent(): ExtensionSaver {
  const [isSaving, setIsSaving] = useState(false);
  const upsertModComponentFormState = useUpsertModComponentFormState();
  const sessionId = useSelector(selectSessionId);

  async function save(
    modComponentFormState: ModComponentFormState,
  ): Promise<void> {
    setIsSaving(true);

    try {
      const error = await upsertModComponentFormState({
        modComponentFormState,
        options: {
          pushToCloud: true,
          checkPermissions: true,
          notifySuccess: true,
          reactivateEveryTab: true,
        },
      });

      if (error) {
        notify.error(error);
      } else {
        reportEvent(Events.PAGE_EDITOR_STANDALONE_MOD_COMPONENT_UPDATE, {
          sessionId,
          extensionId: modComponentFormState.uuid,
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  return {
    save,
    isSaving,
  };
}

export default useSaveStandaloneModComponent;
