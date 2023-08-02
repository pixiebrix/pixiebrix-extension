import { selectSidebarHasModPanels } from "@/sidebar/sidebarSelectors";
import { sidebarEntryFactory } from "@/testUtils/factories/sidebarEntryFactories";
import { type SidebarRootState } from "@/types/sidebarTypes";

describe("sidebarSelectors", () => {
  describe("selectSidebarHasModPanels", () => {
    const sidebarRootState: SidebarRootState = {
      sidebar: {
        activeKey: "",
        panels: [],
        forms: [],
        temporaryPanels: [],
        staticPanels: [],
        modActivationPanel: null,
        pendingActivePanel: null,
        closedTabs: {},
      },
      options: { extensions: [] },
    };

    it("returns false if there are no sidebar panels, forms, or temporaryPanels", () => {
      expect(selectSidebarHasModPanels(sidebarRootState)).toBeFalse();
    });

    it("returns true if there are panels", () => {
      expect(
        selectSidebarHasModPanels({
          ...sidebarRootState,
          sidebar: {
            ...sidebarRootState.sidebar,
            panels: [sidebarEntryFactory("panel")],
          },
        })
      ).toBeTrue();
    });

    it("returns true if there are forms", () => {
      expect(
        selectSidebarHasModPanels({
          ...sidebarRootState,
          sidebar: {
            ...sidebarRootState.sidebar,
            forms: [sidebarEntryFactory("form")],
          },
        })
      ).toBeTrue();
    });

    it("returns true if there are temp", () => {
      expect(
        selectSidebarHasModPanels({
          ...sidebarRootState,
          sidebar: {
            ...sidebarRootState.sidebar,
            temporaryPanels: [sidebarEntryFactory("temporaryPanel")],
          },
        })
      ).toBeTrue();
    });
  });
});
