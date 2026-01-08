import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { DataSource, Not, IsNull } from 'typeorm';

interface IsUniqueConstraintArgs {
  tableName: string;
  column: string;
  exceptField?: string;
}

@Injectable()
@ValidatorConstraint({ name: 'isUnique', async: true })
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private dataSource: DataSource) {}

  async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
    const [constraint] = args.constraints as [IsUniqueConstraintArgs];
    const { tableName, column, exceptField } = constraint;

    if (!value) {
      return true;
    }

    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from(tableName, tableName)
      .where(`${column} = :value`, { value })
      .andWhere('deleted_at IS NULL');

    if (exceptField) {
      const exceptValue = (args.object as Record<string, unknown>)[exceptField];
      if (exceptValue) {
        queryBuilder.andWhere(`id != :exceptValue`, { exceptValue });
      }
    }

    const result = await queryBuilder.getRawOne<{ count: string }>();
    return parseInt(result?.count || '0', 10) === 0;
  }

  defaultMessage(args: ValidationArguments): string {
    const [constraint] = args.constraints as [IsUniqueConstraintArgs];
    return `O valor do campo ${constraint.column} já está em uso.`;
  }
}

export function IsUnique(
  constraint: IsUniqueConstraintArgs,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [constraint],
      validator: IsUniqueConstraint,
    });
  };
}
