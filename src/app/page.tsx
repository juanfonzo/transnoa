import { redirect } from "next/navigation";
import { getDemoRole } from "@/lib/demo-auth";
import { landingByRole } from "@/lib/demo-experience";

export default async function Home() {
  const role = await getDemoRole();
  redirect(landingByRole[role]);
}
