# PlayBeat Lead Pulse

Lead intelligence and CRM workspace for PLAYBEAT DIGITAL. The React dashboard is served by the Express application; MongoDB-backed APIs require server-side configuration. AI-assisted CRM lookups use structured, read-only tools. Drafted outbound messages require human review, and an approval does not send a message unless a real channel integration is implemented.

## Run locally

1. Install a current Node.js release and dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env` and configure `MONGODB_URI`, `AUTH_SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD_HASH`. Set `GEMINI_API_KEY` to enable AI responses. Keep these values server-side; never add them to frontend variables.

   Generate a bcrypt hash locally with:

   ```sh
   node --input-type=module -e "import bcrypt from 'bcryptjs'; console.log(await bcrypt.hash(process.argv[1], 12))" "your-new-admin-password"
   ```

   Use a unique, strong password and keep the hash out of source control. `AUTH_SESSION_SECRET` must be a randomly generated value with at least 32 bytes.

3. Start the full-stack app:

   ```sh
   npm run dev
   ```

4. Open `http://localhost:3000/admin/login`. After signing in, the CRM opens at `/ai-agent`.

## Production

```sh
npm run lint
npm run build
npm start
```

Configure the same server-only environment variables in the hosting provider. Use HTTPS in production. For Vercel, the included catch-all Node function serves the Express API and Vercel serves the static build. The database must allow connections from the deployment environment.

## Current integration boundaries

- MongoDB is required for authentication, leads, approvals, follow-ups, and analytics. The CRM reports service failures rather than substituting demo records.
- Gemini is optional. Without its key, the CRM remains usable and the AI chat reports that the service is unavailable.
- Email, WhatsApp, SMS, and calling providers are not connected. The API will not claim that a customer message was sent.
- Login rate limiting is process-local; use a shared rate-limit store before relying on it across serverless instances.
- Existing exposed database and GitHub credentials must be revoked/rotated before production. Removing a secret from the current tracked tree does not erase it from prior Git history.
