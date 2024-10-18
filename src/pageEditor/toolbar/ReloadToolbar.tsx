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
import { adapterForComponent } from "@/pageEditor/starterBricks/adapter";
import ToggleField from "@/pageEditor/components/ToggleField";
import { Button } from "react-bootstrap";
import { updateDraftModComponent } from "@/contentScript/messenger/api";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { useSelector } from "react-redux";
import { selectSessionId } from "@/pageEditor/store/session/sessionSelectors";
import useKeyboardShortcut from "@/hooks/useKeyboardShortcut";
import { allFramesInInspectedTab } from "@/pageEditor/context/connection";
import { StarterBrickTypes } from "@/types/starterBrickTypes";

const DEFAULT_RELOAD_MILLIS = 350;

function isPanel(modComponentFormState: ModComponentFormState): boolean {
  return (
    modComponentFormState.starterBrick.definition.type ===
    StarterBrickTypes.SIDEBAR_PANEL
  );
}

/**
 * Return true if the trigger runs automatically (not in response to a user action).
 */
function isAutomaticTrigger(
  modComponentFormState: ModComponentFormState,
): boolean {
  if (!modComponentFormState) {
    return false;
  }

  const automatic = ["load", "appear", "initialize", "interval"];
  const { definition: starterBrickDefinition } =
    modComponentFormState.starterBrick;
  return (
    starterBrickDefinition.type === StarterBrickTypes.TRIGGER &&
    starterBrickDefinition.trigger != null &&
    automatic.includes(starterBrickDefinition.trigger)
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
  const automaticUpdate = !(
    isAutomaticTrigger(modComponentFormState) ||
    // By default, don't automatically trigger (because it might be doing expensive operations such as hitting an API)
    isPanel(modComponentFormState)
  );

  return automaticUpdate || (modComponentFormState.autoReload ?? false);
}

/**
 * Mod component reload controls for the Page Editor toolbar.
 *
 * Automatically update draft mod components that are safe to update because they require user interaction to trigger. For others,
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
  const { asDraftModComponent } = adapterForComponent(modComponentFormState);

  const run = useCallback(async () => {
    updateDraftModComponent(
      allFramesInInspectedTab,
      asDraftModComponent(modComponentFormState),
    );
  }, [asDraftModComponent, modComponentFormState]);

  const manualRun = async () => {
    // Report before the run to report even if the run errors
    reportEvent(Events.PAGE_EDITOR_MANUAL_RUN, {
      sessionId,
      modComponentId: modComponentFormState.uuid,
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

  if (isAutomaticTrigger(modComponentFormState)) {
    return (
      <Controls
        autoLabel="Auto-Run"
        manualRun={manualRun}
        buttonCaption="Run Trigger"
      />
    );
  }

  return null;
};

export default ReloadToolbar;
