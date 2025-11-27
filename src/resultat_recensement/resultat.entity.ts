import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CommissionRecensement } from '../commission_recensement/commission.entity';
import { Inventaire } from '../inventaire/inventaire.entity';

@Entity('resultat_recensement')
export class ResultatRecensement {
  @PrimaryColumn({ name: 'id_resultat', length: 10 })
  id: string;

  @ManyToOne(() => CommissionRecensement)
  @JoinColumn({ name: 'id_commission' })
  commission: CommissionRecensement;

  @ManyToOne(() => Inventaire)
  @JoinColumn({ name: 'id_inventaire' })
  inventaire: Inventaire;

  @Column({ name: 'quantite_theorique', type: 'int' })
  quantite_theorique: number;

  @Column({ name: 'quantite_physique', type: 'int' })
  quantite_physique: number;

  @Column({ name: 'ecart_trouve', type: 'int' })
  ecart_trouve: number;

  // ✅ Prix unitaires
  @Column({ name: 'pu_systeme', type: 'decimal', precision: 10, scale: 2, nullable: true })
  pu_systeme: number;

  @Column({ name: 'pu_recensement', type: 'decimal', precision: 10, scale: 2, nullable: true })
  pu_recensement: number;

  // ✅ Valeurs calculées
  @Column({ name: 'valeur_systeme', type: 'decimal', precision: 10, scale: 2, nullable: true })
  valeur_systeme: number;

  @Column({ name: 'valeur_recensement', type: 'decimal', precision: 10, scale: 2, nullable: true })
  valeur_recensement: number;

  @Column({ name: 'description_ecart', type: 'text', nullable: true })
  description_ecart: string;

  @Column({ name: 'type_recensement', length: 20 })
  type_recensement: string;

  @Column({ name: 'date_recensement', type: 'date' })
  date_recensement: Date;

  @Column({ name: 'statut_correction', length: 20, default: 'en_attente' })
  statut_correction: string;

  @Column({ name: 'corrige_par', length: 100, nullable: true })
  corrige_par: string;

  @Column({ name: 'date_correction', type: 'timestamp', nullable: true })
  date_correction: Date;
}
