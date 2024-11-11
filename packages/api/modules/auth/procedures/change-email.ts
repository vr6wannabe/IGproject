import {
	createSessionCookie,
	generateVerificationToken,
	invalidateUserSessions,
} from "auth";
import { db } from "database";
import { sendEmail } from "mail";
import { z } from "zod";
import { protectedProcedure } from "../../../trpc/base";

export const changeEmail = protectedProcedure
	.input(
		z.object({
			email: z
				.string()
				.email()
				.min(1)
				.max(255)
				.transform((v) => v.toLowerCase()),
			callbackUrl: z.string(),
		}),
	)
	.mutation(
		async ({
			ctx: { user, responseHeaders, locale },
			input: { email, callbackUrl },
		}) => {
			const updatedUser = await db.user.update({
				where: {
					id: user.id,
				},
				data: {
					email,
					emailVerified: false,
				},
			});

			await invalidateUserSessions(user.id);
			responseHeaders?.append(
				"Set-Cookie",
				createSessionCookie(null).serialize(),
			);

			const token = await generateVerificationToken({
				userId: user.id,
			});

			const url = new URL(callbackUrl);
			url.searchParams.set("token", token);

			await sendEmail({
				to: email,
				templateId: "emailChange",
				locale,
				context: {
					name: updatedUser.name ?? updatedUser.email,
					url: url.toString(),
				},
			});
		},
	);
