import { PerfTools, PerfState, DefaultPerfToolsField } from "./perfTypes";
import { globalOption } from "./constants/globalOption";
import { set } from "lodash";

const checkRenderTimeDeclaring = (prop: keyof PerfTools) => {
  if (prop === "renderTime" && globalOption.isDeclaredRenderTime) {
    console.warn(
      "[react-performance-testing] You need to execute test one by one when you use `renderTime`. Please check here: https://github.com/keiya01/react-performance-testing#renderTime"
    );
  } else {
    globalOption.isDeclaredRenderTime = true;
  }
};

export type Store = {
  tools: PerfTools;
  componentsMap: WeakMap<Record<string, unknown>, any>;
  perfState: PerfState;
};

export const getDefaultStore = () => ({
  tools: {
    renderCount: { current: {} },
    renderTime: { current: {} },
  },
  componentsMap: new WeakMap(),
  perfState: Object.defineProperties(
    {
      hasRenderCount: !Proxy,
      hasRenderTime: !Proxy,
    },
    {
      // eslint-disable-next-line accessor-pairs -- imported code
      renderCount: {
        set(value: boolean) {
          this.hasRenderCount = value;
        },
      },
      // eslint-disable-next-line accessor-pairs -- imported code
      renderTime: {
        set(value: boolean) {
          this.hasRenderTime = value;
        },
      },
    }
  ),
});

export const store: Store = getDefaultStore();

export const getPerfTools = <T extends DefaultPerfToolsField>() =>
  new Proxy(store.tools, {
    get(target, prop: keyof PerfTools) {
      checkRenderTimeDeclaring(prop);
      set(store.perfState, prop, true);
      return target[prop];
    },
  }) as PerfTools<T>;
