import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Journal } from '../journal/journal.entity';
import { Materiel } from '../materiel/materiel.entity';

@Entity('grand_livre')
export class GrandLivre {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id_grand_livre: string;

  // ✅ NOUVEAU : Référence au matériel directement
  @Column({ type: 'varchar', length: 20 })
  id_materiel: string;


  @Column({ type: 'varchar', length: 20 })
  id_journal: string;


  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantite_entree: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantite_sortie: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  valeur_entree: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  valeur_sortie: number;

  
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantite_restante: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  valeur_restante: number;

  @Column({ type: 'text', nullable: true })
  observation: string;

  @CreateDateColumn()
  date_enregistrement: Date;

 
  @ManyToOne(() => Materiel)
  @JoinColumn({ name: 'id_materiel' })
  materiel: Materiel;

  @ManyToOne(() => Journal)
  @JoinColumn({ name: 'id_journal' })
  journal: Journal;

  // ✅ GETTER : CUMP actuel du matériel dans le Grand Livre
  get cump(): number {
    if (this.quantite_restante === 0) return 0;
    return this.valeur_restante / this.quantite_restante;
  }
}
