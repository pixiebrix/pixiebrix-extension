import { expectContentScript } from "@/utils/expectContext";
import { evaluableFunction } from "@/utils";

export let selectedElement: HTMLElement; // Live binding

const GET_SELECTED_DEV_TOOLS_ELEMENT = "@@pixiebrix/devtools/get-selected";

export function addListenerForUpdateSelectedElement(): void {
  expectContentScript();
  window.addEventListener(GET_SELECTED_DEV_TOOLS_ELEMENT, (el) => {
    selectedElement = el.target as HTMLElement;
  });
}

export function updateSelectedElement(): void {
  let $0: Element; // Unused, type only, don't move it inside `evaluableFunction`

  chrome.devtools.inspectedWindow.eval(
    evaluableFunction(() => {
      // This function does not have access outside its scope,
      // don't use the `GET_SELECTED_DEV_TOOLS_ELEMENT` constant
      ($0 ?? document.body).dispatchEvent(
        new CustomEvent("@@pixiebrix/devtools/get-selected", { bubbles: true })
      );
    })
  );
}
