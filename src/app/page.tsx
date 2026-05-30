import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Home(props: Props) {
  const searchParams = await props.searchParams;
  if (searchParams.code) {
    redirect(`/auth/callback?code=${searchParams.code}`);
  }
  // Redirect to dashboard by default. Middleware handles auth guard.
  redirect("/dashboard");
}
