import { redirect } from "@i18n/routing";
import { getLocale } from "next-intl/server";

export default async function NotFoundPage() {
	const locale = await getLocale();
	return redirect({ href: "/404", locale });
}
