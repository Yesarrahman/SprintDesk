import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to dashboard by default. Middleware handles auth guard.
  redirect("/dashboard");
}
