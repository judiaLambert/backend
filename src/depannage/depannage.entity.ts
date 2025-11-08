import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Materiel } from '../materiel/materiel.entity';
import { Demandeur } from '../demandeur/demandeur.entity';

@Entity('depannage')
export class Depannage {
  @PrimaryColumn({ name: 'id_depannage' })
  id: string;

  @ManyToOne(() => Materiel)
  @JoinColumn({ name: 'id_materiel' })
  materiel: Materiel;

  @ManyToOne(() => Demandeur)
  @JoinColumn({ name: 'id_demandeur' })
  demandeur: Demandeur;

  @Column({ type: 'date' })
  date_signalement: Date;

  @Column({ type: 'text' })
  description_panne: string;

  @Column()
  statut_depannage: string; // 'Signalé', 'En cours', 'Résolu', 'Irréparable'
}