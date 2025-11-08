import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MouvementStockService } from './mouvement.service';

@Controller('mouvement-stock')
export class MouvementStockController {
  constructor(private readonly mouvementStockService: MouvementStockService) {}

  @Get()
  async getAll() {
    return await this.mouvementStockService.findAll();
  }

  @Get('recent')
  async getRecent() {
    return await this.mouvementStockService.getMouvementsRecent();
  }

  @Get('materiel/:id_materiel')
  async getByMateriel(@Param('id_materiel') id_materiel: string) {
    return await this.mouvementStockService.findByMateriel(id_materiel);
  }

  @Get('reference/:type_reference/:id_reference')
  async getByReference(
    @Param('type_reference') type_reference: string,
    @Param('id_reference') id_reference: string,
  ) {
    return await this.mouvementStockService.findByReference(type_reference, id_reference);
  }

  @Post()
  async create(@Body() body: {
    id_materiel: string;
    type_mouvement: string;
    quantite: number;
    id_reference?: string;
    type_reference?: string;
    motif?: string;
    utilisateur?: string;
  }) {
    return await this.mouvementStockService.create(body);
  }

  @Get('stats/statistiques')
  async getStatistiques() {
    return await this.mouvementStockService.getStatistiquesMouvements();
  }
}