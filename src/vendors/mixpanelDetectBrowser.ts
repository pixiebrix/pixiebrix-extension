/**
 * This function detects which browser is running this script.
 * The order of the checks are important since many user agents
 * include key words used in later checks.
 * @param userAgent
 * @param vendor
 */
// https://github.com/mixpanel/mixpanel-js/blob/master/src/utils.js#L1489
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
