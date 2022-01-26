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

import { isEmpty } from "lodash";
import { proxyService } from "@/background/messenger/api";
import { Transformer } from "@/types";
import { BlockArg, SanitizedServiceConfiguration, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";

interface GeocodedAddress {
  state?: string;
  country?: string;
  city?: string;
  postalCode?: string;
  streetNumber?: string;
  route?: string;
  county?: string;
}

// https://developers.google.com/maps/documentation/geocoding/overview
type AddressComponentType =
  | "administrative_area_level_1"
  | "administrative_area_level_2"
  | "country"
  | "locality"
  | "postal_code"
  | "street_number"
  | "route";

interface AddressComponent {
  long_name: string;
  types: AddressComponentType[];
}

interface GeocodeData {
  results: Array<{
    address_components: AddressComponent[];
  }>;
  // https://developers.google.com/maps/documentation/geocoding/overview
  status:
    | "OK"
    | "ZERO_RESULTS"
    | "OVER_DAILY_LIMIT"
    | "OVER_QUERY_LIMIT"
    | "REQUEST_DENIED"
    | "INVALID_REQUEST"
    | "UNKNOWN_ERROR";
}

async function geocodeAddress(
  service: SanitizedServiceConfiguration,
  address: string
): Promise<GeocodedAddress> {
  if (isEmpty(address)) {
    return {};
  }

  const { data } = await proxyService<GeocodeData>(service, {
    url: "https://maps.googleapis.com/maps/api/geocode/json",
    params: { address },
  });

  const { results } = data;

  if (results.length === 0) {
    return {};
  }

  const findComponent = (type: AddressComponentType) =>
    results[0].address_components.find((x: AddressComponent) =>
      x.types.includes(type)
    )?.long_name;

  return {
    country: findComponent("country"),
    state: findComponent("administrative_area_level_1"),
    county: findComponent("administrative_area_level_2"),
    city: findComponent("locality"),
    postalCode: findComponent("postal_code"),
    streetNumber: findComponent("street_number"),
    route: findComponent("route"),
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
    return geocodeAddress(service, address);
  }
}
