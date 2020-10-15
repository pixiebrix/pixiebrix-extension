import { liftContentScript } from "@/contentScript/protocol";
import { handleNavigate } from "@/lifecycle";

export const notifyNavigation = liftContentScript(
  "navigate",
  async () => {
    // TODO: pass watched readers once we re-implement that functionality
    handleNavigate({});
  },
  { asyncResponse: false }
);
