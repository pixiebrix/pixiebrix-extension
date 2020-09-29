import { withReadWindow } from "@/common";
import { ReaderOutput } from "@/core";
import { registerFactory } from "@/blocks/readers/factory";

type PathSpecObj = { [key: string]: string };
export type PathSpec = string | PathSpecObj;

export interface WindowConfig {
  type: "window";
  waitMillis?: number;
  pathSpec: PathSpec;
}

async function handleFlatten(
  pathSpec: PathSpec,
  factory: (arg: PathSpecObj) => Promise<any>
): Promise<any> {
  const pathSpecObj: PathSpecObj =
    typeof pathSpec === "string" ? { value: pathSpec } : pathSpec;
  const values = await factory(pathSpecObj);
  return typeof values === "object" ? values.value : values;
}

async function doRead(reader: WindowConfig): Promise<ReaderOutput> {
  const { pathSpec: rawPathSpec, waitMillis } = reader;
  return await handleFlatten(rawPathSpec, (pathSpec) =>
    withReadWindow({
      pathSpec,
      waitMillis,
    })
  );
}

registerFactory("window", doRead);
