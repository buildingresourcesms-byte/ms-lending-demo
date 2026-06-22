# Integration backend handoff

Every integration displayed in the workspace has a server adapter in
`api/_connector-registry.js`. The registry is the source of truth for authentication,
required environment values, capabilities, supported actions, provider limitations,
callback URLs, and webhook URLs.

## Run locally

```powershell
npm install
npm run dev
```

`npm run dev` now serves both Vite and the `api/` serverless handlers. Open
`http://127.0.0.1:5173/api/integrations/status` to inspect all connector contracts. Missing
credentials are reported by name; secret values are never returned.

## Shared API contract

| Route | Purpose |
|---|---|
| `GET /api/integrations/status` | Read configuration, connection, capability, and action status for all adapters |
| `GET /api/integrations/auth?provider=ID` | Start generic OAuth connectors |
| `GET /api/integrations/callback?provider=ID` | Complete generic OAuth connectors |
| `POST /api/integrations/disconnect?provider=ID` | Remove a browser OAuth connection |
| `POST /api/integrations/action` | Run an allow-listed provider action |
| `GET/POST /api/integrations/webhook?provider=ID` | Verify and normalize inbound provider events |

Action request:

```json
{
  "provider": "gcal",
  "action": "list_events",
  "payload": { "max": 25 }
}
```

Live data/actions are enabled automatically in local development and fail closed on deployed
runtimes. For a browser deployment, set `INTEGRATION_ACTIONS_ENABLED=true` and
`INTEGRATION_ALLOWED_ORIGIN` to the exact app origin after application authentication is in
place. Server-to-server callers can instead send `INTEGRATION_API_SECRET` as
`X-Integration-Api-Key` or a bearer token.

Normalized webhooks are delivered to `INTEGRATION_EVENT_SINK_URL` when configured. Set
`INTEGRATION_EVENT_SINK_SECRET` to add a bearer token. Without a sink, signed webhooks are
validated and normalized but intentionally not persisted.

## Connector configuration

All OAuth callback URLs use the deployed origin. Generic callbacks must retain the
`provider` query parameter shown in the Integrations setup dialog.

| Connector | Authentication | Required environment values | Implemented actions |
|---|---|---|---|
| Microsoft 365 | OAuth 2.0 | `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET`, `OUTLOOK_TENANT`, `OUTLOOK_REDIRECT_URI` | mail read/send, calendar read/create |
| Gmail | OAuth 2.0 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | mail read/send |
| Google Calendar | OAuth 2.0 | `GCAL_CLIENT_ID`, `GCAL_CLIENT_SECRET`, `GCAL_REDIRECT_URI` | `list_events`, `create_event` |
| Facebook Lead Ads | Meta OAuth + signed webhook | `META_CLIENT_ID`, `META_CLIENT_SECRET`, `FACEBOOK_REDIRECT_URI`, `META_VERIFY_TOKEN` | `list_pages`, `list_leads` |
| Instagram | Meta OAuth + signed webhook | `META_CLIENT_ID`, `META_CLIENT_SECRET`, `INSTAGRAM_REDIRECT_URI`, `META_VERIFY_TOKEN` | `list_conversations` |
| Zillow Premier Agent | Signed inbound webhook | `ZILLOW_WEBHOOK_SECRET` | `receive_lead` |
| Google Business Profile | OAuth 2.0 | `GBP_CLIENT_ID`, `GBP_CLIENT_SECRET`, `GBP_REDIRECT_URI` | `list_accounts`, `list_locations`, `list_reviews` |
| LinkedIn | OAuth 2.0 + partner webhook | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` | `get_profile` |
| Text Messaging | Twilio credentials + signed webhook | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | `send_sms` |
| WhatsApp | Twilio credentials + signed webhook | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` | `send_whatsapp` |
| Phone Dialer | Twilio credentials + signed webhook | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_VOICE_WEBHOOK_URL` | `place_call` |
| DocuSign | OAuth 2.0 + Connect webhook | `DOCUSIGN_CLIENT_ID`, `DOCUSIGN_CLIENT_SECRET`, `DOCUSIGN_REDIRECT_URI`, `DOCUSIGN_ACCOUNT_ID` | `create_envelope`, `get_envelope` |
| Dropbox | OAuth 2.0 + webhook | `DROPBOX_CLIENT_ID`, `DROPBOX_CLIENT_SECRET`, `DROPBOX_REDIRECT_URI` | `list_folder`, `upload_file` |
| Zapier | Outbound webhook | `ZAPIER_WEBHOOK_URL` | `trigger` |
| QuickBooks Online | OAuth 2.0 + signed webhook | `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_REDIRECT_URI` | `query`, `create_customer` |
| Mailchimp | OAuth 2.0 + webhook | `MAILCHIMP_CLIENT_ID`, `MAILCHIMP_CLIENT_SECRET`, `MAILCHIMP_REDIRECT_URI` | `list_audiences`, `upsert_contact` |

Optional webhook verification values are `ZAPIER_WEBHOOK_SECRET`,
`LINKEDIN_WEBHOOK_SECRET`, `DOCUSIGN_CONNECT_SECRET`,
`QUICKBOOKS_WEBHOOK_VERIFIER`, and `MAILCHIMP_WEBHOOK_SECRET`.

Server-managed OAuth tokens can be supplied without browser consent using this universal
pattern:

```text
CONNECTOR_<ID>_ACCESS_TOKEN
CONNECTOR_<ID>_REFRESH_TOKEN
CONNECTOR_<ID>_REALM_ID       # QuickBooks only
```

For example, Google Calendar uses `CONNECTOR_GCAL_REFRESH_TOKEN`. Browser-managed OAuth
tokens use Secure, HTTP-only, SameSite cookies. The token-store boundary is isolated in
`api/_oauth.js` and `api/_connector-oauth.js` so it can be replaced with encrypted database
storage during a multi-user port.

## Provider limitations

- Meta lead and messaging permissions require App Review.
- Instagram messaging requires a professional account connected to a Facebook Page.
- Zillow lead delivery requires Zillow partner access or a supported lead-routing export.
- Google Business Messages was discontinued; the adapter covers locations, reviews, and
  profile performance instead.
- LinkedIn does not expose general direct-message access. Lead Sync is partner-restricted.
- WhatsApp business-initiated messages require an approved sender and templates.
- DocuSign defaults to its demo API until production go-live review is complete.

These limitations are returned by the status API and shown directly on the relevant card.

## Verification before production data

```powershell
npm test
npm run build
```

After credentials are added, verify each configured adapter with a non-sensitive test
account. Real borrower data must not be used until authentication, encrypted token storage,
audit logging, retention, and compliance controls are reviewed for production.
