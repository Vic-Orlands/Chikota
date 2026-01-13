import { createAuthClient } from "better-auth/svelte";

const BASE_URL = process.env.BETTER_AUTH_URL || "http://localhost:5173";

export const authClient = createAuthClient({
    baseURL: BASE_URL,
});
