import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AppSettingKey,
  Document,
  DocumentType,
  Employee,
  EmployeeStatus,
  Prisma,
} from '@prisma/client';
import { calendarDate } from '../attendance/working-hours';
import { parseOptionalDate } from '../common/utils/parse-date';
import type { ObjectStorage } from '../common/storage/object-storage';
import { OBJECT_STORAGE } from '../common/storage/storage.tokens';
import { AppConfiguration } from '../config/configuration';
import { DocumentExpiryService } from '../notifications/document-expiry.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  addUtcDays,
  DEFAULT_DOCUMENT_WARNING_DAYS,
  resolveWarningDays,
} from './document-expiry';
import { toDocumentDetail, toDocumentListItem } from './documents.mapper';
import {
  DocumentDetail,
  DocumentExpirySummary,
  PaginatedDocuments,
} from './documents.types';
import { CreateDocumentDto } from './dto/create-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import {
  assertFileSize,
  buildStorageKey,
  detectFileType,
  safeOriginalName,
} from './file-validation';

const employeeSelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.EmployeeSelect;

export interface IncomingFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

type DocumentWithEmployee = Document & {
  employee: Pick<Employee, keyof typeof employeeSelect>;
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    private readonly config: ConfigService<AppConfiguration, true>,
    private readonly documentExpiryService: DocumentExpiryService,
  ) {}

  async create(
    employeeId: string,
    dto: CreateDocumentDto,
    file: IncomingFile | undefined,
  ): Promise<DocumentDetail> {
    const employee = await this.findVisibleEmployeeOrThrow(employeeId);
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const upload = this.config.get('upload', { infer: true });
    assertFileSize(file.size, upload.maxFileSizeBytes);
    const detected = detectFileType(
      file.buffer,
      file.originalname,
      upload.allowedMimeTypes,
    );
    const key = buildStorageKey(employee.id, detected.extension);
    const issueDate = parseOptionalDate(dto.issueDate, 'issueDate');
    const expiryDate = parseOptionalDate(dto.expiryDate, 'expiryDate');
    this.assertDateOrder(issueDate, expiryDate);

    await this.storage.upload({
      key,
      body: file.buffer,
      contentType: detected.mimeType,
    });

    const record = await this.prisma.document.create({
      data: {
        employeeId: employee.id,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber ?? null,
        issueDate: issueDate ?? null,
        expiryDate: expiryDate ?? null,
        fileName: safeOriginalName(file.originalname),
        fileUrl: key,
        mimeType: detected.mimeType,
        fileSize: file.size,
        notes: dto.notes ?? null,
      },
      include: { employee: { select: employeeSelect } },
    });

    await this.syncExpiryNotifications();
    return this.toDetail(record);
  }

  async findForEmployee(employeeId: string) {
    await this.findVisibleEmployeeOrThrow(employeeId);
    const result = await this.list({ employeeId, limit: 100, page: 1 });
    return result.data;
  }

  async list(query: QueryDocumentsDto): Promise<PaginatedDocuments> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const warningDays = await this.getWarningDays();
    const today = calendarDate();
    const where = this.buildWhere(query, today, warningDays);

    const [total, records] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        where,
        include: { employee: { select: employeeSelect } },
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: records.map((record) =>
        toDocumentListItem(record, today, warningDays),
      ),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async findOne(id: string): Promise<DocumentDetail> {
    return this.toDetail(await this.findOrThrow(id));
  }

  async update(id: string, dto: UpdateDocumentDto): Promise<DocumentDetail> {
    const current = await this.findOrThrow(id);
    const issueDate = Object.prototype.hasOwnProperty.call(dto, 'issueDate')
      ? (parseOptionalDate(dto.issueDate, 'issueDate') ?? null)
      : current.issueDate;
    const expiryDate = Object.prototype.hasOwnProperty.call(dto, 'expiryDate')
      ? (parseOptionalDate(dto.expiryDate, 'expiryDate') ?? null)
      : current.expiryDate;
    this.assertDateOrder(issueDate, expiryDate);

    const record = await this.prisma.document.update({
      where: { id: current.id },
      data: {
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        issueDate,
        expiryDate,
        notes: dto.notes,
      },
      include: { employee: { select: employeeSelect } },
    });

    await this.syncExpiryNotifications();
    return this.toDetail(record);
  }

  async remove(id: string): Promise<{ success: true }> {
    const current = await this.findOrThrow(id);
    await this.storage.delete(current.fileUrl);
    await this.prisma.document.delete({ where: { id: current.id } });
    return { success: true };
  }

  async readFile(id: string): Promise<{
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  }> {
    const current = await this.findOrThrow(id);
    const buffer = await this.storage.read(current.fileUrl);
    return {
      buffer,
      mimeType: current.mimeType,
      fileName: current.fileName,
    };
  }

  async getExpirySummary(): Promise<DocumentExpirySummary> {
    const warningDays = await this.getWarningDays();
    const today = calendarDate();
    const soon = addUtcDays(today, warningDays);

    const [expired, expiringSoon] = await Promise.all([
      this.prisma.document.count({
        where: {
          expiryDate: { lt: today },
          employee: { deletedAt: null },
        },
      }),
      this.prisma.document.count({
        where: {
          expiryDate: { gte: today, lte: soon },
          employee: { deletedAt: null },
        },
      }),
    ]);

    return { expired, expiringSoon, warningDays };
  }

  private async syncExpiryNotifications(): Promise<void> {
    try {
      await this.documentExpiryService.runDailyCheck();
    } catch {
      // Document writes must not fail if notification creation fails.
    }
  }

  private async getWarningDays(): Promise<number> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: AppSettingKey.DOCUMENT_EXPIRY_WARNING_DAYS },
    });
    const fallback = this.config.get('documentExpiryWarningDays', {
      infer: true,
    });

    return resolveWarningDays(
      setting?.value,
      fallback || DEFAULT_DOCUMENT_WARNING_DAYS,
    );
  }

  private async toDetail(
    record: DocumentWithEmployee,
  ): Promise<DocumentDetail> {
    const warningDays = await this.getWarningDays();
    return toDocumentDetail(record, calendarDate(), warningDays);
  }

  private async findOrThrow(id: string): Promise<DocumentWithEmployee> {
    const record = await this.prisma.document.findFirst({
      where: { id, employee: { deletedAt: null } },
      include: { employee: { select: employeeSelect } },
    });

    if (!record) {
      throw new NotFoundException('Document not found');
    }

    return record;
  }

  private async findVisibleEmployeeOrThrow(id: string): Promise<Employee> {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.status === EmployeeStatus.ARCHIVED) {
      throw new BadRequestException('Employee is not available');
    }

    return employee;
  }

  private assertDateOrder(
    issueDate?: Date | null,
    expiryDate?: Date | null,
  ): void {
    if (issueDate && expiryDate && expiryDate.getTime() < issueDate.getTime()) {
      throw new BadRequestException('expiryDate must not be before issueDate');
    }
  }

  private buildWhere(
    query: QueryDocumentsDto,
    today: Date,
    warningDays: number,
  ): Prisma.DocumentWhereInput {
    const search = query.search?.trim();
    const from = parseOptionalDate(query.expiryFrom, 'expiryFrom');
    const to = parseOptionalDate(query.expiryTo, 'expiryTo');
    if (from && to && to.getTime() < from.getTime()) {
      throw new BadRequestException('expiryTo cannot be before expiryFrom');
    }

    const soon = addUtcDays(today, warningDays);
    const expiryClauses: Prisma.DocumentWhereInput[] = [];
    if (from || to) {
      expiryClauses.push({
        expiryDate: { gte: from ?? undefined, lte: to ?? undefined },
      });
    }

    const expiryStatus =
      query.expiryStatus ??
      (query.expired
        ? 'EXPIRED'
        : query.expiringWithin
          ? 'EXPIRING_SOON'
          : undefined);

    if (expiryStatus === 'EXPIRED') {
      expiryClauses.push({ expiryDate: { lt: today } });
    } else if (expiryStatus === 'EXPIRING_SOON') {
      expiryClauses.push({
        expiryDate: {
          gte: today,
          lte: query.expiringWithin
            ? addUtcDays(today, query.expiringWithin)
            : soon,
        },
      });
    } else if (expiryStatus === 'VALID') {
      expiryClauses.push({ expiryDate: { gt: soon } });
    }

    return {
      employeeId: query.employeeId,
      documentType: this.resolveTypeFilter(query.documentType),
      AND: expiryClauses,
      employee: {
        deletedAt: null,
        OR: search
          ? [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { employeeCode: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
    };
  }

  private resolveTypeFilter(
    documentType?: string,
  ): Prisma.EnumDocumentTypeFilter | DocumentType | undefined {
    if (!documentType) {
      return undefined;
    }

    const aliases: Partial<Record<string, DocumentType[]>> = {
      PASSPORT: [DocumentType.PASSPORT, DocumentType.PASSPORT_SCAN],
      VISA: [DocumentType.VISA, DocumentType.VISA_SCAN],
      EMIRATES_ID: [DocumentType.EMIRATES_ID, DocumentType.NATIONAL_ID],
      LABOUR_CONTRACT: [DocumentType.LABOUR_CONTRACT, DocumentType.CONTRACT],
    };

    const mapped = aliases[documentType];
    if (mapped) {
      return { in: mapped };
    }

    return documentType as DocumentType;
  }
}
