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

import { selectActiveModComponentFormState } from "@/pageEditor/store/editor/editorSelectors";
import React from "react";
import { useSelector } from "react-redux";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import DataTabPane from "@/pageEditor/tabs/editTab/dataPanel/DataTabPane";
import DataTabJsonTree from "@/pageEditor/tabs/editTab/dataPanel/DataTabJsonTree";
import { selectModComponentAnnotations } from "@/analysis/analysisSelectors";
import { assertNotNullish } from "@/utils/nullishUtils";

/**
 * Developer-only data panel tab for viewing the underlying mod component form state JSON. Used to debug mod component
 * form state updates (e.g., automatic useEffect state transitions).
 */
const ModComponentFormStateTab: React.FC = () => {
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  assertNotNullish(
    activeModComponentFormState,
    "No active mod component form state found",
  );
  const annotations = useSelector(
    selectModComponentAnnotations(activeModComponentFormState.uuid),
  );

  return (
    <DataTabPane
      eventKey={DataPanelTabKey.ModComponentFormState}
      isDeveloperOnly
    >
      <DataTabJsonTree
        data={{ activeElement: activeModComponentFormState, annotations }}
        searchable
        tabKey={DataPanelTabKey.ModComponentFormState}
        label="Mod Component Form State"
      />
    </DataTabPane>
  );
};

export default ModComponentFormStateTab;
