import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { GrandLivre } from '../grand_livre/livre.entity';
import { ResultatRecensement } from '../resultat_recensement/resultat.entity';

export enum StatutReddition {
  EN_ATTENTE = 'EN_ATTENTE',
  VALIDE = 'VALIDE',
  REJETE = 'REJETE',
}

@Entity('reddition_annuelle')
export class RedditionAnnuelle {
  @PrimaryColumn({ name: 'id_reddition', length: 10 })
  id_reddition: string;

  @Column({ name: 'annee_validation', type: 'int' })
  annee_validation: number;

  @ManyToOne(() => GrandLivre)
  @JoinColumn({ name: 'id_grand_livre' })
  grandLivre: GrandLivre;

  // ✅ CHANGEMENT : Lien vers ResultatRecensement
  @ManyToOne(() => ResultatRecensement)
  @JoinColumn({ name: 'id_resultat_recensement' })
  resultatRecensement: ResultatRecensement;

  @Column({
    name: 'statut',
    type: 'enum',
    enum: StatutReddition,
    default: StatutReddition.EN_ATTENTE,
  })
  statut: StatutReddition;

  @CreateDateColumn({ name: 'date_creation' })
  date_creation: Date;

  @Column({ name: 'date_validation', type: 'timestamp', nullable: true })
  date_validation: Date;

  @Column({ name: 'motif_rejet', type: 'text', nullable: true })
  motif_rejet: string|null;
}
