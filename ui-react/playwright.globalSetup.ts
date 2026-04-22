import { config as dotenvConfig } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function globalSetup() {
  // Load .env file for Midscene AI test configuration
  dotenvConfig({ path: path.resolve(__dirname, '../.env') });
}
