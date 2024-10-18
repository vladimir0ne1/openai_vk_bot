export class DataProvider {
  constructor(env) {
    this.env = env;
    this.DB = env.OPENAI_VK_BOT_DB; // KV database
  }

  async getUserAliasByInviteToken(inviteToken) {
    return await this.DB.get(`authorized_users_invite_key__${inviteToken}`);
  }

  async getUserAliasByTelegramId(telegramId) {
    return await this.DB.get(`authorized_users_tg_id__${telegramId}`);
  }

  async saveTelegramId(telegramId, userAlias) {
    await this.DB.put(`authorized_users_tg_id__${telegramId}`, userAlias);
  }

  async archiveInviteToken(inviteToken, userAlias) {
    await this.DB.put(`authorized_users_used_invite_key__${inviteToken}`, userAlias);
    await this.DB.delete(`authorized_users_invite_key__${inviteToken}`);
  }

  getUserOpenAIApiKey(userAlias) {
    return this.env[`OPENAI_API_KEY__${userAlias}`];
  }
}
