import { scryptSync, randomBytes } from "crypto";

const salt = randomBytes(16).toString("hex");
const hash = scryptSync("lalala14", salt, 64).toString("hex");
const passwordHash = `${salt}:${hash}`;

console.log(`INSERT INTO public.admins (username, password_hash, display_name) VALUES ('lara', '${passwordHash}', 'Lara') ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, display_name = EXCLUDED.display_name;`);
