// Source: https://github.com/mozilla/page-metadata-parser/blob/master/url-utils.js
// Changes: Wrapped new URL() in try/catch
// See: https://github.com/pixiebrix/pixiebrix-extension/issues/6889

if (global.URL !== undefined) {
  // We're in Firefox
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
} else {
  // We're in Node.js
  const urlparse = require("url");
  module.exports = {
    makeUrlAbsolute(base, relative) {
      const relativeParsed = urlparse.parse(relative);

      if (relativeParsed.host === null) {
        return urlparse.resolve(base, relative);
      }

      return relative;
    },
    parseUrl(url) {
      return urlparse.parse(url).hostname;
    },
  };
}
