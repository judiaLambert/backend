import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Materiel } from '../materiel/materiel.entity';
import { Approvisionnement } from '../approvisionnement/aprrovisionnement.entity';

@Entity('detail_approvisionnement')
export class DetailApprovisionnement {
  @PrimaryColumn({ name: 'id_detailappro' })
  id: string

  @ManyToOne(() => Materiel)
  @JoinColumn({ name: 'id_materiel' })
  materiel: Materiel;

  @ManyToOne(() => Approvisionnement)
  @JoinColumn({ name: 'id_approvisionnement' })
  approvisionnement: Approvisionnement;

  @Column({ name: 'quantite_recu' })
  quantiteRecu: number;

  @Column({ name: 'prix_unitaire', type: 'decimal', precision: 10, scale: 2 })
  prixUnitaire: number;

  @Column({ name: 'quantite_total' })
  quantiteTotal: number;
}