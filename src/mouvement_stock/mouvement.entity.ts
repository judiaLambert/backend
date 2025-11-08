import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Materiel } from '../materiel/materiel.entity';

@Entity('mouvement_stock')
export class MouvementStock {
  @PrimaryColumn({ name: 'id_mouvement' })
  id: string;

  @ManyToOne(() => Materiel)
  @JoinColumn({ name: 'id_materiel' })
  materiel: Materiel;

  @Column({ type: 'varchar', length: 20 })
  type_mouvement: string; // 'ENTREE', 'SORTIE', 'RESERVATION', 'DERESERVATION'

  @Column({ type: 'int' })
  quantite: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date_mouvement: Date;

  @Column({ type: 'varchar', length: 10, nullable: true })
  id_reference: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  type_reference: string; // 'ATTRIBUTION', 'DEPANNAGE', 'APPROVISIONNEMENT', 'DEMANDE'

  @Column({ type: 'text', nullable: true })
  motif: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  utilisateur: string;
}