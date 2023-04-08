import { IBlock } from "@/types/blockTypes";
import { IExtensionPoint } from "@/types/extensionPointTypes";
import { IService } from "@/types/serviceTypes";

export type ReferenceEntry = IBlock | IExtensionPoint | IService;
