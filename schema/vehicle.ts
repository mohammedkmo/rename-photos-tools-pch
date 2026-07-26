import { z } from "zod";

// Details that are identical for every vehicle in a request, so they are
// captured once above the grid rather than repeated on every row.
export const requestSchema = (t: any) =>
  z.object({
    contractor: z.string().min(2, t('validation.contractorRequired')),
    associatedPetroChinaContractNumber: z
      .string()
      .min(1, t('validation.associatedPetroChinaContractNumberRequired')),
    contractHoldingPetroChinaDepartment: z
      .string()
      .min(1, t('validation.contractHoldingPetroChinaDepartmentRequired')),
  });

export const vehicleSchema = (t: any) =>
  z.object({
    plateNumber: z.string().min(1, t('validation.plateNumberRequired')),
    province: z.string().min(2, t('validation.provinceRequired')),
    make: z.string().min(2, t('validation.makeRequired')),
    model: z.string().min(2, t('validation.modelRequired')),
    softskinArmored: z.string().optional(),
    senewiyahNumber: z.string().min(1, t('validation.senewiyahNumberRequired')),
    wakalaNumber: z.string().optional(),
    subcontractor: z.string().optional(),
    // A comma separated list of driver badge numbers. Stored as text so it
    // fits a single cell and round-trips through the sheet unchanged.
    relatedPersons: z.string().optional(),
    eaLetterNumber: z.string().min(1, t('validation.eaLetterNumberRequired')),
    numberInEaList: z.string().min(1, t('validation.numberInEaListRequired')),
    securityClearanceExpiryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, t('validation.securityClearanceExpiryDateRequired')),
    photo: z
      .instanceof(File)
      .refine((file) => file.size <= 10000000, t('validation.maxFileSize')),
    senewiyah: z
      .instanceof(File)
      .refine((file) => file.size <= 10000000, t('validation.maxFileSize')),
    wakala: z
      .instanceof(File)
      .refine((file) => file.size <= 10000000, t('validation.maxFileSize'))
      .optional(),
    armoredVehicleCertificate: z
      .instanceof(File)
      .refine((file) => file.size <= 10000000, t('validation.maxFileSize'))
      .optional(),
  });

export const formSchema = (t: any) =>
  requestSchema(t)
    .extend({
      vehicles: z
        .array(vehicleSchema(t))
        .min(1, t('validation.atLeastOneVehicleRequired')),
    })
    // Two vehicles in one request cannot share a plate number.
    .superRefine((data, ctx) => {
      const seen = new Map<string, number>();
      data.vehicles.forEach((vehicle, index) => {
        if (!vehicle.plateNumber) return;
        if (seen.has(vehicle.plateNumber)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["vehicles", index, "plateNumber"],
            message: t('validation.plateNumberDuplicate', {
              row: (seen.get(vehicle.plateNumber) as number) + 1,
            }),
          });
        } else {
          seen.set(vehicle.plateNumber, index);
        }
      });
    });

export type FormValues = z.infer<ReturnType<typeof formSchema>>;
export type VehicleValues = FormValues["vehicles"][number];
