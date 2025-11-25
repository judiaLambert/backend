import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { GrandLivre } from '../grand_livre/livre.entity';
import { Inventaire } from '../inventaire/inventaire.entity';

export enum StatutReddition {
  EN_ATTENTE = 'EN_ATTENTE',
  VALIDE = 'VALIDE',
  REJETE = 'REJETE'
}

@Entity('reddition_annuelle')
export class RedditionAnnuelle {
  @PrimaryColumn({ name: 'id_reddition', length: 10 })
  id_reddition: string;

  @CreateDateColumn({ name: 'date_creation' })
  date_creation: Date;

  @Column({ name: 'annee_validation', type: 'int' })
  annee_validation: number;

  @Column({
    name: 'statut',
    type: 'varchar',
    length: 20,
    default: 'EN_ATTENTE'
  })
  statut: StatutReddition;

  @Column({ name: 'date_validation', type: 'timestamp', nullable: true })
  date_validation: Date;

  @Column({ name: 'motif_rejet', type: 'text', nullable: true })
  motif_rejet: string | null; 

  // Relation avec Grand Livre
  @ManyToOne(() => GrandLivre, { nullable: false })
  @JoinColumn({ name: 'id_grand_livre' })
  grandLivre: GrandLivre;

  @Column({ name: 'id_grand_livre' })
  id_grand_livre: string;

  // Relation avec Inventaire
  @ManyToOne(() => Inventaire, { nullable: false })
  @JoinColumn({ name: 'id_inventaire' })
  inventaire: Inventaire;

  @Column({ name: 'id_inventaire' })
  id_inventaire: string;
}
