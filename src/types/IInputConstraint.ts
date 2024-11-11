export interface IInputConstraint {
  minLength: number;
  maxLength: number;
  isValid?: (value: string) => boolean;
}