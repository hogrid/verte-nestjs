import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from '../database/entities/file.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * FilesService
 *
 * Serviço de gerenciamento de arquivos (upload/download/delete)
 * Mantém 100% de compatibilidade com Laravel FilesController
 */
@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
  ) {}

  /**
   * Upload media file
   * Laravel: FilesController@uploadMedia
   */
  async uploadMedia(
    userId: number,
    file: Express.Multer.File,
  ): Promise<{
    id: number;
    filename: string;
    url: string;
    size: number;
    type: string;
  }> {
    this.logger.log('📤 Uploading media file', {
      userId,
      filename: file.originalname,
      size: file.size,
    });

    try {
      // Garantir diretório de upload
      await this.ensureUploadDir();

      // Determine file type
      const fileType = this.getFileType(file.mimetype);

      // Generate URL
      const baseUrl = process.env.APP_URL || 'http://localhost:3000';
      const fileUrl = `${baseUrl}/api/v1/download-file/${file.filename}`;

      // Caminho absoluto para envio posterior via res.sendFile
      const absolutePath = path.isAbsolute(file.path)
        ? file.path
        : path.join(process.cwd(), file.path);

      // Save file metadata to database
      const fileRecord = this.fileRepository.create({
        user_id: userId,
        filename: file.originalname,
        path: absolutePath,
        mimetype: file.mimetype,
        size: file.size,
        type: fileType,
        url: fileUrl,
      });

      const savedFile = await this.fileRepository.save(fileRecord);

      this.logger.log('✅ Media file uploaded', {
        fileId: savedFile.id,
        filename: file.originalname,
      });

      // Criar um alias (symlink) com o nome original para suportar download por filename
      try {
        const aliasPath = path.join(this.uploadDir, file.originalname);
        try {
          await fs.unlink(aliasPath);
        } catch {}
        await fs.symlink(absolutePath, aliasPath);
      } catch (e) {
        // Não bloquear upload se symlink falhar
        this.logger.warn('⚠️ Não foi possível criar alias do arquivo', {
          original: file.originalname,
          error: e instanceof Error ? e.message : String(e),
        });
      }

      return {
        id: savedFile.id,
        // Para compatibilidade com download por filename, retornar o nome salvo
        filename: path.basename(absolutePath),
        url: savedFile.url || '',
        size: savedFile.size,
        type: savedFile.type || fileType,
      };
    } catch (error: unknown) {
      this.logger.error('❌ Error uploading media file', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Clean up uploaded file on error
      try {
        const p = path.isAbsolute(file.path)
          ? file.path
          : path.join(process.cwd(), file.path);
        await fs.unlink(p);
      } catch (unlinkError) {
        this.logger.warn('⚠️ Could not clean up file', {
          path: file.path,
        });
      }

      throw error;
    }
  }

  /**
   * Download file
   * Laravel: FilesController@downloadFile
   */
  async downloadFile(
    fileId: string,
  ): Promise<{ path: string; filename: string; mimetype: string }> {
    this.logger.log('📥 Downloading file', { fileId });

    try {
      // Find file by ID or filename
      let fileRecord: File | null = null;

      // Try to find by ID first
      if (!isNaN(Number(fileId))) {
        fileRecord = await this.fileRepository.findOne({
          where: { id: Number(fileId) },
        });
      }

      // If not found, try to find by filename (exato)
      if (!fileRecord) {
        fileRecord = await this.fileRepository.findOne({
          where: { filename: fileId },
        });
      }

      // If still not found, try to find by filename fragment ou path
      if (!fileRecord) {
        const repo = this.fileRepository;
        fileRecord = await repo
          .createQueryBuilder('f')
          .where('f.filename LIKE :q', { q: `%${fileId}%` })
          .orWhere('f.path LIKE :q', { q: `%${fileId}%` })
          .getOne();
      }

      // Fallback final: tentar servir arquivo diretamente do diretório de uploads pelo nome
      if (!fileRecord) {
        const aliasPath = path.join(this.uploadDir, fileId);
        try {
          await fs.access(aliasPath);
          // Deduzir mimetype simples por extensão
          const ext = (path.extname(fileId) || '').toLowerCase();
          let mimetype = 'application/octet-stream';
          if (ext === '.png') mimetype = 'image/png';
          else if (ext === '.jpg' || ext === '.jpeg') mimetype = 'image/jpeg';
          else if (ext === '.gif') mimetype = 'image/gif';
          else if (ext === '.webp') mimetype = 'image/webp';
          else if (ext === '.mp4') mimetype = 'video/mp4';
          else if (ext === '.mpeg') mimetype = 'video/mpeg';
          else if (ext === '.mov' || ext === '.qt') mimetype = 'video/quicktime';
          else if (ext === '.mp3') mimetype = 'audio/mpeg';
          else if (ext === '.wav') mimetype = 'audio/wav';
          else if (ext === '.ogg') mimetype = 'audio/ogg';
          else if (ext === '.pdf') mimetype = 'application/pdf';

          return {
            path: aliasPath,
            filename: fileId,
            mimetype,
          };
        } catch {}
      }

      if (!fileRecord) {
        throw new NotFoundException('Arquivo não encontrado');
      }

      this.logger.log('🔎 File located for download', {
        id: fileRecord.id,
        filename: fileRecord.filename,
        path: fileRecord.path,
      });

      // Check if file exists (path deve ser absoluto)
      try {
        await fs.access(fileRecord.path);
      } catch {
        throw new NotFoundException('Arquivo não encontrado no sistema');
      }

      return {
        path: fileRecord.path,
        filename: fileRecord.filename,
        mimetype: fileRecord.mimetype || 'application/octet-stream',
      };
    } catch (error: unknown) {
      this.logger.error('❌ Error downloading file', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete media file
   * Laravel: FilesController@deleteMedia
   */
  async deleteMedia(userId: number, fileId: number): Promise<void> {
    this.logger.log('🗑️ Deleting media file', { userId, fileId });

    try {
      // Find file
      const fileRecord = await this.fileRepository.findOne({
        where: { id: fileId, user_id: userId },
      });

      if (!fileRecord) {
        throw new NotFoundException('Arquivo não encontrado');
      }

      // Delete physical file
      try {
        await fs.unlink(fileRecord.path);
        this.logger.log('✅ Physical file deleted', {
          path: fileRecord.path,
        });
      } catch (unlinkError) {
        this.logger.warn('⚠️ Could not delete physical file', {
          path: fileRecord.path,
          error:
            unlinkError instanceof Error
              ? unlinkError.message
              : String(unlinkError),
        });
      }

      // Soft delete from database
      await this.fileRepository.softDelete(fileId);

      this.logger.log('✅ Media file deleted', { fileId });
    } catch (error: unknown) {
      this.logger.error('❌ Error deleting media file', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get file type from mimetype
   */
  private getFileType(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.startsWith('application/pdf')) return 'document';
    return 'other';
  }

  /**
   * Ensure upload directory exists
   */
  async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log('📁 Upload directory created', {
        path: this.uploadDir,
      });
    }
  }
}
