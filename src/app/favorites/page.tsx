import { redirect } from "next/navigation";
import { getCurrentUser, getFavorites } from "@/lib/data";
import FavoritesClient from "@/components/favorites/FavoritesClient";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const favorites = await getFavorites(user.id);

  return (
    <FavoritesClient user={user} favorites={favorites} />
  );
}
