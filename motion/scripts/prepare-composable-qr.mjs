import QRCode from "qrcode";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const destination = new URL("../public/composable/", import.meta.url);
await mkdir(destination, { recursive: true });
const svg = await QRCode.toString("https://clio.iowarp.ai/", {
  type: "svg",
  errorCorrectionLevel: "M",
  margin: 4,
  color: { dark: "#113855", light: "#f5f5f1" },
});
await writeFile(new URL("clio-qr.svg", destination), svg);
console.log(`QR generated: ${fileURLToPath(destination)}`);
