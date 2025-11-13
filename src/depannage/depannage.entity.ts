import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Materiel } from '../materiel/materiel.entity';
import { Demandeur } from '../demandeur/demandeur.entity';

@Entity('depannage')
export class Depannage {
  @PrimaryColumn({ name: 'id_depannage' })
  id: string;

  @ManyToOne(() => Materiel, { nullable: false })
  @JoinColumn({ name: 'id_materiel' })
  materiel: Materiel;

  @Column({ name: 'id_materiel' })
  id_materiel: string;

  @ManyToOne(() => Demandeur, { nullable: false })
  @JoinColumn({ name: 'id_demandeur', referencedColumnName: 'id_demandeur' })
  demandeur: Demandeur;

  @Column({ name: 'id_demandeur' })
  id_demandeur: string;

  @Column({ type: 'date' })
  date_signalement: Date;

  @Column({ type: 'text' })
  description_panne: string;

  @Column({ length: 50 })
  statut_depannage: string; // 'Signalé', 'En cours', 'Résolu', 'Irréparable'
}