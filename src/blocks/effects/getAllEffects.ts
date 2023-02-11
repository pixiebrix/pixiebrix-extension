/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { TourEffect } from "./tourEffect";
import { AttachAutocomplete } from "./attachAutocomplete";
import { ReactivateEffect } from "./reactivate";
import { SoundEffect } from "./sound";
import { DisableEffect } from "./disable";
import { EnableEffect } from "./enable";
import InsertHtml from "@/blocks/effects/insertHtml";
import CustomEventEffect from "@/blocks/effects/customEvent";
import ReplaceTextEffect from "@/blocks/effects/replaceText";
import HighlightText from "@/blocks/effects/highlightText";
import ScrollIntoViewEffect from "@/blocks/effects/scrollIntoView";
import AddQuickBarAction from "@/blocks/effects/AddQuickBarAction";
import ToggleQuickbarEffect from "@/blocks/effects/ToggleQuickbarEffect";
import SubmitPanelEffect from "@/blocks/effects/submitPanel";
import { RunSubTourEffect } from "@/blocks/effects/runSubTour";
import { type IBlock } from "@/core";

function getAllEffects(): IBlock[] {
  return [
    new LogEffect(),
    new OpenURLEffect(),
    new NavigateURLEffect(),
    new CopyToClipboard(),
    new FormFill(),
    new SetInputValue(),
    new CloseTabEffect(),
    new ActivateTabEffect(),
    new HighlightEffect(),
    new SetVueValues(),
    new ElementEvent(),
    new WaitEffect(),
    new WaitElementEffect(),
    new AlertEffect(),
    new GetPageState(),
    new SetPageState(),
    new HideEffect(),
    new ExportCsv(),
    new HideSidebar(),
    new ShowSidebar(),
    new CancelEffect(),
    new ErrorEffect(),
    new ShowEffect(),
    new TelemetryEffect(),
    new ConfettiEffect(),
    new TourEffect(),
    new AttachAutocomplete(),
    new ReactivateEffect(),
    new SoundEffect(),
    new EnableEffect(),
    new DisableEffect(),
    new InsertHtml(),
    new CustomEventEffect(),
    new ReplaceTextEffect(),
    new HighlightText(),
    new ScrollIntoViewEffect(),
    new AddQuickBarAction(),
    new ToggleQuickbarEffect(),
    new SubmitPanelEffect(),
    new RunSubTourEffect(),
  ];
}

export default getAllEffects;
