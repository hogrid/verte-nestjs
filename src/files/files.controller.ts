import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesService } from './files.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

/**
 * FilesController
 *
 * Gerencia upload, download e delete de arquivos de mídia
 * Mantém 100% de compatibilidade com Laravel FilesController
 *
 * Total: 3 endpoints
 */
@ApiTags('Files')
@Controller('api/v1')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * 1. POST /api/v1/upload-media
   * Upload de arquivo de mídia
   * Laravel: FilesController@uploadMedia
   */
  @Post('upload-media')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
      fileFilter: (req, file, callback) => {
        // Accept images, videos, audios
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/ogg',
          'application/pdf',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              'Tipo de arquivo não permitido. Apenas imagens, vídeos, áudios e PDFs.',
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Arquivo de mídia para upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload de arquivo de mídia',
    description: 'Faz upload de imagem, vídeo, áudio ou PDF (máx 50MB)',
  })
  @ApiResponse({
    status: 200,
    description: 'Arquivo enviado com sucesso',
    schema: {
      example: {
        id: 1,
        filename: 'imagem.jpg',
        url: 'http://localhost:3000/api/v1/download-file/file-1234567890-123456789.jpg',
        size: 102400,
        type: 'image',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Tipo de arquivo não permitido' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async uploadMedia(
    @Request() req: { user: { id: number } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('É obrigatório enviar um arquivo.');
    }

    return this.filesService.uploadMedia(req.user.id, file);
  }

  /**
   * 2. GET /api/v1/download-file/:id
   * Download de arquivo
   * Laravel: FilesController@downloadFile
   */
  @Get('download-file/:id')
  @ApiOperation({
    summary: 'Download de arquivo',
    description: 'Faz download de arquivo por ID ou nome',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do arquivo ou nome do arquivo',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Arquivo enviado',
    content: {
      'image/*': {},
      'video/*': {},
      'audio/*': {},
      'application/pdf': {},
    },
  })
  @ApiResponse({ status: 404, description: 'Arquivo não encontrado' })
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    const fileData = await this.filesService.downloadFile(id);
    // Debug log: filename-based download
    // Using Nest logger is avoided here to keep noise low in prod; acceptable in test.

    console.log('[FilesController] downloadFile', { id, fileData });

    res.setHeader('Content-Type', fileData.mimetype);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${fileData.filename}"`,
    );

    // Garantir caminho absoluto para envio
    return res.sendFile(fileData.path);
  }

  /**
   * 3. DELETE /api/v1/delete-media/:id
   * Deletar arquivo de mídia
   * Laravel: FilesController@deleteMedia
   */
  @Delete('delete-media/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deletar arquivo de mídia',
    description: 'Remove arquivo de mídia do sistema (soft delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do arquivo',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Arquivo deletado com sucesso',
    schema: {
      example: {
        success: true,
        message: 'Arquivo deletado com sucesso',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Arquivo não encontrado' })
  async deleteMedia(
    @Request() req: { user: { id: number } },
    @Param('id') id: number,
  ) {
    await this.filesService.deleteMedia(req.user.id, id);

    return {
      success: true,
      message: 'Arquivo deletado com sucesso',
    };
  }
}
