/**
 * This function detects which browser is running this script.
 * The order of the checks are important since many user agents
 * include keywords used in later checks.
 * @param userAgent
 * @param vendor
 *
 * @see https://github.com/mixpanel/mixpanel-js/blob/master/src/utils.js#L1489
 */
export function detectBrowser(
  userAgent: string,
  vendor: string | null,
): string {
  vendor = vendor ?? ""; // vendor is undefined for at least IE9
  if (userAgent.includes(" OPR/")) {
    if (userAgent.includes("Mini")) {
      return "Opera Mini";
    }
    return "Opera";
  } else if (/(BlackBerry|PlayBook|BB10)/i.test(userAgent)) {
    return "BlackBerry";
  } else if (
    userAgent.includes("IEMobile") ||
    userAgent.includes("WPDesktop")
  ) {
    return "Internet Explorer Mobile";
  } else if (userAgent.includes("SamsungBrowser/")) {
    // https://developer.samsung.com/internet/user-agent-string-format
    return "Samsung Internet";
  } else if (userAgent.includes("Edge") || userAgent.includes("Edg/")) {
    return "Microsoft Edge";
  } else if (userAgent.includes("FBIOS")) {
    return "Facebook Mobile";
  } else if (userAgent.includes("Chrome")) {
    return "Chrome";
  } else if (userAgent.includes("CriOS")) {
    return "Chrome iOS";
  } else if (userAgent.includes("UCWEB") || userAgent.includes("UCBrowser")) {
    return "UC Browser";
  } else if (userAgent.includes("FxiOS")) {
    return "Firefox iOS";
  } else if (vendor.includes("Apple")) {
    if (userAgent.includes("Mobile")) {
      return "Mobile Safari";
    }
    return "Safari";
  } else if (userAgent.includes("Android")) {
    return "Android Mobile";
  } else if (userAgent.includes("Konqueror")) {
    return "Konqueror";
  } else if (userAgent.includes("Firefox")) {
    return "Firefox";
  } else if (userAgent.includes("MSIE") || userAgent.includes("Trident/")) {
    return "Internet Explorer";
  } else if (userAgent.includes("Gecko")) {
    return "Mozilla";
  } else {
    return "";
  }
}

/**
 * Detects the browser version that is running this script.
 * @param userAgent
 * @param vendor
 *
 * @see https://github.com/mixpanel/mixpanel-js/blob/master/src/utils.js#L1542C21-L1571C7
 */
export function browserVersion(userAgent: string, vendor: string | null) {
  const browser = detectBrowser(userAgent, vendor);
  const versionRegexes: {
    [key: string]: RegExp;
  } = {
    "Internet Explorer Mobile": /rv:(\d+(\.\d+)?)/,
    "Microsoft Edge": /Edge?\/(\d+(\.\d+)?)/,
    Chrome: /Chrome\/(\d+(\.\d+)?)/,
    "Chrome iOS": /CriOS\/(\d+(\.\d+)?)/,
    "UC Browser": /(UCBrowser|UCWEB)\/(\d+(\.\d+)?)/,
    Safari: /Version\/(\d+(\.\d+)?)/,
    "Mobile Safari": /Version\/(\d+(\.\d+)?)/,
    Opera: /(Opera|OPR)\/(\d+(\.\d+)?)/,
    Firefox: /Firefox\/(\d+(\.\d+)?)/,
    "Firefox iOS": /FxiOS\/(\d+(\.\d+)?)/,
    Konqueror: /Konqueror:(\d+(\.\d+)?)/,
    BlackBerry: /BlackBerry (\d+(\.\d+)?)/,
    "Android Mobile": /android\s(\d+(\.\d+)?)/,
    "Samsung Internet": /SamsungBrowser\/(\d+(\.\d+)?)/,
    "Internet Explorer": /(rv:|MSIE )(\d+(\.\d+)?)/,
    Mozilla: /rv:(\d+(\.\d+)?)/,
  };
  const regex = versionRegexes[browser];
  if (regex === undefined) {
    return null;
  }
  const matches = userAgent.match(regex);
  if (!matches) {
    return null;
  }

  const versionString = matches[matches.length - 2];

  if (versionString === undefined) {
    return null;
  }

  return parseFloat(versionString);
}
