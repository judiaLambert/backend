import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Journal } from '../journal/journal.entity';
import { TypeMateriel } from '../typemateriel/typemateriel.entity'; 

@Entity('grand_livre')
export class GrandLivre {
  @PrimaryColumn({ name: 'id_grand_livre', length: 10 })
  id_grand_livre: string;

  @CreateDateColumn({ name: 'date_enregistrement' })
  date_enregistrement: Date;

  @Column({ name: 'quantite_entree', type: 'int', default: 0 })
  quantite_entree: number;

  @Column({ name: 'quantite_sortie', type: 'int', default: 0 })
  quantite_sortie: number;

  @Column({ name: 'valeur_entree', type: 'decimal', precision: 15, scale: 2, default: 0 })
  valeur_entree: number;

  @Column({ name: 'valeur_sortie', type: 'decimal', precision: 15, scale: 2, default: 0 })
  valeur_sortie: number;

  @Column({ name: 'quantite_restante', type: 'int', default: 0 })
  quantite_restante: number;

  @Column({ name: 'valeur_restante', type: 'decimal', precision: 15, scale: 2, default: 0 })
  valeur_restante: number;

  @Column({ name: 'observation', type: 'text', nullable: true })
  observation: string;

  // Relation avec journal
  @ManyToOne(() => Journal, { nullable: false })
  @JoinColumn({ name: 'id_journal' })
  journal: Journal;

  @Column({ name: 'id_journal' })
  id_journal: string;

  // ✅ Relation avec TYPE_MATERIEL (et non matériel)
  @ManyToOne(() => TypeMateriel, { nullable: false })
  @JoinColumn({ name: 'id_typemateriel' })
  typeMateriel: TypeMateriel;

  @Column({ name: 'id_typemateriel' })
  id_type_materiel: string;
}
