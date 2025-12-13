import { z } from "zod";

export const loginSchema = z.object({
	username: z.string().min(3, "Username must be at least 3 characters").max(30),
	password: z.string().min(8, "Password must be at least 8 characters").max(100),
});
