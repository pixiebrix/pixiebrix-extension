/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { Transformer } from "@/types";
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { readGoogleBigQuery } from "@/background/messenger/api";
import { zipObject } from "lodash";

// Simplified interface for passing scalar parameters
interface ScalarParameter {
  name: string;
  parameterType: string;
  parameterValue: unknown;
}

export class GoogleBigQueryQuery extends Transformer {
  constructor() {
    super(
      "@pixiebrix/google/bigquery-query",
      "Run a Google BigQuery query",
      "Run a Google BigQuery query and return the results",
      "faTable"
    );
  }

  inputSchema: Schema = propertiesToSchema(
    // https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query#QueryRequest
    {
      projectId: {
        type: "string",
        description: "Required. Project ID of the project billed for the query",
      },
      multi: {
        type: "boolean",
        description: "If set, return an array of results",
        default: true,
      },
      query: {
        type: "string",
        description:
          "Required. A query string, following the BigQuery query syntax, of the query to execute.",
      },
      parameterMode: {
        type: "string",
        enum: ["POSITIONAL", "NAMED"],
        default: "NAMED",
      },
      queryParameters: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "Optional. If unset, this is a positional parameter. Otherwise, should be unique within a query.",
            },
            parameterType: {
              // https://cloud.google.com/bigquery/docs/reference/standard-sql/data-types
              type: "string",
              description: "The type of this parameter.",
              enum: [
                "STRING",
                "INT64",
                "FLOAT64",
                "NUMERIC",
                "BOOL",
                "TIMESTAMP",
                "DATETIME",
                "DATE",
              ],
            },
            parameterValue: {
              oneOf: [
                { type: "boolean" },
                { type: "string" },
                { type: "number" },
                { type: "integer" },
                { type: "null" },
              ],
              description: "The scalar value of the parameter.",
            },
          },
          required: ["parameterType", "parameterValue"],
          additionalProperties: false,
        },
      },
      defaultDataset: {
        type: "object",
        properties: {
          datasetId: {
            type: "string",
            description:
              "Required. A unique ID for this dataset, without the project name",
          },
          projectId: {
            type: "string",
            description:
              "Optional. The ID of the project containing this dataset.",
          },
        },
        required: ["datasetId"],
      },
      useQueryCache: {
        type: "boolean",
        default: true,
        description:
          "Optional. Whether to look for the result in the query cache. " +
          "The query cache is a best-effort cache that will be flushed whenever tables in the query " +
          "are modified. The default value is true.",
      },
      useLegacySql: {
        type: "boolean",
        default: false,
        description:
          "Specifies whether to use BigQuery's legacy SQL dialect for this query. " +
          "The default value is true. If set to false, the query will use BigQuery's standard SQL",
      },
      location: {
        type: "string",
        description:
          "The geographic location where the job should run. See details at https://cloud.google.com/bigquery/docs/locations#specifying_your_location.",
      },
    },
    ["query", "projectId"]
  );

  async transform({
    projectId,
    multi = true,
    queryParameters = [],
    ...resource
  }: BlockArg): Promise<unknown> {
    const { result } = await readGoogleBigQuery(projectId, {
      useLegacySql: false,
      useQueryCache: true,
      queryParameters: queryParameters.map(
        ({ name, parameterType, parameterValue }: ScalarParameter) => ({
          // Simplify passing scalar parameters for now
          name,
          parameterType: { type: parameterType },
          parameterValue: { value: parameterValue },
        })
      ),
      ...resource,
    });

    if (result.errors?.length) {
      const { reason, message } = result.errors[0];
      throw new Error(`${reason}: ${message}`);
    }

    if (!result.jobComplete) {
      throw new Error("Job did not complete");
    }

    const fieldNames = result.schema.fields.map((x) => x.name);

    const totalRows = Number.parseInt(result.totalRows, 10);

    if (multi) {
      if (totalRows > result.rows.length) {
        throw new Error("Support for multi-page results not implemented");
      }

      return result.rows.map((x) =>
        zipObject(
          fieldNames,
          x.f.map(({ v }) => v)
        )
      );
    }

    if (totalRows === 0) {
      throw new Error("No results returned");
    }

    return zipObject(
      fieldNames,
      result.rows[0].f.map(({ v }) => v)
    );
  }
}
