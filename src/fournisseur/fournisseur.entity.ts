import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { FournisseurTypeMateriel } from '../fournisseur_typemateriel/fournisseurtype.entity';

@Entity('fournisseur')
export class Fournisseur {
  @PrimaryColumn({ name: 'id_fournisseur' })
  id: string;

  @Column({ name: 'nom_fournisseur' })
  nom: string;

  @Column({ name: 'contact_fournisseur' })
  contact: string;

  @Column({ name: 'adresse_fournisseur', type: 'text' })
  adresse: string;

  @Column({ name: 'nif', nullable: true })
  nif: string;

  @Column({ name: 'stat', nullable: true })
  stat: string;

  @Column({ name: 'email', nullable: true })
  email: string;

  // ✅ Relation N-N via table d'association
  @OneToMany(() => FournisseurTypeMateriel, ftm => ftm.fournisseur)
  typesMateriels: FournisseurTypeMateriel[];
}