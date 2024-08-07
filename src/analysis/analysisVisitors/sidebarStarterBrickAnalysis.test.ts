/*
 * Copyright (C) 2024 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { sidebarPanelFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import SidebarStarterBrickAnalysis from "@/analysis/analysisVisitors/sidebarStarterBrickAnalysis";

describe("SidebarStarterBrickAnalysis", () => {
  it("accepts a valid sidebar starter brick", async () => {
    const formState = sidebarPanelFormStateFactory();
    const analysis = new SidebarStarterBrickAnalysis();
    await analysis.run(formState);
    expect(analysis.getAnnotations()).toHaveLength(0);
  });

  it("returns a warning when the sidebar starter brick has an empty tab title", async () => {
    const formState = sidebarPanelFormStateFactory({
      modComponent: { heading: "", brickPipeline: [] },
    });
    const analysis = new SidebarStarterBrickAnalysis();
    await analysis.run(formState);
    expect(analysis.getAnnotations()).toHaveLength(1);
    expect(analysis.getAnnotations()[0]).toEqual({
      analysisId: "sidebarStarterBrick",
      message: "Tab Title is required",
      position: { path: "modComponent.heading" },
      type: "warning",
    });
  });
});
