/** Sequence coordinates are zero-based and inclusive in this UI. */
export type SequenceFeature = {
  id:string; name:string; type:string; start:number; end:number;
  direction:1|-1; color:string; notes?:string;
};
export type SequencePrimer = {
  id:string; name:string; start:number; end:number;
  direction:1|-1; color:string;
};
export type SequenceRecord = {
  id:string; name:string; sequence:string; topology:'Circular'|'Linear';
  features:SequenceFeature[]; primers:SequencePrimer[];
};
export type ScientificRecord = {
  id:string; workspace_id:string; name:string; type:string;
  content:Record<string,unknown>; revision:number; created_at:string;
};
export type LabWorkspace = {id:string; name:string; owner_id:string};
export type StudentProfile = {id:string; workspace_id:string; slot:number; display_name:string; color:string};
export type LabMember = {workspace_id:string;user_id:string;role:'owner'|'editor'|'viewer'};
export type ParsedSequence = {
  name:string; sequence:string; topology:'Circular'|'Linear';
  features:SequenceFeature[]; format:'FASTA'|'GenBank'|'DNA';
  warnings:string[];
};
