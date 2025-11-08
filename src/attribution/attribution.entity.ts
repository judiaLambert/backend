import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Materiel } from '../materiel/materiel.entity';
import { Demandeur } from '../demandeur/demandeur.entity';

@Entity('attribution')
export class Attribution {
  @PrimaryColumn({name: 'id_attribution'})
  id: string;

  @ManyToOne(() => Materiel)
  @JoinColumn({ name: 'id_materiel' })
  materiel: Materiel;

  @ManyToOne(() => Demandeur)
  @JoinColumn({ name: 'id_demandeur' })
  demandeur: Demandeur;

  @Column({ name: 'date_attribution' })
  date_attribution: Date;

  @Column({ name: 'quantite_attribuee' })
  quantite_attribuee: number;

  @Column({ name: 'statut_attribution' })
  statut_attribution: string;

  @Column({ name: 'date_retour_prevue', nullable: true })
  date_retour_prevue: Date;

  @Column({ name: 'motif_attribution', nullable: true })
  motif_attribution: string;
}