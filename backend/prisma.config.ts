import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
    datasource: {
        // CLI Prisma akan menggunakan jalur ini untuk melakukan push/migrate tabel
        url: env("DIRECT_URL"),
    },
});