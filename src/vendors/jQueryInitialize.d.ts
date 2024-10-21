import { type Promisable } from "type-fest";

/** Attach a MutationObserver specifically for a selector */
const initialize: (
  selector: string,
  callback: (
    this: Element,
    index: number,
    element: Element,
  ) => Promisable<void | false>,
  options: { target: Element | Document; observer?: MutationObserverInit },
) => MutationObserver;

export default initialize;
