import { Reader } from "@/types";
import { withEmberComponentProps } from "@/blocks/readers/emberjs";
import mapValues from "lodash/mapValues";
import { isHost } from "@/extensionPoints/helpers";
import { registerBlock } from "@/blocks/registry";
import fromPairs from "lodash/fromPairs";
import { Schema } from "@/core";

export function getProfileContext(): JQuery | null {
  if (isHost("linkedin.com")) {
    const $profile = $("#profile-content");
    return $profile.length ? $profile : null;
  }
  return undefined;
}

class LinkedInProfileReader extends Reader {
  ROOT_PATH = "parentView";

  PATH_SPEC = {
    firstName: "memberName?.firstName",
    lastName: "memberName?.lastName",
    followersCount: "followersCount",
    vanityName: "vanityName",
    vanityUrl: "model?.vanityUrl",
    headline: "headline",
    isInfluencer: "isInfluencer",
    currentCompanyName: "currentCompanyName",
    geoLocationName: "geoLocationName",
    locationName: "locationName",
    schoolName: "schoolName",
  };

  constructor() {
    super(
      "linkedin/person-summary",
      "LinkedIn Profile Summary",
      "Read summary information from a LinkedIn profile"
    );
  }

  outputSchema: Schema = {
    type: "object",
    properties: fromPairs(
      [...Object.keys(this.PATH_SPEC), "url"].map((x) => [x, {}])
    ),
  };

  async isAvailable() {
    return !!getProfileContext();
  }

  async read() {
    const profile = await withEmberComponentProps({
      selector: ".pv-top-card",
      pathSpec: mapValues(this.PATH_SPEC, (x) => `${this.ROOT_PATH}?.${x}`),
    });
    return {
      ...profile,
      url: window.location.href,
    };
  }
}

export const PROFILER_READER = new LinkedInProfileReader();

registerBlock(PROFILER_READER);
