import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { EtatMateriel } from '../etatmateriel/etatmateriel.entity';
import { TypeMateriel } from '../typemateriel/typemateriel.entity';
import { TypeComptabilite } from '../type_comptabilite/typecompta.entity';

export enum CategorieMateriel {
  DURABLE = 'durable',
  CONSOMMABLE = 'consommable'
}

@Entity('materiel')
export class Materiel {
  @PrimaryColumn({ name: 'id_materiel' })
  id: string;

  @ManyToOne(() => EtatMateriel)
  @JoinColumn({ name: 'id_etatmateriel' })
  etatMateriel: EtatMateriel;

  @ManyToOne(() => TypeMateriel)
  @JoinColumn({ name: 'id_typemateriel' })
  typeMateriel: TypeMateriel;

  @ManyToOne(() => TypeComptabilite)
  @JoinColumn({ name: 'id_typecomptabilite' })
  typeComptabilite: TypeComptabilite;

  @Column({ name: 'designation_materiel', type: 'text' })
  designation: string;

  @Column({
    type: 'enum',
    enum: CategorieMateriel,
    default: CategorieMateriel.DURABLE
  })
  categorie_materiel: CategorieMateriel;
}
