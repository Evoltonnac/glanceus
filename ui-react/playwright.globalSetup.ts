import { config as dotenvConfig } from 'dotenv';
import path from 'node:path';

// Load .env file for Midscene AI test configuration
dotenvConfig({ path: path.resolve(__dirname, '../.env') });
