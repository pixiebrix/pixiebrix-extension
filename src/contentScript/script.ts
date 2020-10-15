import { liftContentScript } from "@/contentScript/protocol";
import { withSearchWindow, withDetectFrameworkVersions } from "@/common";

export const searchWindow = liftContentScript("searchWindow", withSearchWindow);
export const detectFrameworks = liftContentScript(
  "detectFrameworks",
  withDetectFrameworkVersions
);
