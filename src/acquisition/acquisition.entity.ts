import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Fournisseur } from '../fournisseur/fournisseur.entity';

@Entity('acquisition')
export class Acquisition {
  @PrimaryColumn({ name: 'id_acquisition' })
  id: string;

  @ManyToOne(() => Fournisseur)
  @JoinColumn({ name: 'id_fournisseur' })
  fournisseur: Fournisseur;

  @Column({ name: 'date_acquisition', type: 'date' })
  dateAcquisition: Date;

  @Column({ name: 'type_acquisition' })
  typeAcquisition: string;
}