import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * IsUnique Validator
 * Checks if a value is unique in the database
 * Compatible with Laravel's 'unique' validation rule
 * Usage: @IsUnique('users', 'email')
 */
@ValidatorConstraint({ name: 'IsUnique', async: true })
@Injectable()
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private dataSource: DataSource) {}

  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    const [tableName, column] = args.constraints;

    if (!value) return true;

    const repository = this.dataSource.getRepository(tableName);
    const entity = await repository
      .createQueryBuilder(tableName)
      .where(`${column} = :value`, { value })
      .andWhere('deleted_at IS NULL') // Respect soft deletes like Laravel
      .getOne();

    return !entity;
  }

  defaultMessage(args: ValidationArguments): string {
    const [, column] = args.constraints;
    return `Este ${column} já foi cadastrado.`;
  }
}

export function IsUnique(
  tableName: string,
  column: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [tableName, column],
      validator: IsUniqueConstraint,
    });
  };
}
