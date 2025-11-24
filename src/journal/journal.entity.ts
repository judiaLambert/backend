import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { MouvementStock } from '../mouvement_stock/mouvement.entity';

export enum StatutValidation {
  EN_ATTENTE = 'EN_ATTENTE',
  VALIDE = 'VALIDE',
  REJETE = 'REJETE'
}

@Entity('journal')
export class Journal {
  @PrimaryColumn({ name: 'id_journal', length: 10 })
  id_journal: string;

  @Column({ name: 'date_validation', type: 'timestamp', nullable: true })
  date_validation: Date;

  @Column({
    name: 'statut',
    type: 'enum',
    enum: StatutValidation,
    default: StatutValidation.EN_ATTENTE
  })
  statut: StatutValidation;

  // Relation avec mouvement_stock (obligatoire et unique)
  @ManyToOne(() => MouvementStock, { nullable: false })
  @JoinColumn({ name: 'id_mouvement' })
  mouvement: MouvementStock;

  @Column({ name: 'id_mouvement', unique: true })
  id_mouvement: string;

  // Optionnel : motif de rejet si nécessaire
  @Column({ name: 'motif_rejet', type: 'text', nullable: true })
  motif_rejet: string;

  // Optionnel : qui a validé/rejeté
  @Column({ name: 'id_validateur', length: 10, nullable: true })
  id_validateur: string;

  // Date de création automatique (pour traçabilité)
  @CreateDateColumn({ name: 'date_creation' })
  date_creation: Date;
}
