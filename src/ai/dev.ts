import { config } from 'dotenv';
config();

import '@/ai/flows/extract-receipt-data.ts';
import '@/ai/flows/send-email-flow.ts';
