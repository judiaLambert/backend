import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { EtatMateriel } from '../etatmateriel/etatmateriel.entity';
import { TypeMateriel } from '../typemateriel/typemateriel.entity';

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

  @Column({ name: 'designation_materiel', type: 'text' })
  designation: string;
}