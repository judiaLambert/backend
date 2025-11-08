import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('etatmateriel')
export class EtatMateriel {
  @PrimaryColumn({ name: 'id_etatmateriel' })
  id: string;

  @Column('text', { name: 'designation_etat' })
  designation: string;

  @Column('text', { name: 'description_etat', nullable: true })
  description: string;
}