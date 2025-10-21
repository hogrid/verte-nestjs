import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * IsCpfOrCnpj Validator
 * Validates Brazilian CPF or CNPJ document format
 * Compatible with Laravel pt-br-validator 'formato_cpf_ou_cnpj'
 */
@ValidatorConstraint({ name: 'IsCpfOrCnpj', async: false })
export class IsCpfOrCnpjConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    const cleanValue = value.replace(/\D/g, '');

    return this.isValidCpf(cleanValue) || this.isValidCnpj(cleanValue);
  }

  defaultMessage(args: ValidationArguments): string {
    return 'O campo :attribute não possui o formato válido de CPF ou CNPJ.';
  }

  /**
   * Validates CPF (11 digits)
   */
  private isValidCpf(cpf: string): boolean {
    if (cpf.length !== 11) {
      return false;
    }

    // Check for known invalid CPFs (all digits the same)
    if (/^(\d)\1{10}$/.test(cpf)) {
      return false;
    }

    // Validate first check digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let checkDigit = 11 - (sum % 11);
    if (checkDigit === 10 || checkDigit === 11) {
      checkDigit = 0;
    }
    if (checkDigit !== parseInt(cpf.charAt(9))) {
      return false;
    }

    // Validate second check digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    checkDigit = 11 - (sum % 11);
    if (checkDigit === 10 || checkDigit === 11) {
      checkDigit = 0;
    }
    if (checkDigit !== parseInt(cpf.charAt(10))) {
      return false;
    }

    return true;
  }

  /**
   * Validates CNPJ (14 digits)
   */
  private isValidCnpj(cnpj: string): boolean {
    if (cnpj.length !== 14) {
      return false;
    }

    // Check for known invalid CNPJs (all digits the same)
    if (/^(\d)\1{13}$/.test(cnpj)) {
      return false;
    }

    // Validate first check digit
    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj.charAt(i)) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    let checkDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (checkDigit !== parseInt(cnpj.charAt(12))) {
      return false;
    }

    // Validate second check digit
    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj.charAt(i)) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    checkDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (checkDigit !== parseInt(cnpj.charAt(13))) {
      return false;
    }

    return true;
  }
}

export function IsCpfOrCnpj(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCpfOrCnpjConstraint,
    });
  };
}
