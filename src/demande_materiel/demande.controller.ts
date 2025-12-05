import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { DemandeMaterielService } from './demande.service';

@Controller('demandes')
export class DemandeMaterielController {
  constructor(private readonly demandeService: DemandeMaterielService) {}

  // ✅ Changer @Patch en @Put pour approuver
  @Put(':id/approuver')
  async approuver(@Param('id') id: string, @Body() body?: { motif?: string }) {
    return await this.demandeService.approuver(id, body?.motif);
  }

  // ✅ Changer @Patch en @Put pour refuser
  @Put(':id/refuser')
  async refuser(@Param('id') id: string, @Body() body: { motif_refus: string }) {
    if (!body.motif_refus) {
      throw new HttpException('Le motif de refus est obligatoire', HttpStatus.BAD_REQUEST);
    }
    return await this.demandeService.refuser(id, body.motif_refus);
  }

  // ✅ Route pour les statistiques
  @Get('statistiques')
  async getStatistiques() {
    return await this.demandeService.getStatistiques();
  }

  // ✅ Route pour les demandes d'un demandeur spécifique
  @Get('demandeur/:id_demandeur')
  async findByDemandeur(@Param('id_demandeur') id_demandeur: string) {
    return await this.demandeService.findByDemandeur(id_demandeur);
  }

  // ✅ Route pour une demande spécifique
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.demandeService.findOne(id);
  }

  // ✅ Route pour toutes les demandes
  @Get()
  async findAll() {
    return await this.demandeService.findAll();
  }

  // ✅ Changer @Patch en @Put pour le statut
  @Put(':id/statut')
  async updateStatut(
    @Param('id') id: string,
    @Body() body: { statut: 'Approuvée' | 'Refusée' | 'en_attente'; motif_refus?: string }
  ) {
    return await this.demandeService.updateStatut(id, body.statut, body.motif_refus);
  }

  // ✅ Créer une demande
  @Post()
  async create(@Body() body: {
    id_demandeur: string;
    raison_demande: string;
    details: Array<{ id_materiel: string; quantite_demander: number }>;
    type_possession?: string;
    date_retour?: Date;
  }) {
    return await this.demandeService.create(
      body.id_demandeur,
      body.raison_demande,
      body.details,
      body.type_possession || 'temporaire',
      body.date_retour
    );
  }

  // ✅ Mettre à jour une demande
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { raison_demande: string }) {
    return await this.demandeService.update(id, body.raison_demande);
  }

  // ✅ Supprimer une demande
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.demandeService.remove(id);
    return { message: 'Demande supprimée avec succès' };
  }

}
