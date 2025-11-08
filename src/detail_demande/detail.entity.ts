import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Materiel } from '../materiel/materiel.entity';
import { DemandeMateriel } from '../demande_materiel/demande.entity';

@Entity('detaildemande')
export class DetailDemande {
  @PrimaryColumn({name: 'id_detail'})
  id: string;

  @ManyToOne(() => Materiel)
  @JoinColumn({ name: 'id_materiel' })
  materiel: Materiel;

  @ManyToOne(() => DemandeMateriel)
  @JoinColumn({ name: 'id_demande' })
  demandeMateriel: DemandeMateriel;

  @Column()
  quantite_demander: number;
}