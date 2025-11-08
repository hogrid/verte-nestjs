import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { File } from '../database/entities/file.entity';

/**
 * FilesModule
 *
 * Módulo de gerenciamento de arquivos (upload/download/delete)
 * Total: 3 endpoints implementados
 *
 * Endpoints:
 * - POST /api/v1/upload-media - Upload de mídia
 * - GET /api/v1/download-file/:id - Download de arquivo
 * - DELETE /api/v1/delete-media/:id - Deletar mídia
 */
@Module({
  imports: [TypeOrmModule.forFeature([File])],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule implements OnModuleInit {
  constructor(private readonly filesService: FilesService) {}

  async onModuleInit() {
    // Ensure upload directory exists on module initialization
    await this.filesService.ensureUploadDir();
  }
}
