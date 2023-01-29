/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import React, { useCallback, useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import ToggleField from "@/pageEditor/components/ToggleField";
import { Button } from "react-bootstrap";
import { updateDynamicElement } from "@/contentScript/messenger/api";
import { thisTab } from "@/pageEditor/utils";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { reportEvent } from "@/telemetry/events";
import { useSelector } from "react-redux";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";

const DEFAULT_RELOAD_MILLIS = 350;

function isPanelElement(element: FormState | null): boolean {
  return ["panel", "actionPanel"].includes(element?.type);
}

/**
 * Return true if the trigger runs automatically (not in response to a user action).
 */
function isAutomaticTrigger(element: FormState): boolean {
  const automatic = ["load", "appear", "initialize", "interval"];
  return (
    element?.type === "trigger" &&
    automatic.includes(element?.extensionPoint.definition.trigger)
  );
}

const Controls: React.FunctionComponent<{
  autoLabel?: string;
  manualRun: () => void;
  buttonCaption: string;
}> = ({ autoLabel, manualRun, buttonCaption }) => (
  <>
    {autoLabel && (
      <>
        <label className="small my-auto mx-2 text-center">{autoLabel}</label>
        <ToggleField name="autoReload" />
      </>
    )}
    <Button className="mx-2" size="sm" variant="info" onClick={manualRun}>
      {buttonCaption}
    </Button>
  </>
);

/**
 * Return true if the element should be automatically updated on the page.
 * @param element the Page Editor form element
 */
export function shouldAutoRun(element: FormState): boolean {
  // By default, don't automatically trigger (because it might be doing expensive operations such as hitting an API)
  const isPanel = isPanelElement(element);
  const isTrigger = isAutomaticTrigger(element);
  const isTour = element.type === "tour";
  const automaticUpdate = !(isTrigger || isPanel || isTour);

  return automaticUpdate || element.autoReload;
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
 * - tours
 */
const ReloadToolbar: React.FunctionComponent<{
  element: FormState;
  refreshMillis?: number;
}> = ({ element, refreshMillis = DEFAULT_RELOAD_MILLIS }) => {
  const sessionId = useSelector(selectSessionId);

  const run = useCallback(async () => {
    const { asDynamicElement: factory } = ADAPTERS.get(element.type);
    await updateDynamicElement(thisTab, factory(element));
  }, [element]);

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
  const isTrigger = isAutomaticTrigger(element);
  const isTour = element.type === "tour";

  useEffect(() => {
    if (shouldAutoRun(element)) {
      return;
    }

    void debouncedRun();
  }, [debouncedRun, element]);

  if (isPanel) {
    return (
      <Controls
        autoLabel="Auto-Render"
        manualRun={manualRun}
        buttonCaption="Render Panel"
      />
    );
  }

  if (isTrigger) {
    return (
      <Controls
        autoLabel="Auto-Run"
        manualRun={manualRun}
        buttonCaption="Run Trigger"
      />
    );
  }

  if (isTour) {
    return <Controls manualRun={manualRun} buttonCaption="Run Tour" />;
  }

  return null;
};

export default ReloadToolbar;
