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

import { Analysis, Annotation, AnnotationType } from "@/analysis/analysisTypes";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { joinPathParts } from "@/utils";
import { get, isEmpty } from "lodash";

// See URL patterns at https://developer.chrome.com/docs/extensions/mv3/match_patterns/
const urlRegexp = /(?<scheme>.*):\/\/(?<host>[^\/]*)?(?<path>\/.*)?/;
const schemeRegexp = /^\*|https?|file|ftp|urn$/;
const hostRegexp = /^\*|(\*\.)?[^*/]+$/;

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
class ExtensionUrlPatternAnalysis implements Analysis {
  get id() {
    return "urlPattern";
  }

  private readonly annotations: Annotation[] = [];
  getAnnotations(): Annotation[] {
    return this.annotations;
  }

  public async run(extension: FormState): Promise<void> {
    for (const fieldName of urlPatternFields) {
      this.analyzeUrlPatterns(extension, fieldName);
    }

    for await (const fieldName of stringUrlFields) {
      await this.analyzeStringUrls(extension, fieldName);
    }
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

  analyzeUrlPatterns(extension: FormState, fieldName: string): void {
    const urlPatterns = get(extension, fieldName);
    if (urlPatterns == null || urlPatterns.length === 0) {
      return;
    }

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

  async analyzeStringUrls(
    extension: FormState,
    fieldName: string
  ): Promise<void> {
    const urls = get(extension, fieldName);
    if (urls == null || urls.length === 0) {
      return;
    }

    for (const [index, url] of Object.entries(urls)) {
      if (isEmpty(url)) {
        this.pushErrorAnnotation({
          path: joinPathParts(fieldName, index),
          message: "This field is required",
          detail: url,
        });
        continue;
      }

      const match = urlRegexp.exec(url as string);
      if (match == null) {
        this.pushErrorAnnotation({
          path: joinPathParts(fieldName, index),
          message: "Invalid URL",
          detail: url,
        });
        continue;
      }

      const { scheme, host, path } = match.groups;

      if (!schemeRegexp.test(scheme)) {
        this.pushErrorAnnotation({
          path: joinPathParts(fieldName, index),
          message:
            "Invalid pattern for scheme. Scheme should match '*' | 'http' | 'https' | 'file' | 'ftp' | 'urn'",
          detail: url,
        });
      }

      if (scheme === "file") {
        if (!host && !path) {
          this.pushErrorAnnotation({
            path: joinPathParts(fieldName, index),
            message:
              "Invalid pattern for file path. Path should not be empty for file:// URLs",
            detail: url,
          });
        }
      } else if (!host || !hostRegexp.test(host)) {
        this.pushErrorAnnotation({
          path: joinPathParts(fieldName, index),
          message:
            "Invalid pattern for host. Host name should match '*' | '*.' <any char except '/' and '*'>+",
          detail: url,
        });
      }
    }
  }
}

export default ExtensionUrlPatternAnalysis;
