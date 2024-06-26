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

import React, { useCallback, useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";
import { ADAPTERS } from "@/pageEditor/starterBricks/adapter";
import ToggleField from "@/pageEditor/components/ToggleField";
import { Button } from "react-bootstrap";
import { updateDraftModComponent } from "@/contentScript/messenger/api";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { useSelector } from "react-redux";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import useKeyboardShortcut from "@/hooks/useKeyboardShortcut";
import { allFramesInInspectedTab } from "@/pageEditor/context/connection";
import { assertNotNullish } from "@/utils/nullishUtils";

const DEFAULT_RELOAD_MILLIS = 350;

function isPanel(modComponentFormState: ModComponentFormState | null): boolean {
  return ["panel", "actionPanel"].includes(modComponentFormState?.type ?? "");
}

/**
 * Return true if the trigger runs automatically (not in response to a user action).
 */
function isAutomaticTrigger(
  modComponentFormState: ModComponentFormState,
): boolean {
  const automatic = ["load", "appear", "initialize", "interval"];
  return (
    modComponentFormState?.type === "trigger" &&
    automatic.includes(
      modComponentFormState?.extensionPoint.definition.trigger ?? "",
    )
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
 * Return true if the mod component for the mod component form state should be automatically updated on the page.
 * @param modComponentFormState the form state for the mod component to check
 */
export function shouldAutoRun(
  modComponentFormState: ModComponentFormState,
): boolean {
  const isTour = modComponentFormState.type === "tour";
  const automaticUpdate = !(
    isAutomaticTrigger(modComponentFormState) || // By default, don't automatically trigger (because it might be doing expensive operations such as hitting an API)
    isPanel(modComponentFormState) ||
    isTour
  );

  return automaticUpdate || (modComponentFormState.autoReload ?? false);
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
  modComponentFormState: ModComponentFormState;
  refreshMillis?: number;
}> = ({ modComponentFormState, refreshMillis = DEFAULT_RELOAD_MILLIS }) => {
  const sessionId = useSelector(selectSessionId);

  const run = useCallback(async () => {
    const adapter = ADAPTERS.get(modComponentFormState.type);
    assertNotNullish(
      adapter,
      `Adapter not found for ${modComponentFormState.type}`,
    );
    const { asDraftModComponent: factory } = adapter;

    updateDraftModComponent(
      allFramesInInspectedTab,
      factory(modComponentFormState),
    );
  }, [modComponentFormState]);

  const manualRun = async () => {
    // Report before the run to report even if the run errors
    reportEvent(Events.PAGE_EDITOR_MANUAL_RUN, {
      sessionId,
      extensionId: modComponentFormState.uuid,
    });

    await run();
  };

  useKeyboardShortcut("F5", manualRun);

  const debouncedRun = useDebouncedCallback(run, refreshMillis, {
    // If we could distinguish between types of edits, it might be reasonable to set leading: true. But in
    // general, the first keypress is going to lead to a state that's not interesting
    leading: false,
    // Make sure to run on last change so we have the final state after all the changes
    trailing: true,
  });

  const isTrigger = isAutomaticTrigger(modComponentFormState);
  const isTour = modComponentFormState.type === "tour";

  useEffect(() => {
    if (!shouldAutoRun(modComponentFormState)) {
      return;
    }

    void debouncedRun();
  }, [debouncedRun, modComponentFormState]);

  if (isPanel(modComponentFormState)) {
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
