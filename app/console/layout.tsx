import type { Metadata } from "next";
import { ThermoeyeConsole } from "@/features/clinical-console/ThermoeyeConsole";

export const metadata: Metadata = {
  title: "Eyezheimer Clinical Console",
  description: "Doctor-gated OCTA/OCT vessel-segmentation research workflow for Eyezheimer pilot review.",
};

type ConsoleLayoutProps = {
  children: React.ReactNode;
};

export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  return (
    <>
      <ThermoeyeConsole />
      {children}
    </>
  );
}
