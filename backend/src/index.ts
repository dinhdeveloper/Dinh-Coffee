import { createApp } from "@/app";
import { env } from "@/config/env";

const app = createApp();

app.listen(env.port, () => {
  console.log(`Backend server đang chạy tại http://localhost:${env.port}`);
});
