import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { FournisseurTypeMateriel } from '../fournisseur_typemateriel/fournisseurtype.entity';

@Entity('typemateriel')
export class TypeMateriel {
  @PrimaryColumn({ name: 'id_typemateriel' })
  id: string;

  @Column('text')
  designation: string;

  @Column('text', { nullable: true })
  description: string;

  // ✅ Relation N-N via table d'association
  @OneToMany(() => FournisseurTypeMateriel, ftm => ftm.typeMateriel)
  fournisseurs: FournisseurTypeMateriel[];
}