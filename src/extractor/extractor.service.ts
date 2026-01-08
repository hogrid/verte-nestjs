import { Injectable } from '@nestjs/common';
import { UpdateExtractorConfigDto } from './dto/update-extractor-config.dto';
import { GetLogsQueryDto } from './dto/get-logs-query.dto';

// In-memory storage for extractor configs (since there's no entity for this)
// In production, this should be stored in database (e.g., settings table or user preferences)
const extractorConfigs = new Map<number, any>();

@Injectable()
export class ExtractorService {
  getConfig(userId: number) {
    // Return stored config or defaults
    const config = extractorConfigs.get(userId);

    if (config) {
      return config;
    }

    // Return default config
    return {
      enabled: false,
      auto_extract: false,
      extract_from_groups: false,
      filter_keywords: [],
      max_contacts_per_day: 100,
    };
  }

  updateConfig(userId: number, dto: UpdateExtractorConfigDto) {
    // Get current config or defaults
    const currentConfig = this.getConfig(userId);

    // Merge with new values
    const updatedConfig = {
      ...currentConfig,
      ...Object.fromEntries(
        Object.entries(dto).filter(([_, v]) => v !== undefined),
      ),
    };

    // Store updated config
    extractorConfigs.set(userId, updatedConfig);

    return updatedConfig;
  }

  getLogs(userId: number, query: GetLogsQueryDto) {
    // Return empty array for now
    // In production, this should query actual logs from database
    // Filtering by start_date, end_date, status, and paginating with page/per_page
    return [];
  }
}
