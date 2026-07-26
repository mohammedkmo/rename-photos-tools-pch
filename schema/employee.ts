import { z } from "zod";

// Details that are identical for everyone in a request, so they are captured
// once above the grid rather than repeated on every row.
export const requestSchema = (t: any) =>
  z.object({
    contractor: z.string().min(2, t('validation.contractorMinLength')),
    associatedPetroChinaContractNumber: z
      .string()
      .min(1, t('validation.associatedPetroChinaContractNumberRequired')),
    contractHoldingPetroChinaDepartment: z
      .string()
      .min(1, t('validation.contractHoldingPetroChinaDepartmentRequired')),
  });

export const employeeSchema = (t: any) => z.object({
    id: z.string().min(1, t('validation.badgeNumberRequired')),
    firstName: z.string().min(2, t('validation.firstNameMinLength')),
    lastName: z.string().min(2, t('validation.lastNameMinLength')),
    position: z.string().min(2, t('validation.positionMinLength')),
    idDocumentNumber: z.string().min(1, t('validation.idDocumentNumberRequired')),
    nationality: z.string().min(2, t('validation.nationalityMinLength')),
    subcontractor: z
      .string()
      .optional(),
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


  export const formSchema = (t: any) =>
    requestSchema(t)
      .extend({
        employees: z
          .array(employeeSchema(t))
          .min(1, t('validation.atLeastOneEmployeeRequired')),
      })
      // Two people in one request cannot share a badge number. Nothing caught
      // this before, so duplicates reached the badging office unnoticed.
      .superRefine((data, ctx) => {
        const seen = new Map<string, number>();
        data.employees.forEach((employee, index) => {
          if (!employee.id) return;
          if (seen.has(employee.id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["employees", index, "id"],
              message: t('validation.badgeNumberDuplicate', {
                row: (seen.get(employee.id) as number) + 1,
              }),
            });
          } else {
            seen.set(employee.id, index);
          }
        });
      });

  export type FormValues = z.infer<ReturnType<typeof formSchema>>;
  export type EmployeeValues = FormValues["employees"][number];
