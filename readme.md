# This is telegram bot for personal and family use

Bot is developed to work on Cloudflare serverless worker.
Bot database stores at worker KV database.

# Authorization algorithm


## Manual steps:
1. Open AI Admin: Generate API key for a user, eg `me`.
    - Name format: `key-for-bot-<user-alias>`
    - Example: `key-for-bot-me`
2. Cloudflare worker Admin: Add API Key to worker environment variables
    - Name Format: `OPENAI_API_KEY__<user-alias>`
    - Example: `OPENAI_API_KEY__me`
3. Manually generate and add invite key to database for specific user alias
    - Format: `authorized_users_invite_key__<invite-key>:<user-alias>`
    - Example: `authorized_users_used_invite_key__XABCD-1234:me`
4. Send user invite token:
    - Format: `/token <token>`
    - Example: `/token XABCD-1234`

### First use

User send invite token to telegram bot (`/token XABCD-1234`)
If token is valid, bot maps user alias from token and telegram user ID and archives token so it can be used only once.

### Message from user

Next time when user sends a message the bot uses specific OpenAI API key. user_id -> user_alias -> user_api_key
1. Get user alias by user Id.
2. Get user openai api key by alias from environment variables.

## Storage example

### OpenAI API keys

| NAME                    | SECRET KEY |
|-------------------------|------------|
| key-for-bot-**me**      | sk-...XyaZ |
| key-for-bot-**alex**    | sk-...XVPO |

### Worker environment variables

| Type   | Name                     | Value           |
|--------|--------------------------|-----------------|
| Secret | OPENAI_API_KEY__**me**   | Value encrypted |
| Secret | OPENAI_API_KEY__**alex** | Value encrypted |


### Worker key-value datavbase (KV storage)

| Key                                                  | Value    |
|------------------------------------------------------|----------|
| authorized_users_invite_key__**AAAB-YYYY-1234**      | **alex** |
| authorized_users_used_invite_key__**XXXX-YYYY-1234** | **me**   |
| authorized_users_tg_id__**123456789**                | **me**   |


