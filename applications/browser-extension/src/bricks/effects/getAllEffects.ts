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
import CancelEphemeralElements from "./CancelEphemeralElements";
import { ErrorEffect } from "./error";
import { ShowEffect } from "./show";
import { ConfettiEffect } from "./confetti";
import { TourEffect } from "./tourEffect";
import { AttachAutocomplete } from "./attachAutocomplete";
import { ReactivateEffect } from "./reactivate";
import { SoundEffect } from "./sound";
import { DisableEffect } from "./disable";
import { EnableEffect } from "./enable";
import InsertHtml from "./insertHtml";
import CustomEventEffect from "./customEvent";
import ReplaceTextEffect from "./replaceText";
import HighlightText from "./highlightText";
import ScrollIntoViewEffect from "./scrollIntoView";
import AddQuickBarAction from "./AddQuickBarAction";
import ToggleQuickbarEffect from "./ToggleQuickbarEffect";
import SubmitPanelEffect from "./submitPanel";
import { type Brick } from "../../types/brickTypes";
import PostMessageEffect from "./postMessage";
import AssignModVariable from "./assignModVariable";
import CommentEffect from "./comment";
import SetToolbarBadge from "./setToolbarBadge";
import InsertAtCursorEffect from "./InsertAtCursorEffect";
import AddDynamicTextSnippet from "./AddDynamicTextSnippet";
import AddTextSnippets from "./AddTextSnippets";
import ExportFileEffect from "./exportFileEffect";
import {
  StartCaptureAudioEffect,
  StopCaptureAudioEffect,
} from "./captureAudio";
import TelemetryEffect from "./TelemetryEffect";

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
