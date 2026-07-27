import { redirect } from "next/navigation";

export default function Home() {
  // Langsung arahkan pengunjung dari halaman utama ke halaman login
  redirect("/auth/login");
}