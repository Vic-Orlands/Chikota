import { createAuthClient } from "better-auth/svelte";

const BASE_URL = import.meta.env.VITE_BETTER_AUTH_URL!

export const authClient = createAuthClient({
    baseURL: BASE_URL,
});
