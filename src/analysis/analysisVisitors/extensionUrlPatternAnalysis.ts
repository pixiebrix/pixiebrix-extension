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

import {
  type Analysis,
  type AnalysisAnnotation,
  AnnotationType,
} from "@/analysis/analysisTypes";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { joinPathParts } from "@/utils";
import { get, isEmpty } from "lodash";

// See URL patterns at https://developer.chrome.com/docs/extensions/mv3/match_patterns/
const urlRegexp = /^(?<scheme>.*):\/\/(?<host>[^/]*)?(?<path>.*)?$/;
const schemeRegexp = /^\*|https?$/;
const hostRegexp = /^(\*|(^(\*\.)?[^*/]+))$/;

const urlPatternFields = ["extensionPoint.definition.isAvailable.urlPatterns"];

const stringUrlFields = [
  "extensionPoint.definition.documentUrlPatterns",
  "extensionPoint.definition.isAvailable.matchPatterns",
  "permissions.origins",
];

type PushAnnotationArgs = {
  path: string;
  message: string;
  detail: unknown;
};

export const REQUIRED_MESSAGE = "This field is required.";
export const INVALID_URL_MESSAGE = "Invalid URL.";
export const INVALID_SCHEME_MESSAGE =
  "Invalid pattern for scheme. Scheme should be one of '*', 'http', or 'https'.";
export const INVALID_HOST_MESSAGE =
  "Invalid pattern for host. Host name should match '*' | '*.' <any char except '/' and '*'>+.";

class ExtensionUrlPatternAnalysis implements Analysis {
  get id() {
    return "urlPattern";
  }

  private readonly annotations: AnalysisAnnotation[] = [];
  getAnnotations(): AnalysisAnnotation[] {
    return this.annotations;
  }

  private pushErrorAnnotation({ path, message, detail }: PushAnnotationArgs) {
    this.annotations.push({
      position: {
        path,
      },
      message,
      analysisId: this.id,
      type: AnnotationType.Error,
      detail,
    });
  }

  async run(extension: FormState): Promise<void> {
    for (const fieldName of urlPatternFields) {
      const urlPatterns = get(extension, fieldName);
      if (urlPatterns == null || urlPatterns.length === 0) {
        continue;
      }

      this.analyzeUrlPatternsField(urlPatterns, fieldName);
    }

    const stringUrlsFieldAnalysisPromises: Array<Promise<void>> = [];
    for (const fieldName of stringUrlFields) {
      const urls = get(extension, fieldName);
      if (urls == null || urls.length === 0) {
        continue;
      }

      stringUrlsFieldAnalysisPromises.push(
        this.analyzeStringUrlsField(urls, fieldName)
      );
    }

    await Promise.all(stringUrlsFieldAnalysisPromises);
  }

  analyzeUrlPatternsField(urlPatterns: unknown[], fieldName: string): void {
    for (const [index, urlPattern] of Object.entries(urlPatterns)) {
      for (const [key, pattern] of Object.entries(urlPattern)) {
        if (pattern == null || pattern === "") {
          continue;
        }

        try {
          void new URLPattern({ [key]: pattern });
        } catch {
          this.pushErrorAnnotation({
            path: joinPathParts(fieldName, index, key),
            message: `Invalid pattern for ${key}`,
            detail: urlPattern,
          });
        }
      }
    }
  }

  async analyzeStringUrlsField(
    urls: string[],
    fieldName: string
  ): Promise<void> {
    for (const [index, url] of Object.entries(urls)) {
      if (isEmpty(url)) {
        this.pushErrorAnnotation({
          path: joinPathParts(fieldName, index),
          message: REQUIRED_MESSAGE,
          detail: url,
        });
        continue;
      }

      const match = urlRegexp.exec(url);
      if (match == null) {
        this.pushErrorAnnotation({
          path: joinPathParts(fieldName, index),
          message: INVALID_URL_MESSAGE,
          detail: url,
        });
        continue;
      }

      const { scheme, host } = match.groups;
      if (!schemeRegexp.test(scheme)) {
        this.pushErrorAnnotation({
          path: joinPathParts(fieldName, index),
          message: INVALID_SCHEME_MESSAGE,
          detail: url,
        });
      }

      if (!host || !hostRegexp.test(host)) {
        this.pushErrorAnnotation({
          path: joinPathParts(fieldName, index),
          message: INVALID_HOST_MESSAGE,
          detail: url,
        });
      }
    }
  }
}

export default ExtensionUrlPatternAnalysis;
