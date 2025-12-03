import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Materiel } from '../materiel/materiel.entity';

@Entity('inventaire')
export class Inventaire {
  @PrimaryColumn({ name: 'id_inventaire', length: 10 })
  id: string;

  @ManyToOne(() => Materiel)
  @JoinColumn({ name: 'id_materiel' })
  materiel: Materiel;

  @Column({ name: 'quantite_stock', type: 'int', default: 0 })
  quantite_stock: number;

  @Column({ name: 'quantite_disponible', type: 'int', default: 0 })
  quantite_disponible: number;

  @Column({ name: 'quantite_reservee', type: 'int', default: 0 })
  quantite_reservee: number;

  // ✅ NOUVEAU : Valeur totale du stock au CUMP
  @Column({ name: 'valeur_stock', type: 'decimal', precision: 15, scale: 2, default: 0 })
  valeur_stock: number;

  @Column({ name: 'seuil_alerte', type: 'int', nullable: true })
  seuil_alerte: number;

  @Column({ name: 'date_dernier_inventaire', type: 'date', nullable: true })
  date_dernier_inventaire: Date;

  @Column({ name: 'date_mise_a_jour', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date_mise_a_jour: Date;

  // ✅ Getter pour calculer le CUMP
  get cump(): number {
    return this.quantite_stock > 0 ? this.valeur_stock / this.quantite_stock : 0;
  }
}
