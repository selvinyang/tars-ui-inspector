import type { Metadata } from "next";
import { InspectorWorkspace } from "./workspace";

export const metadata: Metadata = {
  title: "TARS UI Inspector",
  description: "轻量级 Web UI 视觉走查工作台",
};

export default function Home() {
  return <InspectorWorkspace />;
}
