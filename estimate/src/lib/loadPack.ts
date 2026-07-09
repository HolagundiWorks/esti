/** Load a RateLibraryPack from the embedded CPWD file or a user-selected file. */
import { RateLibraryPack, type RateLibraryPack as RateLibraryPackData } from "@esti/contracts";

const CPWD_PACK_URL = "./packs/cpwd-2021.pack.json";

export async function loadEmbeddedCpwdPack(): Promise<RateLibraryPackData> {
  const res = await fetch(CPWD_PACK_URL);
  if (!res.ok) throw new Error(`Could not load CPWD pack (${res.status})`);
  const json: unknown = await res.json();
  return RateLibraryPack.parse(json);
}

export async function loadPackFromFile(file: File): Promise<RateLibraryPackData> {
  const text = await file.text();
  const json: unknown = JSON.parse(text);
  return RateLibraryPack.parse(json);
}
