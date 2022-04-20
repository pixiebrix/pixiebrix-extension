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

import React, { useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import { useAsyncEffect } from "use-async-effect";
import ToggleField from "@/pageEditor/components/ToggleField";
import { Button } from "react-bootstrap";
import { updateDynamicElement } from "@/contentScript/messenger/api";
import { thisTab } from "@/pageEditor/utils";
import { FormState } from "@/pageEditor/pageEditorTypes";
import { reportEvent } from "@/telemetry/events";
import { useSelector } from "react-redux";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";

const DEFAULT_RELOAD_MILLIS = 350;

function isPanelElement(element: FormState | null): boolean {
  return ["panel", "actionPanel"].includes(element?.type);
}

/**
 * Return true if the trigger runs automatically (not in response to a user action).
 * @param element
 */
function isAutomaticTrigger(element: FormState): boolean {
  const automatic = ["load", "appear", "initialize", "interval"];
  return (
    element?.type === "trigger" &&
    automatic.includes(element?.extensionPoint.definition.trigger)
  );
}

/**
 * Element reload controls for the page editor toolbar.
 *
 * Automatically update elements that are safe to update because they require user interaction to trigger. For others,
 * returns a set of UX controls for the user to control the updating:
 * - page load triggers
 * - element appear triggers
 * - panels
 * - sidebar panels
 */
const ReloadToolbar: React.FunctionComponent<{
  element: FormState;
  disabled: boolean;
  refreshMillis?: number;
}> = ({ element, refreshMillis = DEFAULT_RELOAD_MILLIS, disabled }) => {
  const sessionId = useSelector(selectSessionId);

  const run = useCallback(async () => {
    const { asDynamicElement: factory } = ADAPTERS.get(element.type);
    if (disabled) {
      console.warn("Updating dynamic possibly invalid element", {
        element,
      });
    }

    await updateDynamicElement(thisTab, factory(element));
  }, [element, disabled]);

  const manualRun = async () => {
    // Report before the run to report even if the run errors
    reportEvent("PageEditorManualRun", {
      sessionId,
      extensionId: element.uuid,
    });

    await run();
  };

  const debouncedRun = useDebouncedCallback(run, refreshMillis, {
    // If we could distinguish between types of edits, it might be reasonable to set leading: true. But in
    // general, the first keypress is going to lead to a state that's not interesting
    leading: false,
    // Make sure to run on last change so we have the final state after all the changes
    trailing: true,
  });

  const isPanel = isPanelElement(element);
  const isLoadTrigger = isAutomaticTrigger(element);
  const automaticUpdate = !(isLoadTrigger || isPanel);

  useAsyncEffect(async () => {
    if (disabled) {
      // Don't automatically re-run if in an invalid state
      return;
    }

    if (!automaticUpdate && !element.autoReload) {
      // By default, don't automatically trigger (because it might be doing expensive
      // operations such as hitting an API)
      return;
    }

    await debouncedRun();
  }, [debouncedRun, automaticUpdate, element, disabled]);

  if (automaticUpdate) {
    return null;
  }

  return (
    <>
      <label className="small my-auto mx-2 text-center">
        {isPanel ? "Auto-Render" : "Auto-Run"}
      </label>
      <ToggleField name="autoReload" />
      <Button
        className="mx-2"
        disabled={disabled}
        size="sm"
        variant="info"
        onClick={manualRun}
      >
        {isPanel ? "Render Panel" : "Run Trigger"}
      </Button>
    </>
  );
};

export default ReloadToolbar;
