import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Materiel } from '../materiel/materiel.entity';

@Entity('inventaire')
export class Inventaire {
  @PrimaryColumn({ name: 'id_inventaire' })
  id: string;

  @ManyToOne(() => Materiel)
  @JoinColumn({ name: 'id_materiel' })
  materiel: Materiel;

  @Column({ type: 'int' })
  quantite_stock: number;

  @Column({ type: 'int', default: 0 })
  quantite_reservee: number;

  @Column({ type: 'int' })
  quantite_disponible: number;

  @Column({ type: 'int' })
  seuil_alerte: number;

  @Column({ type: 'date' })
  date_dernier_inventaire: Date;

  @Column({ type: 'varchar', length: 100 })
  emplacement: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date_mise_a_jour: Date;
}