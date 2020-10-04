import { useCallback, useState } from "react";
import {
  EXTENSION_STORE_GET,
  EXTENSION_STORE_DISPATCH,
} from "@/messaging/constants";
import useAsyncEffect from "use-async-effect";
import { messageExtension } from "@/chrome";
import { OptionsState, optionsSlice } from "./slices";

interface StoreState {
  options: OptionsState;
}

type Action = typeof optionsSlice.actions;

function useExtensionStore(): [StoreState, (action: Action) => Promise<void>] {
  const [state, setState] = useState<StoreState>();
  useAsyncEffect(async (isMounted) => {
    const state = await messageExtension({ type: EXTENSION_STORE_GET });
    if (!isMounted()) {
      return;
    }
    setState(state as StoreState);
  }, []);

  const dispatch = useCallback(async (action: Action) => {
    await messageExtension({ type: EXTENSION_STORE_DISPATCH, payload: action });
  }, []);

  return [state, dispatch];
}

export default useExtensionStore;
