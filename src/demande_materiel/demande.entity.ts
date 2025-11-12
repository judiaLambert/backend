import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Demandeur } from '../demandeur/demandeur.entity';
import { DetailDemande } from '../detail_demande/detail.entity';

@Entity('demandemateriel')
export class DemandeMateriel {
  @PrimaryColumn({ name: 'id_demande' })
  id: string;

  @ManyToOne(() => Demandeur)
  @JoinColumn({ name: 'id_demandeur' })
  demandeur: Demandeur;

  @Column({ name: 'date_demande' })
  date_demande: Date;

  @Column({ name: 'raison_demande' })
  raison_demande: string;

  @Column({ 
    name: 'statut',
    default: 'en_attente'
  })
  statut: string; // 'en_attente', 'approuvee', 'refusee'

  @Column({ 
    name: 'motif_refus',
    nullable: true 
  })
  motif_refus: string;

 
  @Column({ 
    name: 'type_possession',
    default: 'temporaire'
  })
  type_possession: string; // 'temporaire' ou 'definitive'

  
  @Column({ 
    name: 'date_retour',
    nullable: true,
    type: 'date'
  })
  date_retour: Date;

  @OneToMany(() => DetailDemande, detailDemande => detailDemande.demandeMateriel)
  detailDemandes: DetailDemande[];
}