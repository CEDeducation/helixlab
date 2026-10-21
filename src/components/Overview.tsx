'use client';
type Workspace='dna'|'notebook'|'group'|'chemistry'|'primers'|'protein'|'pharmacophore'|'docking';
export default function Overview({navigate}:{navigate:(t:Workspace)=>void}){
 const cards:{key:Workspace;label:string;desc:string}[]=[
  {key:'dna',label:'DNA & plasmids',desc:'Interactive OpenLab circular maps, sequences, annotations and restriction analysis.'},
  {key:'primers',label:'Primer3 PCR designer',desc:'Real candidate primer pairs from Primer3 thermodynamic design engine.'},
  {key:'chemistry',label:'2D chemical drawing',desc:'Ketcher sketching, MOL export, SMILES and RDKit molecular descriptors.'},
  {key:'protein',label:'3D macromolecular viewer',desc:'Inspect imported PDB and mmCIF structures interactively with Mol*.'},
  {key:'pharmacophore',label:'Pharmacophore lab',desc:'RDKit ligand-based 3D consensus and structure-based proximity features.'},
  {key:'docking',label:'AutoDock Vina',desc:'Dock prepared structures through a private scientific compute worker.'},
  {key:'notebook',label:'Lab notebook',desc:'Save research notes and link scientific records in one workspace.'},
  {key:'group',label:'Group collaboration',desc:'Share research with role-based access and distinct collaborator identities.'}
 ];
 return <div className="pageBody"><div className="pageHeading dashboardHeading"><div><span className="sectionEyebrow">LABORATORY WORKSPACE</span><h1>Welcome to HelixLab</h1><p>DNA design, molecular modeling, and collaborative research in one student workspace.</p></div></div>
 <div className="hl-overview-grid">{cards.map(c=><button key={c.key} className="surfaceCard hl-overview-card" onClick={()=>navigate(c.key)}><span className="sectionEyebrow">SCIENTIFIC WORKSPACE</span><h2>{c.label}</h2><p>{c.desc}</p><span className="hl-open">Open tool →</span></button>)}</div>
 <section className="surfaceCard hl-info"><h2>Scientific integrity</h2><p>Original imports are preserved where supported. Predictions display method, settings and limitations; missing computation engines report errors instead of fake outputs.</p><p className="hl-muted">Engineering beta. Full 3D/browser build, Vina runtime, cloud security, and publication-specific validation remain outstanding.</p></section></div>;
}
