import { Controller, Get, Param } from '@nestjs/common';
import { FicheDetenteurService } from './fiche.service';

@Controller('fiches-detenteurs')
export class FicheDetenteurController {
  constructor(private readonly ficheService: FicheDetenteurService) {}

  /**
   * GET /fiches-detenteurs
   * Obtenir tous les demandeurs avec leurs matériels
   */
  @Get()
  async getAllDemandeursAvecMateriels() {
    return await this.ficheService.getAllDemandeursAvecMaterielsV2(); // Utilisez V2 qui est plus efficace
  }

  /**
   * GET /fiches-detenteurs/:id_demandeur
   * Obtenir un demandeur avec ses matériels
   */
  @Get(':id_demandeur')
  async getDemandeurAvecMateriels(@Param('id_demandeur') id_demandeur: string) {
    return await this.ficheService.getDemandeurAvecMateriels(id_demandeur);
  }

  /**
   * GET /fiches-detenteurs/test
   * Route de test
   */
  @Get('test/connection')
  async testConnection() {
    return {
      message: 'API Fiche Detenteur fonctionnelle',
      timestamp: new Date(),
      status: 'OK'
    };
  }
}