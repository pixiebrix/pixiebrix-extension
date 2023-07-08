import { useDispatch } from "react-redux";
import { useAsyncEffect } from "use-async-effect";
import { getCurrentURL, thisTab } from "@/pageEditor/utils";
import { internalExtensionPointMetaFactory } from "@/pageEditor/extensionPoints/base";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { getExampleBlockPipeline } from "@/pageEditor/exampleExtensionConfig";
import { actions } from "@/pageEditor/slices/editorSlice";
import {
  showSidebar,
  updateDynamicElement,
} from "@/contentScript/messenger/api";
import { reportEvent } from "@/telemetry/events";
import { type ExtensionPointType } from "@/extensionPoints/types";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import notify from "@/utils/notify";

const { addElement, toggleInsert } = actions;

export function useAutoInsert(type: ExtensionPointType): void {
  const dispatch = useDispatch();

  useAsyncEffect(async () => {
    // These have their own UI, so don't auto-insert
    if (type === "menuItem" || type === "panel" || type == null) {
      return;
    }

    try {
      const url = await getCurrentURL();

      const config = ADAPTERS.get(type);

      const metadata = internalExtensionPointMetaFactory();

      const formState = config.fromNativeElement(
        url,
        metadata,
        undefined,
        []
      ) as FormState;

      formState.extension.blockPipeline = getExampleBlockPipeline(
        formState.type
      );

      dispatch(addElement(formState));
      dispatch(actions.checkActiveElementAvailability());

      // Don't auto-run tours on selection in Page Editor
      if (config.elementType !== "tour") {
        await updateDynamicElement(thisTab, config.asDynamicElement(formState));
      }

      // TODO: report if created new, or using existing foundation
      reportEvent("PageEditorStart", {
        type: config.elementType,
      });

      if (config.elementType === "actionPanel") {
        // For convenience, open the side panel if it's not already open so that the user doesn't
        // have to manually toggle it
        void showSidebar(thisTab);
      }

      reportEvent("ExtensionAddNew", {
        type: config.elementType,
      });
    } catch (error) {
      notify.error({
        message: "Error adding mod",
        error,
      });
      dispatch(toggleInsert(null));
    }
  }, [type, dispatch]);
}

export default useAutoInsert;
