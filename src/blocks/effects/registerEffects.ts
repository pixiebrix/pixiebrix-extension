/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { registerBlock } from "@/blocks/registry";
import { LogEffect } from "./logger";
import { NavigateURLEffect, OpenURLEffect } from "./redirectPage";
import { CopyToClipboard } from "./clipboard";
import { FormFill, SetInputValue } from "./forms";
import { CloseTabEffect, ActivateTabEffect } from "./tabs";
import { HighlightEffect } from "./highlight";
import { SetVueValues } from "./vue";
import { ElementEvent } from "./event";
import { WaitEffect, WaitElementEffect } from "./wait";
import { AlertEffect } from "./alert";
import { GetPageState, SetPageState } from "./pageState";
import { HideEffect } from "./hide";
import { ExportCsv } from "./exportCsv";
import { HideSidebar, ShowSidebar } from "./sidebar";
import { CancelEffect } from "./cancel";
import { ErrorEffect } from "./error";
import { ShowEffect } from "./show";
import { TelemetryEffect } from "./telemetry";
import { ConfettiEffect } from "./confetti";
import { TourEffect } from "./tour";
import { AttachAutocomplete } from "./attachAutocomplete";
import { ReactivateEffect } from "./reactivate";
import { SoundEffect } from "./sound";
import { DisableEffect } from "./disable";
import { EnableEffect } from "./enable";
import InsertHtml from "@/blocks/effects/insertHtml";

function registerEffects(): void {
  registerBlock(new LogEffect());
  registerBlock(new OpenURLEffect());
  registerBlock(new NavigateURLEffect());
  registerBlock(new CopyToClipboard());
  registerBlock(new FormFill());
  registerBlock(new SetInputValue());
  registerBlock(new CloseTabEffect());
  registerBlock(new ActivateTabEffect());
  registerBlock(new HighlightEffect());
  registerBlock(new SetVueValues());
  registerBlock(new ElementEvent());
  registerBlock(new WaitEffect());
  registerBlock(new WaitElementEffect());
  registerBlock(new AlertEffect());
  registerBlock(new GetPageState());
  registerBlock(new SetPageState());
  registerBlock(new HideEffect());
  registerBlock(new ExportCsv());
  registerBlock(new HideSidebar());
  registerBlock(new ShowSidebar());
  registerBlock(new CancelEffect());
  registerBlock(new ErrorEffect());
  registerBlock(new ShowEffect());
  registerBlock(new TelemetryEffect());
  registerBlock(new ConfettiEffect());
  registerBlock(new TourEffect());
  registerBlock(new AttachAutocomplete());
  registerBlock(new ReactivateEffect());
  registerBlock(new SoundEffect());
  registerBlock(new EnableEffect());
  registerBlock(new DisableEffect());
  registerBlock(new InsertHtml());
}

export default registerEffects;
