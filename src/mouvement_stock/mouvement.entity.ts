import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Materiel } from '../materiel/materiel.entity';


export enum MouvementType {
  ENTREE = 'ENTREE',
  SORTIE = 'SORTIE',
  TRANSFERT = 'TRANSFERT',
  RESERVATION = 'RESERVATION',
  DERESERVATION = 'DERESERVATION',
  AUTRE = 'AUTRE'
}


@Entity('mouvement_stock')
export class MouvementStock {
  @PrimaryColumn({ name: 'id_mouvement', length: 10 })
  id: string;

  @ManyToOne(() => Materiel)
  @JoinColumn({ name: 'id_materiel' })
  materiel: Materiel;

  @Column({ 
    name: 'type_mouvement', 
    type: 'enum', 
    enum: MouvementType 
  })
  type_mouvement: MouvementType;
  

  @Column({ name: 'quantite_mouvement', type: 'int' })
  quantite_mouvement: number;

  @Column({ name: 'date_mouvement', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date_mouvement: Date;

  @Column({ name: 'id_reference', length: 20, nullable: true })
  id_reference: string;

  @Column({ name: 'type_reference', length: 30, nullable: true })
  type_reference: string; 
  // 'APPROVISIONNEMENT', 'ATTRIBUTION', 'DEPANNAGE', 'RESULTAT_RECENSEMENT', 'DEMANDE'

  @Column({ name: 'prix_unitaire', type: 'decimal', precision: 15, scale: 2, nullable: true })
  prix_unitaire: number;

  @Column({ name: 'valeur_totale', type: 'decimal', precision: 15, scale: 2, nullable: true })
  valeur_totale: number;

  @Column({ name: 'motif', type: 'text', nullable: true })
  motif: string;

  @Column({ name: 'utilisateur', length: 100, nullable: true })
  utilisateur: string;u

  // Stock avant et après le mouvement (pour traçabilité)
  @Column({ name: 'stock_avant', type: 'int', nullable: true })
  stock_avant: number;

  @Column({ name: 'stock_apres', type: 'int', nullable: true })
  stock_apres: number;
}
