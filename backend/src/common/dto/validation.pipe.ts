import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';

export const validationPipeOptions: ValidationPipeOptions = {
  whitelist: true, // Strip properties that don't have decorators
  forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
  transform: true, // Automatically transform payloads to DTO instances
  transformOptions: {
    enableImplicitConversion: true, // Allow implicit type conversion
    exposeDefaultValues: true, // Expose default values
    excludeExtraneousValues: true, // Exclude extraneous values
    exposeUnsetFields: false, // Don't expose unset fields
  },
  groups: [], // Validation groups
  strictGroups: false, // Strict validation groups
  dismissDefaultMessages: false, // Don't dismiss default messages
  validationError: {
    target: false, // Don't expose target object
    value: false, // Don't expose value
  },
};

export const createValidationPipe = () => {
  return new ValidationPipe(validationPipeOptions);
};
