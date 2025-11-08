import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Acquisition } from '../acquisition/acquisition.entity';

@Entity('approvisionnement')
export class Approvisionnement {
  @PrimaryColumn({ name: 'id_approvisionnement' })
  id: string;

  @Column({ name: 'date_approvisionnement', type: 'date' })
  dateApprovisionnement: Date;

  @Column({ name: 'recu', nullable: true })
  recu: string;

  @ManyToOne(() => Acquisition)
  @JoinColumn({ name: 'id_acquisition' })
  acquisition: Acquisition;

  @Column({ name: 'note_approvisionnement', type: 'text', nullable: true })
  noteApprovisionnement: string;
}