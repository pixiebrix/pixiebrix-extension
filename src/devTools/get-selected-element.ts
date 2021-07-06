import { expectContentScript } from "@/utils/expect-context";
import { evaluableFunction } from "@/utils";

export let selectedElement: HTMLElement; // Live binding

export function addListenerForUpdateSelectedElement(): void {
  expectContentScript();
  window.addEventListener("@@pixiebrix/devtools/get-selected", (el) => {
    selectedElement = el.target as HTMLElement;
  });
}

export function updateSelectedElement(): void {
  chrome.devtools.inspectedWindow.eval(
    evaluableFunction(() => {
      // This function must be self-contained
      // @ts-expect-error -- $0 is from the dev Tools API
      $0.dispatchEvent(
        new CustomEvent("@@pixiebrix/devtools/get-selected", { bubbles: true })
      );
    })
  );
}
