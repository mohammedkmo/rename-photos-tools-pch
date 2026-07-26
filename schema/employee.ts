import { z } from "zod";

export const employeeSchema = (t: any) => z.object({
    id: z.string().min(1, t('validation.badgeNumberRequired')),
    firstName: z.string().min(2, t('validation.firstNameMinLength')),
    lastName: z.string().min(2, t('validation.lastNameMinLength')),
    contractor: z.string().min(2, t('validation.contractorMinLength')),
    position: z.string().min(2, t('validation.positionMinLength')),
    idDocumentNumber: z.string().min(1, t('validation.idDocumentNumberRequired')),
    nationality: z.string().min(2, t('validation.nationalityMinLength')),
    subcontractor: z
      .string()
      .optional(),
    associatedPetroChinaContractNumber: z
      .string()
      .min(1, t('validation.associatedPetroChinaContractNumberRequired')),
    contractHoldingPetroChinaDepartment: z
      .string()
      .min(1, t('validation.contractHoldingPetroChinaDepartmentRequired')),
    eaLetterNumber: z.string().min(1, t('validation.eaLetterNumberRequired')),
    numberInEaList: z.string().min(1, t('validation.numberInEaListRequired')),
    securityClearanceExpiryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, t('validation.securityClearanceExpiryDateRequired')),
    photo: z
      .instanceof(File)
      .refine((file) => file.size <= 10000000, t('validation.maxFileSize')),
    idDocument: z
      .instanceof(File)
      .refine((file) => file.size <= 10000000, t('validation.maxFileSize')),
    drivingLicense: z.instanceof(File).optional(),
    moiCard: z.instanceof(File).refine((file) => file.size <= 10000000, t('validation.maxFileSize')).optional(),
  });


  export const formSchema = (t: any) => z.object({
    employees: z
      .array(employeeSchema(t))
      .min(1, t('validation.atLeastOneEmployeeRequired')),
  });
  
  export type FormValues = z.infer<ReturnType<typeof formSchema>>;