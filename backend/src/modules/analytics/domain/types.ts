export interface PersonActivity {
  documentType: string;
  documentDisplay: string; // masked
  name: string | null;
  totalContracts: number;
  totalValue: number;
  entities: number;
  departments: number;
  rolesAsSupplier: number;
  rolesAsSupervisor: number;
  rolesAsLegalRep: number;
}
