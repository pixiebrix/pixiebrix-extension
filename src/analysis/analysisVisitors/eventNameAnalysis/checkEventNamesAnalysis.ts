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

import { AnalysisVisitorABC } from "@/analysis/analysisVisitors/baseAnalysisVisitors";
import {
  type FormState,
  isTriggerExtensionPoint,
} from "@/pageEditor/extensionPoints/formStateTypes";
import { flatten, isEmpty, uniq } from "lodash";
import { AnnotationType } from "@/types/annotationTypes";
import CollectNamesVisitor, {
  type EventNameAnalysisResult,
} from "@/analysis/analysisVisitors/eventNameAnalysis/collectEventNamesVisitor";
import { DOM_EVENTS } from "@/types/browserTypes";

/**
 * Analysis visitor to collect all events fired by a single IExtension.
 * @see CollectNamesVisitor
 */
class CheckEventNamesAnalysis extends AnalysisVisitorABC {
  private collectedEvents: EventNameAnalysisResult;

  constructor(readonly formStates: FormState[]) {
    super();
  }

  get id() {
    return "eventNames";
  }

  get knownEventNames(): string[] {
    return this.collectedEvents.knownNames;
  }

  override visitExtensionPoint(extensionPoint: FormState["extensionPoint"]) {
    super.visitExtensionPoint(extensionPoint);

    if (
      isTriggerExtensionPoint(extensionPoint) &&
      extensionPoint.definition.trigger === "custom"
    ) {
      const eventName = extensionPoint.definition.customEvent?.eventName;

      if (isEmpty(eventName)) {
        this.annotations.push({
          analysisId: this.id,
          type: AnnotationType.Error,
          message: "Custom event name is required",
          position: { path: "extensionPoint.definition.customEvent.eventName" },
        });
      } else if (
        !DOM_EVENTS.includes(eventName) &&
        !this.collectedEvents.knownNames.includes(
          extensionPoint.definition.customEvent.eventName
        )
      ) {
        if (this.collectedEvents.hasDynamicEventName) {
          // The mod uses dynamic names, so we don't know for sure. In the future, we could parse the templates and
          // see if the event name is possible or not.
          this.annotations.push({
            analysisId: this.id,
            type: AnnotationType.Info,
            message: `Custom event ${extensionPoint.definition.customEvent.eventName} does not match a known emitted event in this Mod`,
            position: {
              path: "extensionPoint.definition.customEvent.eventName",
            },
          });
        } else {
          this.annotations.push({
            analysisId: this.id,
            type: AnnotationType.Warning,
            message: `Custom event ${extensionPoint.definition.customEvent.eventName} is not emitted in this Mod`,
            position: {
              path: "extensionPoint.definition.customEvent.eventName",
            },
          });
        }
      }
    }
  }

  override async run(extension: FormState) {
    const results = this.formStates.map((x) =>
      CollectNamesVisitor.collectNames(x)
    );

    this.collectedEvents = {
      knownNames: uniq(flatten(results.map((result) => result.knownNames))),
      hasDynamicEventName: results.some((result) => result.hasDynamicEventName),
    };

    super.run(extension);
  }
}

export default CheckEventNamesAnalysis;
