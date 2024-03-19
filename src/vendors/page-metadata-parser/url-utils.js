// Source: https://github.com/mozilla/page-metadata-parser/blob/master/url-utils.js
// Changes:
// - Wrapped new URL() in try/catch
// - Dropped Node fallback
// See: https://github.com/pixiebrix/pixiebrix-extension/issues/6889

/** @knip Used in @/vendors/page-metadata-parser/parser.js */
module.exports = {
  makeUrlAbsolute(base, relative) {
    try {
      return new URL(relative, base).href;
    } catch {
      // return undefined if the URL is invalid so that the parser does not add it to the metadata
      return;
    }
  },
  parseUrl(url) {
    return new URL(url).host;
  },
};
