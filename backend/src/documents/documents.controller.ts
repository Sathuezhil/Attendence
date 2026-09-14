import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import {
  documentFileInterceptor,
  safeContentDisposition,
} from './document-upload';
import { DocumentsService } from './documents.service';
import type { IncomingFile } from './documents.service';
import {
  DocumentDetail,
  DocumentListItem,
  PaginatedDocuments,
} from './documents.types';
import { MulterExceptionFilter } from './multer-exception.filter';

@Controller()
@UseFilters(MulterExceptionFilter)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('employees/:employeeId/documents')
  findForEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<DocumentListItem[]> {
    return this.documentsService.findForEmployee(employeeId);
  }

  @Post('employees/:employeeId/documents')
  @UseInterceptors(documentFileInterceptor())
  create(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: IncomingFile,
  ): Promise<DocumentDetail> {
    return this.documentsService.create(employeeId, dto, file);
  }

  @Get('documents')
  findAll(@Query() query: QueryDocumentsDto): Promise<PaginatedDocuments> {
    return this.documentsService.list(query);
  }

  @Get('documents/:id/file')
  @Header('Cache-Control', 'private, no-store')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const file = await this.documentsService.readFile(id);
    return new StreamableFile(file.buffer, {
      type: file.mimeType,
      disposition: safeContentDisposition(file.fileName),
    });
  }

  @Get('documents/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DocumentDetail> {
    return this.documentsService.findOne(id);
  }

  @Patch('documents/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
  ): Promise<DocumentDetail> {
    return this.documentsService.update(id, dto);
  }

  @Delete('documents/:id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: true }> {
    return this.documentsService.remove(id);
  }
}
