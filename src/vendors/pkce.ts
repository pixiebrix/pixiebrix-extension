/*!
 * Copyright (c) 2015-present, Okta, Inc. and/or its affiliates. All rights reserved.
 * The Okta software accompanied by this notice is provided pursuant to the Apache License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and limitations under the License.
 */

// Code verifier: Random URL-safe string with a minimum length of 43 characters.
// Code challenge: Base64 URL-encoded SHA-256 hash of the code verifier.
export const MIN_VERIFIER_LENGTH = 43;
export const MAX_VERIFIER_LENGTH = 128;
export const DEFAULT_CODE_CHALLENGE_METHOD = "S256";

// converts a string to base64 (url/filename safe variant)
export function stringToBase64Url(str: string): string {
  var b64 = btoa(str);
  return base64ToBase64Url(b64);
}

// converts a standard base64-encoded string to a "url/filename safe" variant
export function base64ToBase64Url(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function dec2hex(dec: number): string {
  return ("0" + dec.toString(16)).substr(-2);
}

export function getRandomString(length: number) {
  var a = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(a);
  var str = Array.from(a, dec2hex).join("");
  return str.slice(0, length);
}

export function generateVerifier(prefix?: string): string {
  var verifier = prefix || "";
  if (verifier.length < MIN_VERIFIER_LENGTH) {
    verifier =
      verifier + getRandomString(MIN_VERIFIER_LENGTH - verifier.length);
  }
  return encodeURIComponent(verifier).slice(0, MAX_VERIFIER_LENGTH);
}

export function computeChallenge(str: string): PromiseLike<any> {
  var buffer = new TextEncoder().encode(str);
  return crypto.subtle.digest("SHA-256", buffer).then(function (arrayBuffer) {
    var hash = String.fromCharCode.apply(null, [
      ...new Uint8Array(arrayBuffer),
    ]);
    var b64u = stringToBase64Url(hash); // url-safe base64 variant
    return b64u;
  });
}
