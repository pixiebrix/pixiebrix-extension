import isEmpty from "lodash/isEmpty";
import { proxyService } from "@/background/requests";
import { Transformer } from "@/types";
import { registerBlock } from "@/blocks/registry";
import { BlockArg, SanitizedServiceConfiguration, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";

interface GeocodedAddress {
  state?: string;
  country?: string;
  city?: string;
}

async function geocodeAddress(
  service: SanitizedServiceConfiguration,
  address: string
): Promise<GeocodedAddress> {
  if (isEmpty(address)) {
    return {};
  }

  // @ts-ignore: come back an write the type signature
  const { results } = await proxyService(service, {
    url: "https://maps.googleapis.com/maps/api/geocode/json",
    params: { address },
  });

  if (results.length === 0) {
    return {};
  }

  const findComponent = (type: any) =>
    results[0].address_components.find((x: any) => x.types.includes(type))
      ?.long_name;

  return {
    state: findComponent("administrative_area_level_1"),
    country: findComponent("country"),
    city: findComponent("locality"),
  };
}

export class GeocodeTransformer extends Transformer {
  constructor() {
    super(
      "google/geocode",
      "Google Geocode",
      "Geocode an address using the Google Geocode API"
    );
  }

  inputSchema: Schema = propertiesToSchema({
    service: {
      $ref: "https://app.pixiebrix.com/schemas/services/google/geocode-api",
      description: "A Google Geocode service to authenticate the request",
    },
    address: {
      type: "string",
      description: "The address or partial address",
    },
  });

  async transform({ service, address }: BlockArg): Promise<GeocodedAddress> {
    return await geocodeAddress(service, address);
  }
}

registerBlock(new GeocodeTransformer());
