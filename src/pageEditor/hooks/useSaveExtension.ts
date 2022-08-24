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

import { UUID } from "@/core";
import { useSelector } from "react-redux";
import { useState } from "react";
import useCreate from "@/pageEditor/hooks/useCreate";
import { selectElements } from "@/pageEditor/slices/editorSelectors";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import { reportEvent } from "@/telemetry/events";
import notify from "@/utils/notify";

type ExtensionSaver = {
  save: (extensionId: UUID) => Promise<void>;
  isSaving: boolean;
};

function useSaveExtension(): ExtensionSaver {
  const [isSaving, setIsSaving] = useState(false);
  const create = useCreate();
  const elements = useSelector(selectElements);
  const sessionId = useSelector(selectSessionId);

  async function save(extensionId: UUID): Promise<void> {
    const element = elements.find((element) => element.uuid === extensionId);
    setIsSaving(true);

    const error = await create({ element, pushToCloud: true });
    if (error) {
      notify.error(error);
    }

    setIsSaving(false);

    if (!error) {
      reportEvent("PageEditorSave", {
        sessionId,
        extensionId: element.uuid,
      });
    }
  }

  return {
    save,
    isSaving,
  };
}

export default useSaveExtension;
