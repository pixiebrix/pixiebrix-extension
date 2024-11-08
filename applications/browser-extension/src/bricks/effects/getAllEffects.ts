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

import { LogEffect } from "./logger";
import { NavigateURLEffect, OpenURLEffect } from "./redirectPage";
import { CopyToClipboard } from "./clipboard";
import { FormFill, SetInputValue } from "./forms";
import { ActivateTabEffect, CloseTabEffect } from "./tabs";
import { HighlightEffect } from "./highlight";
import { SetVueValues } from "./vue";
import { ElementEvent } from "./event";
import { WaitEffect, WaitElementEffect } from "./wait";
import { AlertEffect } from "./alert";
import { GetPageState, SetPageState } from "./pageState";
import { HideEffect } from "./hide";
import { ExportCsv } from "./exportCsv";
import { HideSidebar, ShowSidebar, ToggleSidebar } from "./sidebarEffects";
import CancelEffect from "./CancelEffect";
import CancelEphemeralElements from "@/bricks/effects/CancelEphemeralElements";
import { ErrorEffect } from "./error";
import { ShowEffect } from "./show";
import { ConfettiEffect } from "./confetti";
import { TourEffect } from "./tourEffect";
import { AttachAutocomplete } from "./attachAutocomplete";
import { ReactivateEffect } from "./reactivate";
import { SoundEffect } from "./sound";
import { DisableEffect } from "./disable";
import { EnableEffect } from "./enable";
import InsertHtml from "@/bricks/effects/insertHtml";
import CustomEventEffect from "@/bricks/effects/customEvent";
import ReplaceTextEffect from "@/bricks/effects/replaceText";
import HighlightText from "@/bricks/effects/highlightText";
import ScrollIntoViewEffect from "@/bricks/effects/scrollIntoView";
import AddQuickBarAction from "@/bricks/effects/AddQuickBarAction";
import ToggleQuickbarEffect from "@/bricks/effects/ToggleQuickbarEffect";
import SubmitPanelEffect from "@/bricks/effects/submitPanel";
import { type Brick } from "@/types/brickTypes";
import PostMessageEffect from "@/bricks/effects/postMessage";
import AssignModVariable from "@/bricks/effects/assignModVariable";
import CommentEffect from "@/bricks/effects/comment";
import SetToolbarBadge from "@/bricks/effects/setToolbarBadge";
import InsertAtCursorEffect from "@/bricks/effects/InsertAtCursorEffect";
import AddDynamicTextSnippet from "@/bricks/effects/AddDynamicTextSnippet";
import AddTextSnippets from "@/bricks/effects/AddTextSnippets";
import ExportFileEffect from "@/bricks/effects/exportFileEffect";
import {
  StartCaptureAudioEffect,
  StopCaptureAudioEffect,
} from "@/bricks/effects/captureAudio";
import TelemetryEffect from "@/bricks/effects/TelemetryEffect";

function getAllEffects(): Brick[] {
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
    new AssignModVariable(),
    new HideEffect(),
    new ExportCsv(),
    new ExportFileEffect(),
    new HideSidebar(),
    new ShowSidebar(),
    new ToggleSidebar(),
    new CancelEffect(),
    new CancelEphemeralElements(),
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
    new PostMessageEffect(),
    new ReplaceTextEffect(),
    new HighlightText(),
    new ScrollIntoViewEffect(),
    new AddQuickBarAction(),
    new AddDynamicTextSnippet(),
    new AddTextSnippets(),
    new ToggleQuickbarEffect(),
    new SubmitPanelEffect(),
    new CommentEffect(),
    new SetToolbarBadge(),
    new InsertAtCursorEffect(),
    // Audio Capture Controls
    new StartCaptureAudioEffect(),
    new StopCaptureAudioEffect(),
  ];
}

export default getAllEffects;
