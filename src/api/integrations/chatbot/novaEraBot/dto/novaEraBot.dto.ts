import { BaseChatbotDto, BaseChatbotSettingDto } from '../../base-chatbot.dto';

export class NovaEraBotDto extends BaseChatbotDto {
  apiUrl: string;
  apiKey: string;
}

export class NovaEraBotSettingDto extends BaseChatbotSettingDto {
  botIdFallback?: string;
}
