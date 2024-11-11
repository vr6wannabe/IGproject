import { OtpForm } from "@saas/auth/components/OtpForm";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
	const t = await getTranslations();

	return {
		title: t("auth.verifyOtp.title"),
	};
}

export default function OtpPage() {
	return <OtpForm />;
}
