import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class SendTextMessageDto {
  @IsNumber()
  number_id: number;

  @IsString()
  to: string;

  @IsString()
  text: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  instanceName?: string;
}

export class SendImageMessageDto {
  @IsNumber()
  number_id: number;

  @IsString()
  to: string;

  @IsString()
  image_url: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsString()
  @IsOptional()
  instanceName?: string;
}

export class SendVideoMessageDto {
  @IsNumber()
  number_id: number;

  @IsString()
  to: string;

  @IsString()
  video_url: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsString()
  @IsOptional()
  instanceName?: string;
}

export class SendAudioMessageDto {
  @IsNumber()
  number_id: number;

  @IsString()
  to: string;

  @IsString()
  audio_url: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  audioUrl?: string;

  @IsString()
  @IsOptional()
  instanceName?: string;
}

export class SendDocumentMessageDto {
  @IsNumber()
  number_id: number;

  @IsString()
  to: string;

  @IsString()
  document_url: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  documentUrl?: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  instanceName?: string;
}

export class SendTemplateMessageDto {
  @IsNumber()
  number_id: number;

  @IsString()
  to: string;

  @IsString()
  template_name: string;

  @IsString()
  @IsOptional()
  templateName?: string;

  @IsString()
  @IsOptional()
  language_code?: string;

  @IsArray()
  @IsOptional()
  parameters?: string[];

  @IsArray()
  @IsOptional()
  variables?: string[];

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  instanceName?: string;
}

export class SendMediaMessageDto {
  @IsNumber()
  number_id: number;

  @IsString()
  to: string;

  @IsString()
  mediaUrl: string;

  @IsString()
  mediaType: 'image' | 'video' | 'audio' | 'document';

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  instanceName?: string;
}
