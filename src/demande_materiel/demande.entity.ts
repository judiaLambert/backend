import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Demandeur } from '../demandeur/demandeur.entity';

@Entity('demandemateriel')
export class DemandeMateriel {
  @PrimaryColumn({ name: 'id_demande' })
  id: string;

  @ManyToOne(() => Demandeur)
  @JoinColumn({ name: 'id_demandeur' })
  demandeur: Demandeur;

  @Column({ name: 'date_demande' })
  date_demande: Date;

  @Column({ name: 'raison_demande' })
  raison_demande: string;
}