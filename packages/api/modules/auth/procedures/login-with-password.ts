import { TRPCError } from "@trpc/server";
import { createSession, createSessionCookie, generateSessionToken } from "auth";
import { verifyPassword } from "auth/lib/hashing";
import { UserSchema, db } from "database";
import { z } from "zod";
import { publicProcedure } from "../../../trpc/base";

export const loginWithPassword = publicProcedure
	.input(
		z.object({
			email: z
				.string()
				.email()
				.min(1)
				.max(255)
				.transform((v) => v.trim().toLowerCase())
				.superRefine(async (email, ctx) => {
					const existingUser = await db.user.findUnique({
						where: {
							email,
						},
					});

					if (!existingUser) {
						ctx.addIssue({
							code: "custom",
							params: {
								i18n: {
									key: "email_not_found",
								},
							},
						});
					} else if (!existingUser.emailVerified) {
						ctx.addIssue({
							code: "custom",
							params: {
								i18n: {
									key: "email_not_verified",
								},
							},
						});
					}
				}),
			password: z.string().min(8).max(255),
		}),
	)
	.output(
		z.object({
			user: UserSchema.pick({
				id: true,
				email: true,
				name: true,
				role: true,
				avatarUrl: true,
			}).partial({
				avatarUrl: true,
			}),
		}),
	)
	.mutation(
		async ({ input: { email, password }, ctx: { responseHeaders } }) => {
			const user = await db.user.findUnique({
				where: {
					email,
				},
			});

			if (!user?.hashedPassword) {
				throw new TRPCError({
					code: "NOT_FOUND",
				});
			}

			if (!user.emailVerified) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Email not verified",
				});
			}

			const isValidPassword = await verifyPassword(
				user.hashedPassword,
				password,
			);

			if (!isValidPassword) {
				throw new TRPCError({
					code: "NOT_FOUND",
				});
			}

			const sessionToken = generateSessionToken();
			await createSession(sessionToken, user.id);
			responseHeaders?.append(
				"Set-Cookie",
				createSessionCookie(sessionToken).serialize(),
			);

			return {
				user,
			};
		},
	);
