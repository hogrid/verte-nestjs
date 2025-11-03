import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { Contact } from '../database/entities/contact.entity';
import { Number } from '../database/entities/number.entity';

/**
 * Contacts Module
 * Handles contacts management endpoints
 * Compatible with Laravel ContactsController
 *
 * Endpoints:
 * - GET /api/v1/contacts - List contacts with filters
 * - POST /api/v1/contacts - Create contact
 * - POST /api/v1/contacts/search - Search contacts
 * - POST /api/v1/contacts/import/csv - Import CSV
 * - POST /api/v1/contacts/import/test - Test import
 * - GET /api/v1/contacts/active/export - Export contacts
 * - POST /api/v1/contacts/block - Block contacts
 * - POST /api/v1/contacts/unblock - Unblock contacts
 * - GET /api/v1/contacts/indicators - Get indicators
 */
@Module({
  imports: [TypeOrmModule.forFeature([Contact, Number])],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
