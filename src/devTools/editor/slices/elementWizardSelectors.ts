import { RootState } from "@/devTools/store";

const selectors = {
  step: (rootState: RootState) => rootState.elementWizard.step,
};

export default selectors;
