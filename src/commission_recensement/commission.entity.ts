import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('commission_recensement')
export class CommissionRecensement {
  @PrimaryColumn({ name: 'id_commission', length: 10 })
  id: string;

  @Column({ name: 'date_commission', type: 'date' })
  date_commission: Date;

  @Column({ name: 'membre_commission', type: 'text' })
  membre_commission: string;

  @Column({ name: 'president', length: 100 })
  president: string;

  @Column({ name: 'lieu_commission', length: 255 })
  lieu_commission: string;
}
