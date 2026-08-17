import registryData from "@/lib/aif-registry-data.json";

export type AifRegistryEntry = {
  name: string;
  registrationNumber: string;
  category: string;
  contactPerson: string;
  registeredAddress: string;
  email: string;
  telephone: string;
  city: string;
  state: string;
  pincode: string;
  correspondenceAddress: string;
  correspondenceEmail: string;
  correspondenceTelephone: string;
  correspondenceCity: string;
  correspondenceState: string;
  correspondencePincode: string;
  registrationDate: string;
  validityTo: string;
  country: string;
};

const entries = registryData as AifRegistryEntry[];

export function readAifRegistry() {
  return entries;
}

export function findAifRegistryEntry(name: string | null | undefined) {
  if (!name) return null;
  return entries.find((entry) => entry.name === name) ?? null;
}