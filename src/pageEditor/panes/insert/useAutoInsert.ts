import { useDispatch } from "react-redux";
import { useAsyncEffect } from "use-async-effect";
import { internalStarterBrickMetaFactory } from "@/pageEditor/starterBricks/base";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { getExampleBrickPipeline } from "@/pageEditor/panes/insert/exampleStarterBrickConfigs";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { openSidePanel } from "@/utils/sidePanelUtils";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import {
  type StarterBrickType,
  StarterBrickTypes,
} from "@/types/starterBrickTypes";
import { adapter } from "@/pageEditor/starterBricks/adapter";
import notify from "@/utils/notify";
import {
  allFramesInInspectedTab,
  getCurrentInspectedURL,
  inspectedTab,
} from "@/pageEditor/context/connection";
import { updateDraftModComponent } from "@/contentScript/messenger/api";

function useAutoInsert(starterBrickType: StarterBrickType | null): void {
  const dispatch = useDispatch();

  useAsyncEffect(async () => {
    // These have their own UI, so don't auto-insert
    if (
      starterBrickType === StarterBrickTypes.BUTTON ||
      starterBrickType == null
    ) {
      return;
    }

    try {
      const url = await getCurrentInspectedURL();

      const { fromNativeElement, asDraftModComponent } =
        adapter(starterBrickType);

      const metadata = internalStarterBrickMetaFactory();

      const initialFormState = fromNativeElement(
        url,
        metadata,
        // eslint-disable-next-line unicorn/no-useless-undefined -- typescript expects the argument
        undefined,
      ) as ModComponentFormState;

      initialFormState.modComponent.brickPipeline =
        getExampleBrickPipeline(starterBrickType);

      // ********************
      dispatch(actions.addModComponentFormState(initialFormState));
      dispatch(actions.checkActiveModComponentAvailability());

      updateDraftModComponent(
        allFramesInInspectedTab,
        asDraftModComponent(initialFormState),
      );
      // ********************

      // TODO: report if created new, or using existing foundation
      reportEvent(Events.PAGE_EDITOR_START, {
        type: starterBrickType,
      });

      if (starterBrickType === StarterBrickTypes.SIDEBAR_PANEL) {
        // For convenience, open the side panel if it's not already open so that the user doesn't
        // have to manually toggle it
        void openSidePanel(inspectedTab.tabId);
      }

      reportEvent(Events.MOD_COMPONENT_ADD_NEW, {
        type: starterBrickType,
      });
    } catch (error) {
      notify.error({
        message: "Error adding mod",
        error,
      });
      dispatch(actions.clearInsertingStarterBrickType());
    }
  }, [starterBrickType, dispatch]);
}

export default useAutoInsert;
